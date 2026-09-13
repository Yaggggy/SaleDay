from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import current_user_optional
from app.api.dependencies.tenancy import get_org_context, require_org_role
from app.core.config import settings
from app.core.db import get_db
from app.core.security import hash_password, new_opaque_token
from app.models.base import InvitationStatus, MemberStatus, OrgRole
from app.models.activity import Invitation
from app.models.organization import Organization, OrganizationMember
from app.models.user import User
from app.schemas.organization import (
    AcceptInvitationRequest,
    InvitationOut,
    InviteMemberRequest,
    TeamMemberOut,
    UpdateMemberRoleRequest,
)
from app.services.activity_service import log_activity
from app.services.email_service import send_invitation_email

router = APIRouter(tags=["team"])

INVITATION_EXPIRY_DAYS = 7


@router.get("/organizations/{org_id}/members", response_model=list[TeamMemberOut])
def list_members(org_id: str, db: Session = Depends(get_db), ctx=Depends(get_org_context)):
    rows = db.execute(
        select(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .where(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.joined_at.asc())
    ).all()
    return [
        TeamMemberOut(
            id=m.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=m.role,
            status=m.status,
            joined_at=m.joined_at,
            last_active_at=m.last_active_at,
        )
        for m, u in rows
    ]


@router.patch("/organizations/{org_id}/members/{member_id}", response_model=TeamMemberOut)
def update_member_role(
    org_id: str, member_id: str, payload: UpdateMemberRoleRequest, db: Session = Depends(get_db), ctx=Depends(require_org_role(OrgRole.OWNER))
):
    member = db.get(OrganizationMember, member_id)
    if not member or member.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    if member.user_id == ctx.user.id and payload.role != OrgRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't change your own role. Ask another owner to do it.",
        )

    if member.role == OrgRole.OWNER and payload.role != OrgRole.OWNER:
        remaining_owners = db.execute(
            select(func.count()).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.role == OrgRole.OWNER,
                OrganizationMember.status == MemberStatus.ACTIVE,
                OrganizationMember.id != member.id,
            )
        ).scalar_one()
        if remaining_owners == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An organization must have at least one owner.",
            )

    previous_role = member.role.value
    member.role = payload.role
    user = db.get(User, member.user_id)

    log_activity(
        db,
        organization_id=org_id,
        sale_id=None,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="member",
        entity_id=member.id,
        action="member.role_changed",
        previous_value={"role": previous_role},
        new_value={"role": payload.role.value},
        metadata={"member_name": user.full_name if user else None},
    )
    db.commit()
    db.refresh(member)
    return TeamMemberOut(
        id=member.id, user_id=member.user_id, full_name=user.full_name, email=user.email,
        role=member.role, status=member.status, joined_at=member.joined_at, last_active_at=member.last_active_at,
    )


@router.delete("/organizations/{org_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(org_id: str, member_id: str, db: Session = Depends(get_db), ctx=Depends(require_org_role(OrgRole.OWNER))):
    member = db.get(OrganizationMember, member_id)
    if not member or member.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")
    if member.user_id == ctx.user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't remove yourself from the organization.")

    member.status = MemberStatus.REMOVED
    log_activity(
        db,
        organization_id=org_id,
        sale_id=None,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="member",
        entity_id=member.id,
        action="member.removed",
    )
    db.commit()
    return None


@router.post("/organizations/{org_id}/invitations", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
def invite_member(
    org_id: str,
    payload: InviteMemberRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ctx=Depends(require_org_role(OrgRole.ADMIN)),
):
    if payload.role == OrgRole.OWNER and ctx.membership.role != OrgRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner can invite another owner.")

    email = payload.email.lower()

    # Re-inviting an email that already has a pending invitation refreshes that
    # invitation instead of creating a duplicate row with a second live token.
    existing = db.execute(
        select(Invitation).where(
            Invitation.organization_id == org_id,
            Invitation.email == email,
            Invitation.status == InvitationStatus.PENDING,
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if existing:
        existing.role = payload.role
        existing.token = new_opaque_token()
        existing.expires_at = now + timedelta(days=INVITATION_EXPIRY_DAYS)
        invitation = existing
        action = "invitation.resent"
    else:
        invitation = Invitation(
            organization_id=org_id,
            email=email,
            role=payload.role,
            token=new_opaque_token(),
            invited_by=ctx.user.id,
            status=InvitationStatus.PENDING,
            expires_at=now + timedelta(days=INVITATION_EXPIRY_DAYS),
            created_at=now,
        )
        db.add(invitation)
        action = "invitation.sent"

    log_activity(
        db,
        organization_id=org_id,
        sale_id=None,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="invitation",
        entity_id=invitation.id,
        action=action,
        new_value={"email": invitation.email, "role": payload.role.value},
    )
    db.commit()
    db.refresh(invitation)

    org = db.get(Organization, org_id)
    background_tasks.add_task(
        send_invitation_email,
        to_email=invitation.email,
        org_name=org.name if org else "SaleDay",
        inviter_name=ctx.user.full_name,
        role=invitation.role.value,
        token=invitation.token,
    )
    # The raw token is only ever transmitted via the emailed accept link above —
    # InvitationOut deliberately excludes it, so it never reaches the inviter's UI.
    return invitation


@router.post("/organizations/{org_id}/invitations/{invitation_id}/resend", response_model=InvitationOut)
def resend_invitation(
    org_id: str,
    invitation_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ctx=Depends(require_org_role(OrgRole.ADMIN)),
):
    invitation = db.get(Invitation, invitation_id)
    if not invitation or invitation.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    if invitation.status not in (InvitationStatus.PENDING, InvitationStatus.EXPIRED):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation can no longer be resent.")

    invitation.status = InvitationStatus.PENDING
    invitation.token = new_opaque_token()
    invitation.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=INVITATION_EXPIRY_DAYS)

    log_activity(
        db,
        organization_id=org_id,
        sale_id=None,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="invitation",
        entity_id=invitation.id,
        action="invitation.resent",
        new_value={"email": invitation.email},
    )
    db.commit()
    db.refresh(invitation)

    org = db.get(Organization, org_id)
    background_tasks.add_task(
        send_invitation_email,
        to_email=invitation.email,
        org_name=org.name if org else "SaleDay",
        inviter_name=ctx.user.full_name,
        role=invitation.role.value,
        token=invitation.token,
    )
    return invitation


@router.get("/organizations/{org_id}/invitations", response_model=list[InvitationOut])
def list_invitations(org_id: str, db: Session = Depends(get_db), ctx=Depends(require_org_role(OrgRole.ADMIN))):
    rows = db.execute(
        select(Invitation).where(Invitation.organization_id == org_id).order_by(Invitation.created_at.desc())
    ).scalars().all()
    return rows


@router.delete("/organizations/{org_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(org_id: str, invitation_id: str, db: Session = Depends(get_db), ctx=Depends(require_org_role(OrgRole.ADMIN))):
    invitation = db.get(Invitation, invitation_id)
    if not invitation or invitation.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    invitation.status = InvitationStatus.REVOKED
    db.commit()
    return None


@router.post("/invitations/accept", response_model=TeamMemberOut)
def accept_invitation(payload: AcceptInvitationRequest, db: Session = Depends(get_db), current: User | None = Depends(current_user_optional)):
    invitation = db.execute(select(Invitation).where(Invitation.token == payload.token)).scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This invitation link is invalid.")
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation has already been used or revoked.")
    if invitation.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        invitation.status = InvitationStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation has expired.")

    user = current
    if not user:
        user = db.execute(select(User).where(User.email == invitation.email)).scalar_one_or_none()
        if not user:
            if not payload.full_name or not payload.password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A name and password are required to create your account.",
                )
            user = User(
                email=invitation.email,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name.strip(),
                email_verified=True,
            )
            db.add(user)
            db.flush()
    elif current.email != invitation.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This invitation was sent to a different email address.")

    existing = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == invitation.organization_id, OrganizationMember.user_id == user.id
        )
    ).scalar_one_or_none()

    if existing:
        existing.status = MemberStatus.ACTIVE
        existing.role = invitation.role
        member = existing
    else:
        member = OrganizationMember(
            organization_id=invitation.organization_id,
            user_id=user.id,
            role=invitation.role,
            status=MemberStatus.ACTIVE,
            joined_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(member)

    invitation.status = InvitationStatus.ACCEPTED

    log_activity(
        db,
        organization_id=invitation.organization_id,
        sale_id=None,
        actor_id=user.id,
        actor_name=user.full_name,
        entity_type="member",
        entity_id=member.id if hasattr(member, "id") else None,
        action="invitation.accepted",
        new_value={"role": invitation.role.value},
    )
    db.commit()
    db.refresh(member)
    return TeamMemberOut(
        id=member.id, user_id=user.id, full_name=user.full_name, email=user.email,
        role=member.role, status=member.status, joined_at=member.joined_at, last_active_at=member.last_active_at,
    )

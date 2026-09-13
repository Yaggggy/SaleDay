from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import current_user_required
from app.core.config import settings
from app.core.db import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.base import MemberStatus, OrgRole
from app.models.organization import Organization, OrganizationMember
from app.models.user import RefreshToken, User
from app.schemas.organization import OrganizationMembershipOut
from app.schemas.user import AuthMeOut, LoginRequest, RegisterRequest, UserOut
from app.services.activity_service import log_activity

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    common = dict(
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        settings.ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        **common,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.ACCESS_COOKIE_NAME, path="/", domain=settings.COOKIE_DOMAIN)
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/", domain=settings.COOKIE_DOMAIN)


def _issue_session(db: Session, response: Response, user: User, request: Request) -> None:
    access_token, _, _ = create_access_token(user.id)
    refresh_token, jti, expires_at = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=expires_at.replace(tzinfo=None),
            user_agent=request.headers.get("user-agent", "")[:255],
            ip_address=request.client.host if request.client else None,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    _set_auth_cookies(response, access_token, refresh_token)


@router.post("/register", response_model=AuthMeOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        email_verified=False,
    )
    db.add(user)
    db.flush()

    org = Organization(name=payload.organization_name.strip())
    db.add(org)
    db.flush()

    membership = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role=OrgRole.OWNER,
        status=MemberStatus.ACTIVE,
        joined_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(membership)

    log_activity(
        db,
        organization_id=org.id,
        sale_id=None,
        actor_id=user.id,
        actor_name=user.full_name,
        entity_type="organization",
        entity_id=org.id,
        action="organization.created",
    )

    _issue_session(db, response, user, request)
    db.commit()
    db.refresh(user)

    return AuthMeOut(
        user=UserOut.model_validate(user),
        organizations=[
            OrganizationMembershipOut(
                organization_id=org.id, organization_name=org.name, role=OrgRole.OWNER, status=MemberStatus.ACTIVE
            )
        ],
    )


@router.post("/login", response_model=AuthMeOut)
def login(payload: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")

    _issue_session(db, response, user, request)
    db.commit()

    memberships = db.execute(
        select(OrganizationMember, Organization)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == user.id, OrganizationMember.status == MemberStatus.ACTIVE)
    ).all()

    return AuthMeOut(
        user=UserOut.model_validate(user),
        organizations=[
            OrganizationMembershipOut(
                organization_id=org.id, organization_name=org.name, role=m.role, status=m.status
            )
            for m, org in memberships
        ],
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, db: Session = Depends(get_db), refresh_token: str | None = None):
    _clear_auth_cookies(response)
    return None


@router.post("/refresh", response_model=UserOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")

    jti = payload.get("jti")
    stored = db.execute(select(RefreshToken).where(RefreshToken.jti == jti)).scalar_one_or_none()
    if not stored or stored.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")

    user = db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")

    # Rotate: revoke old refresh token, issue a new pair.
    stored.revoked = True
    access_token, _, _ = create_access_token(user.id)
    new_refresh, new_jti, expires_at = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=new_jti,
            expires_at=expires_at.replace(tzinfo=None),
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    _set_auth_cookies(response, access_token, new_refresh)
    db.commit()
    return UserOut.model_validate(user)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(response: Response, db: Session = Depends(get_db), user: User = Depends(current_user_required)):
    db.execute(
        RefreshToken.__table__.update()
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )
    db.commit()
    _clear_auth_cookies(response)
    return None


@router.get("/me", response_model=AuthMeOut)
def me(db: Session = Depends(get_db), user: User = Depends(current_user_required)):
    memberships = db.execute(
        select(OrganizationMember, Organization)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == user.id, OrganizationMember.status == MemberStatus.ACTIVE)
    ).all()
    return AuthMeOut(
        user=UserOut.model_validate(user),
        organizations=[
            OrganizationMembershipOut(
                organization_id=org.id, organization_name=org.name, role=m.role, status=m.status
            )
            for m, org in memberships
        ],
    )

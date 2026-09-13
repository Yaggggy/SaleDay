from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import current_user_required
from app.core.db import get_db
from app.models.base import MemberStatus, OrgRole
from app.models.item import Item
from app.models.organization import OrganizationMember
from app.models.sale import Sale
from app.models.user import User

ROLE_LEVEL = {
    OrgRole.VIEWER: 0,
    OrgRole.SELLER: 1,
    OrgRole.ADMIN: 2,
    OrgRole.OWNER: 3,
}


@dataclass
class OrgContext:
    user: User
    organization_id: str
    membership: OrganizationMember


@dataclass
class SaleContext:
    user: User
    organization_id: str
    membership: OrganizationMember
    sale: Sale


@dataclass
class ItemContext:
    user: User
    organization_id: str
    membership: OrganizationMember
    sale: Sale
    item: Item


def _get_active_membership(db: Session, org_id: str, user_id: str) -> OrganizationMember | None:
    stmt = select(OrganizationMember).where(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id,
        OrganizationMember.status == MemberStatus.ACTIVE,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_org_context(
    org_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user_required),
) -> OrgContext:
    membership = _get_active_membership(db, org_id, user.id)
    if not membership:
        # Do not reveal whether the organization exists.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return OrgContext(user=user, organization_id=org_id, membership=membership)


def get_sale_context(
    sale_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user_required),
) -> SaleContext:
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found.")
    membership = _get_active_membership(db, sale.organization_id, user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found.")
    return SaleContext(user=user, organization_id=sale.organization_id, membership=membership, sale=sale)


def get_item_context(
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(current_user_required),
) -> ItemContext:
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    sale = db.get(Sale, item.sale_id)
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    membership = _get_active_membership(db, sale.organization_id, user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    return ItemContext(user=user, organization_id=sale.organization_id, membership=membership, sale=sale, item=item)


def require_role(min_role: OrgRole):
    """Factory: returns a dependency enforcing the caller's role >= min_role for the resolved context.
    Works with any dependency result that exposes `.membership` (OrgContext, SaleContext, ItemContext)."""

    def _check(ctx=Depends(get_sale_context)):
        if ROLE_LEVEL[ctx.membership.role] < ROLE_LEVEL[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action.",
            )
        return ctx

    return _check


def require_item_role(min_role: OrgRole):
    def _check(ctx=Depends(get_item_context)):
        if ROLE_LEVEL[ctx.membership.role] < ROLE_LEVEL[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action.",
            )
        return ctx

    return _check


def require_org_role(min_role: OrgRole):
    def _check(ctx=Depends(get_org_context)):
        if ROLE_LEVEL[ctx.membership.role] < ROLE_LEVEL[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action.",
            )
        return ctx

    return _check

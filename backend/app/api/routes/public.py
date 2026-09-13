from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import current_user_optional
from app.core.db import get_db
from app.models.base import ItemStatus, MemberStatus, SaleStatus
from app.models.item import Item
from app.models.organization import OrganizationMember
from app.models.sale import Sale
from app.models.user import User
from app.schemas.item import ItemImageOut, PublicItemOut
from app.utils.storage import image_url

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/items/{qr_token}", response_model=PublicItemOut)
def get_public_item(qr_token: str, db: Session = Depends(get_db), user: User | None = Depends(current_user_optional)):
    item = db.execute(select(Item).where(Item.qr_token == qr_token)).scalar_one_or_none()
    if not item or item.status == ItemStatus.REMOVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This item could not be found.")

    sale = db.get(Sale, item.sale_id)
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This item could not be found.")

    is_staff = False
    if user:
        membership = db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == sale.organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == MemberStatus.ACTIVE,
            )
        ).scalar_one_or_none()
        is_staff = membership is not None

    return PublicItemOut(
        name=item.name,
        description=item.description,
        price=float(item.current_price),
        category=item.category,
        condition=item.condition,
        status=item.status,
        images=[
            ItemImageOut(id=img.id, url=image_url(img.storage_key), is_primary=img.is_primary, sort_order=img.sort_order)
            for img in item.images
        ],
        sale_name=sale.name,
        sale_status=sale.status.value,
        is_staff=is_staff,
        item_id=item.id if is_staff else None,
        sale_id=sale.id if is_staff else None,
    )


@router.get("/sales/{sale_id}")
def get_public_sale(sale_id: str, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if not sale or not sale.is_public or sale.status == SaleStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This sale could not be found.")

    rows = db.execute(
        select(Item.category, func.count())
        .where(Item.sale_id == sale_id, Item.status.in_([ItemStatus.AVAILABLE, ItemStatus.RESERVED]))
        .group_by(Item.category)
    ).all()

    return {
        "name": sale.name,
        "description": sale.description,
        "address": sale.address,
        "sale_date": sale.sale_date,
        "start_time": sale.start_time,
        "end_time": sale.end_time,
        "status": sale.status.value,
        "categories": [{"category": c or "Other", "count": n} for c, n in rows],
    }

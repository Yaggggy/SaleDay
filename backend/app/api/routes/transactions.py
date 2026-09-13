from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.tenancy import get_sale_context, require_item_role, require_role
from app.core.db import get_db
from app.models.base import OrgRole, TransactionStatus
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.item import StaffItemOut
from app.schemas.transaction import MarkSoldRequest, TransactionOut
from app.services.transaction_service import mark_item_sold, undo_sale

router = APIRouter(tags=["transactions"])


@router.post("/items/{item_id}/mark-sold", response_model=StaffItemOut)
def mark_sold(payload: MarkSoldRequest, db: Session = Depends(get_db), ctx=Depends(require_item_role(OrgRole.SELLER))):
    from app.api.routes.items import _to_staff_out  # local import avoids circularity at module load

    mark_item_sold(
        db,
        item_id=ctx.item.id,
        sale=ctx.sale,
        user=ctx.user,
        sold_price=payload.sold_price,
        payment_method=payload.payment_method,
    )
    db.commit()
    db.refresh(ctx.item)
    return _to_staff_out(ctx.item)


@router.post("/items/{item_id}/undo-sale", response_model=StaffItemOut)
def undo_item_sale(db: Session = Depends(get_db), ctx=Depends(require_item_role(OrgRole.ADMIN))):
    from app.api.routes.items import _to_staff_out

    undo_sale(db, item_id=ctx.item.id, sale=ctx.sale, user=ctx.user)
    db.commit()
    db.refresh(ctx.item)
    return _to_staff_out(ctx.item)


@router.get("/sales/{sale_id}/transactions", response_model=list[TransactionOut])
def list_transactions(db: Session = Depends(get_db), ctx=Depends(get_sale_context)):
    rows = db.execute(
        select(Transaction, Item, User)
        .join(Item, Item.id == Transaction.item_id)
        .join(User, User.id == Transaction.sold_by_id)
        .where(Transaction.sale_id == ctx.sale.id)
        .order_by(Transaction.created_at.desc())
    ).all()

    return [
        TransactionOut(
            id=t.id,
            sale_id=t.sale_id,
            item_id=t.item_id,
            item_name=item.name,
            sold_price=float(t.sold_price),
            payment_method=t.payment_method,
            sold_by_id=t.sold_by_id,
            sold_by_name=user.full_name,
            status=t.status,
            created_at=t.created_at,
        )
        for t, item, user in rows
    ]

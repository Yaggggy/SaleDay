from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.base import ItemStatus, PaymentMethod, TransactionStatus
from app.models.item import Item
from app.models.sale import Sale
from app.models.transaction import Transaction
from app.models.user import User
from app.services.activity_service import log_activity


def mark_item_sold(
    db: Session,
    *,
    item_id: str,
    sale: Sale,
    user: User,
    sold_price: float,
    payment_method: PaymentMethod,
) -> Transaction:
    """Locks the item row for the duration of the transaction so two sellers
    racing to sell the same item cannot both succeed. Must be called inside a
    request that commits/rollbacks the session as a single unit of work."""

    item = db.execute(
        select(Item).where(Item.id == item_id).with_for_update()
    ).scalar_one_or_none()

    if not item or item.sale_id != sale.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")

    if item.status not in (ItemStatus.AVAILABLE, ItemStatus.RESERVED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This item has already been sold by another seller."
            if item.status == ItemStatus.SOLD
            else "This item is not currently available for sale.",
        )

    now = datetime.now(timezone.utc)
    previous_status = item.status.value

    txn = Transaction(
        sale_id=sale.id,
        item_id=item.id,
        sold_price=sold_price,
        payment_method=payment_method,
        sold_by_id=user.id,
        status=TransactionStatus.COMPLETED,
        created_at=now,
    )
    db.add(txn)

    item.status = ItemStatus.SOLD
    item.final_sold_price = sold_price
    item.sold_by_id = user.id
    item.sold_at = now

    log_activity(
        db,
        organization_id=sale.organization_id,
        sale_id=sale.id,
        actor_id=user.id,
        actor_name=user.full_name,
        entity_type="item",
        entity_id=item.id,
        action="item.sold",
        previous_value={"status": previous_status},
        new_value={"status": ItemStatus.SOLD.value, "sold_price": float(sold_price)},
    )

    db.flush()
    return txn


def undo_sale(
    db: Session,
    *,
    item_id: str,
    sale: Sale,
    user: User,
) -> Item:
    item = db.execute(
        select(Item).where(Item.id == item_id).with_for_update()
    ).scalar_one_or_none()

    if not item or item.sale_id != sale.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")

    if item.status != ItemStatus.SOLD:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This item is not currently marked sold.")

    txn = db.execute(
        select(Transaction)
        .where(Transaction.item_id == item.id, Transaction.status == TransactionStatus.COMPLETED)
        .order_by(Transaction.created_at.desc())
        .with_for_update()
    ).scalars().first()

    now = datetime.now(timezone.utc)
    if txn:
        txn.status = TransactionStatus.REVERSED
        txn.reversed_at = now
        txn.reversed_by = user.id

    item.status = ItemStatus.AVAILABLE
    item.final_sold_price = None
    item.sold_by_id = None
    item.sold_at = None

    log_activity(
        db,
        organization_id=sale.organization_id,
        sale_id=sale.id,
        actor_id=user.id,
        actor_name=user.full_name,
        entity_type="item",
        entity_id=item.id,
        action="item.sale_undone",
        previous_value={"status": ItemStatus.SOLD.value},
        new_value={"status": ItemStatus.AVAILABLE.value},
    )

    db.flush()
    return item

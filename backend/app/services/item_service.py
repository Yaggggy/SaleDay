from datetime import datetime, timezone

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.base import ITEM_STATUS_TRANSITIONS, ItemStatus
from app.models.item import Item, PriceHistory
from app.models.sale import Sale
from app.models.user import User
from app.schemas.item import BulkImportRowError, ItemCreate
from app.services.activity_service import log_activity


def next_item_reference(db: Session, sale_id: str) -> str:
    count = db.execute(
        select(func.count()).select_from(Item).where(Item.sale_id == sale_id)
    ).scalar_one()
    return f"A{1000 + count + 1}"


def bulk_create_items(
    db: Session,
    *,
    sale: Sale,
    user: User,
    rows: list[ItemCreate],
) -> tuple[list[Item], list[BulkImportRowError]]:
    """Validates and inserts many items in one pass. Rows are independent: a bad
    row is skipped and reported, it never aborts the rows around it. Item
    reference numbers are reserved up front with a single count query (rather
    than one query per row) to keep large imports fast."""
    base_count = db.execute(
        select(func.count()).select_from(Item).where(Item.sale_id == sale.id)
    ).scalar_one()

    created: list[Item] = []
    errors: list[BulkImportRowError] = []

    for offset, row in enumerate(rows):
        row_number = offset + 1
        try:
            # Rows sourced from CSV arrive as plain dicts and need validation here;
            # rows sourced from the JSON API are already validated ItemCreate instances,
            # so re-validating is a cheap no-op for them.
            data = row if isinstance(row, ItemCreate) else ItemCreate.model_validate(row)
        except ValidationError as exc:
            errors.append(BulkImportRowError(row=row_number, message=_first_error_message(exc)))
            continue

        if not data.name.strip():
            errors.append(BulkImportRowError(row=row_number, message="Item name is required."))
            continue

        item = Item(
            sale_id=sale.id,
            name=data.name.strip(),
            description=data.description,
            category=data.category,
            condition=data.condition,
            location=data.location,
            tags=",".join(data.tags) if data.tags else None,
            item_reference=f"A{1000 + base_count + len(created) + 1}",
            status=ItemStatus.AVAILABLE,
            original_listed_price=data.price,
            current_price=data.price,
            minimum_price=data.minimum_price,
            internal_note=data.internal_note,
            created_by=user.id,
        )
        db.add(item)
        created.append(item)

    if created:
        db.flush()
        log_activity(
            db,
            organization_id=sale.organization_id,
            sale_id=sale.id,
            actor_id=user.id,
            actor_name=user.full_name,
            entity_type="item",
            entity_id=None,
            action="item.bulk_created",
            new_value={"count": len(created)},
        )

    return created, errors


def _first_error_message(exc: ValidationError) -> str:
    first = exc.errors()[0]
    field = ".".join(str(p) for p in first.get("loc", ())) or "value"
    return f"{field}: {first.get('msg', 'invalid value')}"


def change_status(
    db: Session,
    *,
    item: Item,
    sale: Sale,
    user: User,
    new_status: ItemStatus,
) -> Item:
    allowed = ITEM_STATUS_TRANSITIONS.get(item.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot move item from {item.status.value} to {new_status.value}.",
        )
    previous = item.status.value
    item.status = new_status

    log_activity(
        db,
        organization_id=sale.organization_id,
        sale_id=sale.id,
        actor_id=user.id,
        actor_name=user.full_name,
        entity_type="item",
        entity_id=item.id,
        action="item.status_changed",
        previous_value={"status": previous},
        new_value={"status": new_status.value},
    )
    db.flush()
    return item


def change_price(
    db: Session,
    *,
    item: Item,
    sale: Sale,
    user: User,
    new_price: float,
) -> Item:
    if item.status in (ItemStatus.SOLD, ItemStatus.REMOVED):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot change price of a sold or removed item.")

    old_price = float(item.current_price)
    if old_price == float(new_price):
        return item

    history = PriceHistory(
        item_id=item.id,
        old_price=old_price,
        new_price=new_price,
        changed_by=user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(history)
    item.current_price = new_price

    log_activity(
        db,
        organization_id=sale.organization_id,
        sale_id=sale.id,
        actor_id=user.id,
        actor_name=user.full_name,
        entity_type="item",
        entity_id=item.id,
        action="item.price_changed",
        previous_value={"price": old_price},
        new_value={"price": float(new_price)},
    )
    db.flush()
    return item

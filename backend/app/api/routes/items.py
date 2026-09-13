import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.tenancy import get_item_context, get_sale_context, require_item_role, require_role
from app.core.config import settings
from app.core.db import get_db
from app.models.base import ItemStatus, OrgRole
from app.models.item import Item, ItemImage
from app.models.user import User
from app.schemas.item import (
    BulkImportResult,
    BulkImportRowError,
    BulkItemCreateRequest,
    ItemCreate,
    ItemHistoryOut,
    ItemImageOut,
    ItemPriceUpdate,
    ItemStatusUpdate,
    ItemUpdate,
    PriceHistoryEntryOut,
    StaffItemOut,
)
from app.schemas.transaction import InventorySummaryOut
from app.services.activity_service import log_activity
from app.services.item_service import bulk_create_items, change_price, change_status, next_item_reference
from app.utils.qr import generate_qr_png_bytes, item_public_url
from app.utils.storage import image_url, save_item_image

router = APIRouter(tags=["items"])

# Columns accepted in a bulk-import CSV. "price" is the only required column;
# unrecognized columns are ignored so users can export/re-import loosely.
CSV_COLUMNS = ["name", "price", "description", "category", "condition", "location", "tags", "minimum_price", "internal_note"]


def _to_staff_out(item: Item) -> StaffItemOut:
    # StaffItemOut.tags has a validator that splits the ORM's comma-separated
    # string (or None) into a list, so this now validates cleanly in one step.
    data = StaffItemOut.model_validate(item, from_attributes=True)
    data.images = [
        ItemImageOut(id=img.id, url=image_url(img.storage_key), is_primary=img.is_primary, sort_order=img.sort_order)
        for img in item.images
    ]
    return data


@router.post("/sales/{sale_id}/items", response_model=StaffItemOut, status_code=status.HTTP_201_CREATED)
def create_item(sale_id: str, payload: ItemCreate, db: Session = Depends(get_db), ctx=Depends(require_role(OrgRole.SELLER))):
    item = Item(
        sale_id=sale_id,
        name=payload.name.strip(),
        description=payload.description,
        category=payload.category,
        condition=payload.condition,
        location=payload.location,
        tags=",".join(payload.tags) if payload.tags else None,
        item_reference=next_item_reference(db, sale_id),
        status=ItemStatus.AVAILABLE,
        original_listed_price=payload.price,
        current_price=payload.price,
        minimum_price=payload.minimum_price,
        internal_note=payload.internal_note,
        created_by=ctx.user.id,
    )
    db.add(item)
    db.flush()

    log_activity(
        db,
        organization_id=ctx.organization_id,
        sale_id=sale_id,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="item",
        entity_id=item.id,
        action="item.created",
        new_value={"name": item.name, "price": float(item.current_price)},
    )
    db.commit()
    db.refresh(item)
    return _to_staff_out(item)


@router.get("/sales/{sale_id}/items", response_model=list[StaffItemOut])
def list_items(
    sale_id: str,
    db: Session = Depends(get_db),
    ctx=Depends(get_sale_context),
    q: str | None = Query(default=None, description="Search by name, description, category, location, or reference"),
    item_status: ItemStatus | None = Query(default=None, alias="status"),
    category: str | None = None,
    location: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
):
    stmt = select(Item).where(Item.sale_id == sale_id)
    if item_status:
        stmt = stmt.where(Item.status == item_status)
    if category:
        stmt = stmt.where(Item.category == category)
    if location:
        stmt = stmt.where(Item.location == location)
    if min_price is not None:
        stmt = stmt.where(Item.current_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Item.current_price <= max_price)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Item.name.ilike(like))
            | (Item.description.ilike(like))
            | (Item.category.ilike(like))
            | (Item.location.ilike(like))
            | (Item.item_reference.ilike(like))
        )
    stmt = stmt.order_by(Item.created_at.desc())
    items = db.execute(stmt).scalars().all()
    return [_to_staff_out(i) for i in items]


@router.get("/sales/{sale_id}/inventory/summary", response_model=InventorySummaryOut)
def inventory_summary(sale_id: str, db: Session = Depends(get_db), ctx=Depends(get_sale_context)):
    rows = db.execute(
        select(Item.status, func.count()).where(Item.sale_id == sale_id).group_by(Item.status)
    ).all()
    counts = {s.value: 0 for s in ItemStatus}
    total = 0
    for s, c in rows:
        counts[s.value] = c
        total += c
    return InventorySummaryOut(
        total=total,
        available=counts[ItemStatus.AVAILABLE.value],
        sold=counts[ItemStatus.SOLD.value],
        reserved=counts[ItemStatus.RESERVED.value],
        removed=counts[ItemStatus.REMOVED.value],
        unsold=counts[ItemStatus.UNSOLD.value],
    )


@router.get("/sales/{sale_id}/items/bulk/template.csv")
def bulk_import_template(ctx=Depends(require_role(OrgRole.SELLER))):
    """Downloadable CSV template matching the columns bulk_import_csv understands."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    writer.writerow(["Vintage Wooden Chair", "25.00", "Solid oak, minor scratches", "Furniture", "Good", "Garage - Table 2", "vintage;wood", "10.00", ""])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="saleday-bulk-import-template.csv"'},
    )


@router.post("/sales/{sale_id}/items/bulk", response_model=BulkImportResult, status_code=status.HTTP_201_CREATED)
def bulk_create_items_json(
    sale_id: str,
    payload: BulkItemCreateRequest,
    db: Session = Depends(get_db),
    ctx=Depends(require_role(OrgRole.SELLER)),
):
    """Multi-row 'quick add' — each row already validated as an ItemCreate by pydantic."""
    created, errors = bulk_create_items(db, sale=ctx.sale, user=ctx.user, rows=payload.items)
    db.commit()
    for item in created:
        db.refresh(item)
    return BulkImportResult(
        created=[_to_staff_out(i) for i in created],
        errors=errors,
        created_count=len(created),
        error_count=len(errors),
    )


@router.post("/sales/{sale_id}/items/bulk/csv", response_model=BulkImportResult, status_code=status.HTTP_201_CREATED)
async def bulk_import_items_csv(
    sale_id: str,
    db: Session = Depends(get_db),
    ctx=Depends(require_role(OrgRole.SELLER)),
    file: UploadFile = File(...),
):
    if file.content_type not in ("text/csv", "application/vnd.ms-excel", "application/csv", "text/plain") and not (
        file.filename or ""
    ).lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a .csv file.")

    max_bytes = settings.BULK_IMPORT_MAX_FILE_MB * 1024 * 1024
    raw = await file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV file is too large (max {settings.BULK_IMPORT_MAX_FILE_MB}MB).",
        )
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Couldn't read the file — please save it as UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None or "name" not in [f.strip().lower() for f in reader.fieldnames]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must include a 'name' column. Download the template to see the expected format.")

    # Normalize header casing/whitespace so "Name" / " Price " etc. still match.
    normalized_fields = {f: f.strip().lower() for f in reader.fieldnames}

    parsed_rows: list[dict] = []
    parse_errors: list[BulkImportRowError] = []
    row_count = 0
    for i, raw_row in enumerate(reader):
        row_count += 1
        if row_count > settings.BULK_IMPORT_MAX_ROWS:
            parse_errors.append(BulkImportRowError(row=row_count, message=f"Import capped at {settings.BULK_IMPORT_MAX_ROWS} rows; remaining rows were skipped."))
            break
        row = {normalized_fields[k]: (v.strip() if isinstance(v, str) else v) for k, v in raw_row.items() if k in normalized_fields}

        row_number = i + 1
        name = row.get("name", "")
        if not name:
            parse_errors.append(BulkImportRowError(row=row_number, message="Item name is required."))
            continue

        price_raw = row.get("price", "")
        try:
            price = float(price_raw) if price_raw != "" else 0.0
        except ValueError:
            parse_errors.append(BulkImportRowError(row=row_number, message=f"Invalid price '{price_raw}'."))
            continue

        min_price_raw = row.get("minimum_price", "")
        minimum_price = None
        if min_price_raw:
            try:
                minimum_price = float(min_price_raw)
            except ValueError:
                parse_errors.append(BulkImportRowError(row=row_number, message=f"Invalid minimum_price '{min_price_raw}'."))
                continue

        tags_raw = row.get("tags", "")
        tags = [t.strip() for t in tags_raw.split(";") if t.strip()] if tags_raw else None

        try:
            item_create = ItemCreate(
                name=name,
                description=row.get("description") or None,
                category=row.get("category") or None,
                condition=row.get("condition") or None,
                location=row.get("location") or None,
                tags=tags,
                price=price,
                minimum_price=minimum_price,
                internal_note=row.get("internal_note") or None,
            )
        except Exception as exc:  # pydantic ValidationError -> readable row-level message
            parse_errors.append(BulkImportRowError(row=row_number, message=str(exc).splitlines()[0]))
            continue
        parsed_rows.append(item_create)

    created, build_errors = bulk_create_items(db, sale=ctx.sale, user=ctx.user, rows=parsed_rows)
    db.commit()
    for item in created:
        db.refresh(item)

    all_errors = parse_errors + build_errors
    return BulkImportResult(
        created=[_to_staff_out(i) for i in created],
        errors=all_errors,
        created_count=len(created),
        error_count=len(all_errors),
    )


@router.get("/items/{item_id}", response_model=StaffItemOut)
def get_item(ctx=Depends(get_item_context)):
    return _to_staff_out(ctx.item)


@router.patch("/items/{item_id}", response_model=StaffItemOut)
def update_item(payload: ItemUpdate, db: Session = Depends(get_db), ctx=Depends(require_item_role(OrgRole.SELLER))):
    item = ctx.item
    data = payload.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)
    for field, value in data.items():
        setattr(item, field, value)
    if tags is not None:
        item.tags = ",".join(tags) if tags else None

    log_activity(
        db,
        organization_id=ctx.organization_id,
        sale_id=ctx.sale.id,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="item",
        entity_id=item.id,
        action="item.edited",
        new_value=data,
    )
    db.commit()
    db.refresh(item)
    return _to_staff_out(item)


@router.post("/items/{item_id}/price", response_model=StaffItemOut)
def update_price(payload: ItemPriceUpdate, db: Session = Depends(get_db), ctx=Depends(require_item_role(OrgRole.SELLER))):
    item = change_price(db, item=ctx.item, sale=ctx.sale, user=ctx.user, new_price=payload.price)
    db.commit()
    db.refresh(item)
    return _to_staff_out(item)


@router.post("/items/{item_id}/status", response_model=StaffItemOut)
def update_status(payload: ItemStatusUpdate, db: Session = Depends(get_db), ctx=Depends(require_item_role(OrgRole.SELLER))):
    item = change_status(db, item=ctx.item, sale=ctx.sale, user=ctx.user, new_status=payload.status)
    db.commit()
    db.refresh(item)
    return _to_staff_out(item)


@router.get("/items/{item_id}/history", response_model=ItemHistoryOut)
def item_history(db: Session = Depends(get_db), ctx=Depends(get_item_context)):
    from app.models.user import User as UserModel

    entries = []
    for h in ctx.item.price_history:
        user = db.get(UserModel, h.changed_by)
        entries.append(
            PriceHistoryEntryOut(
                id=h.id,
                old_price=float(h.old_price),
                new_price=float(h.new_price),
                changed_by_name=user.full_name if user else "Unknown",
                created_at=h.created_at,
            )
        )
    return ItemHistoryOut(price_history=list(reversed(entries)))


@router.post("/items/{item_id}/images", response_model=ItemImageOut, status_code=status.HTTP_201_CREATED)
async def upload_item_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    ctx=Depends(require_item_role(OrgRole.SELLER)),
):
    meta = await save_item_image(file)
    is_primary = len(ctx.item.images) == 0
    image = ItemImage(
        item_id=ctx.item.id,
        storage_key=meta["storage_key"],
        mime_type=meta["mime_type"],
        size=meta["size"],
        width=meta["width"],
        height=meta["height"],
        is_primary=is_primary,
        sort_order=len(ctx.item.images),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return ItemImageOut(id=image.id, url=image_url(image.storage_key), is_primary=image.is_primary, sort_order=image.sort_order)


@router.delete("/items/{item_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_image(image_id: str, db: Session = Depends(get_db), ctx=Depends(require_item_role(OrgRole.SELLER))):
    image = db.get(ItemImage, image_id)
    if image and image.item_id == ctx.item.id:
        db.delete(image)
        db.commit()
    return None


@router.get("/items/{item_id}/qr.png")
def get_item_qr(ctx=Depends(get_item_context)):
    png = generate_qr_png_bytes(item_public_url(ctx.item.qr_token))
    return Response(content=png, media_type="image/png")

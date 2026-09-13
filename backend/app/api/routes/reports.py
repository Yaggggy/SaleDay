import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.tenancy import get_sale_context
from app.core.db import get_db
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(tags=["reports"])


@router.get("/sales/{sale_id}/reports/inventory.csv")
def export_inventory_csv(db: Session = Depends(get_db), ctx=Depends(get_sale_context)):
    items = db.execute(select(Item).where(Item.sale_id == ctx.sale.id).order_by(Item.item_reference)).scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Reference", "Name", "Category", "Location", "Status", "Original Price", "Current Price", "Sold Price"])
    for i in items:
        writer.writerow([
            i.item_reference, i.name, i.category or "", i.location or "", i.status.value,
            float(i.original_listed_price), float(i.current_price), float(i.final_sold_price) if i.final_sold_price else "",
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{ctx.sale.name}-inventory.csv"'},
    )


@router.get("/sales/{sale_id}/reports/transactions.csv")
def export_transactions_csv(db: Session = Depends(get_db), ctx=Depends(get_sale_context)):
    rows = db.execute(
        select(Transaction, Item, User)
        .join(Item, Item.id == Transaction.item_id)
        .join(User, User.id == Transaction.sold_by_id)
        .where(Transaction.sale_id == ctx.sale.id)
        .order_by(Transaction.created_at)
    ).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Item", "Sold Price", "Payment Method", "Sold By", "Status"])
    for t, item, user in rows:
        writer.writerow([t.created_at.isoformat(), item.name, float(t.sold_price), t.payment_method.value, user.full_name, t.status.value])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{ctx.sale.name}-transactions.csv"'},
    )

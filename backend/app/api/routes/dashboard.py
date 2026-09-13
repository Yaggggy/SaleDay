from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.tenancy import get_sale_context
from app.core.db import get_db
from app.models.activity import ActivityLog
from app.models.base import ItemStatus, TransactionStatus
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import ActivityLogOut, DashboardOut, TeamPerformanceEntry

router = APIRouter(tags=["dashboard"])


@router.get("/sales/{sale_id}/dashboard", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db), ctx=Depends(get_sale_context)):
    sale = ctx.sale

    revenue = db.execute(
        select(func.coalesce(func.sum(Transaction.sold_price), 0)).where(
            Transaction.sale_id == sale.id, Transaction.status == TransactionStatus.COMPLETED
        )
    ).scalar_one()
    items_sold = db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.sale_id == sale.id, Transaction.status == TransactionStatus.COMPLETED
        )
    ).scalar_one()
    total_items = db.execute(select(func.count()).select_from(Item).where(Item.sale_id == sale.id)).scalar_one()
    remaining = db.execute(
        select(func.count()).select_from(Item).where(
            Item.sale_id == sale.id, Item.status.in_([ItemStatus.AVAILABLE, ItemStatus.RESERVED])
        )
    ).scalar_one()
    total_listed_value = db.execute(
        select(func.coalesce(func.sum(Item.current_price), 0)).where(
            Item.sale_id == sale.id, Item.status.in_([ItemStatus.AVAILABLE, ItemStatus.RESERVED])
        )
    ).scalar_one()

    sell_through = (items_sold / total_items * 100) if total_items else 0.0
    average_sale = (float(revenue) / items_sold) if items_sold else 0.0

    recent = db.execute(
        select(ActivityLog).where(ActivityLog.sale_id == sale.id).order_by(ActivityLog.created_at.desc()).limit(15)
    ).scalars().all()

    return DashboardOut(
        revenue=float(revenue),
        items_sold=items_sold,
        items_remaining=remaining,
        sell_through_pct=round(sell_through, 1),
        average_sale=round(average_sale, 2),
        sales_goal=float(sale.sales_goal) if sale.sales_goal is not None else None,
        total_items=total_items,
        total_listed_value=float(total_listed_value),
        recent_activity=[ActivityLogOut.model_validate(a) for a in recent],
    )


@router.get("/sales/{sale_id}/team-performance", response_model=list[TeamPerformanceEntry])
def team_performance(db: Session = Depends(get_db), ctx=Depends(get_sale_context)):
    rows = db.execute(
        select(User.id, User.full_name, func.count(Transaction.id), func.coalesce(func.sum(Transaction.sold_price), 0))
        .join(Transaction, Transaction.sold_by_id == User.id)
        .where(Transaction.sale_id == ctx.sale.id, Transaction.status == TransactionStatus.COMPLETED)
        .group_by(User.id, User.full_name)
        .order_by(func.sum(Transaction.sold_price).desc())
    ).all()
    return [
        TeamPerformanceEntry(user_id=uid, full_name=name, items_sold=count, revenue=float(rev))
        for uid, name, count, rev in rows
    ]


@router.get("/sales/{sale_id}/activity", response_model=list[ActivityLogOut])
def sale_activity(db: Session = Depends(get_db), ctx=Depends(get_sale_context), limit: int = Query(default=50, le=200)):
    rows = db.execute(
        select(ActivityLog).where(ActivityLog.sale_id == ctx.sale.id).order_by(ActivityLog.created_at.desc()).limit(limit)
    ).scalars().all()
    return [ActivityLogOut.model_validate(a) for a in rows]

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import current_user_required
from app.api.dependencies.tenancy import get_org_context, get_sale_context, require_org_role, require_role
from app.core.db import get_db
from app.models.base import ItemStatus, MemberStatus, OrgRole, SaleStatus, TransactionStatus
from app.models.item import Item
from app.models.organization import OrganizationMember
from app.models.sale import Sale
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleOut, SaleStatusUpdate, SaleSummaryOut, SaleUpdate 
from app.services.activity_service import log_activity

router = APIRouter(tags=["sales"])

VALID_SALE_TRANSITIONS = {
    SaleStatus.DRAFT: {SaleStatus.PREPARING, SaleStatus.ARCHIVED},
    SaleStatus.PREPARING: {SaleStatus.ACTIVE, SaleStatus.DRAFT, SaleStatus.ARCHIVED},
    SaleStatus.ACTIVE: {SaleStatus.COMPLETED},
    SaleStatus.COMPLETED: {SaleStatus.ARCHIVED, SaleStatus.ACTIVE},
    SaleStatus.ARCHIVED: set(),
}


@router.post("/organizations/{org_id}/sales", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(org_id: str, payload: SaleCreate, db: Session = Depends(get_db), ctx=Depends(require_org_role(OrgRole.ADMIN))):
    if payload.start_time and payload.end_time and payload.end_time < payload.start_time:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End time must not be before start time.")

    sale = Sale(
        organization_id=org_id,
        name=payload.name.strip(),
        description=payload.description,
        address=payload.address,
        sale_date=payload.sale_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        sales_goal=payload.sales_goal,
        status=SaleStatus.DRAFT,
        created_by=ctx.user.id,
    )
    db.add(sale)
    db.flush()

    log_activity(
        db,
        organization_id=org_id,
        sale_id=sale.id,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="sale",
        entity_id=sale.id,
        action="sale.created",
        new_value={"name": sale.name},
    )
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/organizations/{org_id}/sales", response_model=list[SaleSummaryOut])
def list_sales(org_id: str, db: Session = Depends(get_db), ctx=Depends(get_org_context)):
    sales = db.execute(select(Sale).where(Sale.organization_id == org_id).order_by(Sale.created_at.desc())).scalars().all()

    results = []
    for sale in sales:
        item_count = db.execute(select(func.count()).select_from(Item).where(Item.sale_id == sale.id)).scalar_one()
        sold_count = db.execute(
            select(func.count()).select_from(Item).where(Item.sale_id == sale.id, Item.status == ItemStatus.SOLD)
        ).scalar_one()
        revenue = db.execute(
            select(func.coalesce(func.sum(Transaction.sold_price), 0)).where(
                Transaction.sale_id == sale.id, Transaction.status == TransactionStatus.COMPLETED
            )
        ).scalar_one()
        results.append(
            SaleSummaryOut(
                **SaleOut.model_validate(sale).model_dump(),
                item_count=item_count,
                sold_count=sold_count,
                revenue=float(revenue),
            )
        )
    return results


@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(sale_id: str, ctx=Depends(get_sale_context)):
    return ctx.sale


@router.patch("/sales/{sale_id}", response_model=SaleOut)
def update_sale(sale_id: str, payload: SaleUpdate, db: Session = Depends(get_db), ctx=Depends(require_role(OrgRole.ADMIN))):
    sale = ctx.sale
    data = payload.model_dump(exclude_unset=True)
    if "start_time" in data or "end_time" in data:
        start = data.get("start_time", sale.start_time)
        end = data.get("end_time", sale.end_time)
        if start and end and end < start:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End time must not be before start time.")

    for field, value in data.items():
        setattr(sale, field, value)

    log_activity(
        db,
        organization_id=ctx.organization_id,
        sale_id=sale.id,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="sale",
        entity_id=sale.id,
        action="sale.updated",
        new_value=data,
    )
    db.commit()
    db.refresh(sale)
    return sale


@router.post("/sales/{sale_id}/status", response_model=SaleOut)
def update_sale_status(sale_id: str, payload: SaleStatusUpdate, db: Session = Depends(get_db), ctx=Depends(require_role(OrgRole.OWNER))):
    sale = ctx.sale
    allowed = VALID_SALE_TRANSITIONS.get(sale.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot move sale from {sale.status.value} to {payload.status.value}.",
        )
    previous = sale.status.value
    sale.status = payload.status

    log_activity(
        db,
        organization_id=ctx.organization_id,
        sale_id=sale.id,
        actor_id=ctx.user.id,
        actor_name=ctx.user.full_name,
        entity_type="sale",
        entity_id=sale.id,
        action="sale.status_changed",
        previous_value={"status": previous},
        new_value={"status": payload.status.value},
    )
    db.commit()
    db.refresh(sale)
    return sale

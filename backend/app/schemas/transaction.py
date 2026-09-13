from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import PaymentMethod, TransactionStatus


class MarkSoldRequest(BaseModel):
    sold_price: float = Field(ge=0)
    payment_method: PaymentMethod = PaymentMethod.CASH


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sale_id: str
    item_id: str
    item_name: str | None = None
    sold_price: float
    payment_method: PaymentMethod
    sold_by_id: str
    sold_by_name: str | None = None
    status: TransactionStatus
    created_at: datetime


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sale_id: str | None
    actor_name: str | None
    entity_type: str
    entity_id: str | None
    action: str
    previous_value: dict | None
    new_value: dict | None
    log_metadata: dict | None
    created_at: datetime


class DashboardOut(BaseModel):
    revenue: float
    items_sold: int
    items_remaining: int
    sell_through_pct: float
    average_sale: float
    sales_goal: float | None
    total_items: int
    total_listed_value: float
    recent_activity: list[ActivityLogOut]


class TeamPerformanceEntry(BaseModel):
    user_id: str
    full_name: str
    items_sold: int
    revenue: float


class InventorySummaryOut(BaseModel):
    total: int
    available: int
    sold: int
    reserved: int
    removed: int
    unsold: int

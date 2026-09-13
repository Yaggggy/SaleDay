from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import SaleStatus


class SaleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    address: str | None = Field(default=None, max_length=300)
    sale_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    sales_goal: float | None = Field(default=None, ge=0)

    def validate_times(self):
        if self.start_time and self.end_time and self.end_time < self.start_time:
            raise ValueError("end_time must not be before start_time")


class SaleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    address: str | None = Field(default=None, max_length=300)
    sale_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    sales_goal: float | None = Field(default=None, ge=0)
    is_public: bool | None = None


class SaleStatusUpdate(BaseModel):
    status: SaleStatus


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    name: str
    description: str | None
    address: str | None
    sale_date: date | None
    start_time: time | None
    end_time: time | None
    status: SaleStatus
    sales_goal: float | None
    is_public: bool
    created_at: datetime
    updated_at: datetime


class SaleSummaryOut(SaleOut):
    item_count: int = 0
    sold_count: int = 0
    revenue: float = 0

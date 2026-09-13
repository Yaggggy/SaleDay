from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings
from app.models.base import ItemStatus


class ItemImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    url: str
    is_primary: bool
    sort_order: int


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = None
    price: float = Field(ge=0)
    minimum_price: float | None = Field(default=None, ge=0)
    internal_note: str | None = None


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = None
    minimum_price: float | None = Field(default=None, ge=0)
    internal_note: str | None = None


class ItemPriceUpdate(BaseModel):
    price: float = Field(ge=0)


class ItemStatusUpdate(BaseModel):
    status: ItemStatus


# ---- PUBLIC (shopper-safe) schema. Never include private/internal fields here. ----
class PublicItemOut(BaseModel):
    name: str
    description: str | None
    price: float
    category: str | None
    condition: str | None
    status: ItemStatus
    images: list[ItemImageOut] = []
    sale_name: str
    sale_status: str
    # Populated only when the visitor is an authenticated, authorized staff member.
    # Never trust this flag on the client for anything beyond showing/hiding a UI shortcut;
    # every management action independently re-checks permission server-side.
    is_staff: bool = False
    item_id: str | None = None
    sale_id: str | None = None


# ---- STAFF (authenticated, authorized) schema. Includes internal fields. ----
class StaffItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sale_id: str
    name: str
    description: str | None
    category: str | None
    condition: str | None
    location: str | None
    tags: list[str] = []
    item_reference: str
    qr_token: str
    status: ItemStatus
    original_listed_price: float
    current_price: float
    minimum_price: float | None
    final_sold_price: float | None
    internal_note: str | None
    sold_by_id: str | None
    sold_at: datetime | None
    images: list[ItemImageOut] = []
    created_at: datetime
    updated_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def _split_tags(cls, v: object) -> list[str]:
        # The ORM stores tags as a comma-separated string (or None); the API
        # contract is a list[str]. Convert here so model_validate(item, ...)
        # works directly on the SQLAlchemy object without a manual patch-up.
        if v is None:
            return []
        if isinstance(v, str):
            return [t for t in v.split(",") if t]
        return v  # already a list (e.g. constructed manually elsewhere)


class PriceHistoryEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    old_price: float
    new_price: float
    changed_by_name: str
    created_at: datetime


class ItemHistoryOut(BaseModel):
    price_history: list[PriceHistoryEntryOut]


# ---- Bulk import (CSV upload or multi-row quick-add form) ----
class BulkItemCreateRequest(BaseModel):
    items: list[ItemCreate] = Field(min_length=1, max_length=settings.BULK_IMPORT_MAX_ROWS)


class BulkImportRowError(BaseModel):
    row: int = Field(description="1-indexed row number as shown to the user")
    message: str


class BulkImportResult(BaseModel):
    created: list[StaffItemOut]
    errors: list[BulkImportRowError]
    created_count: int
    error_count: int

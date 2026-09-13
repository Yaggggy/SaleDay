from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import ItemStatus, TimestampMixin, UUIDPKMixin, gen_uuid
from app.core.security import new_opaque_token


class Item(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint("sale_id", "item_reference", name="uq_item_reference_per_sale"),
    )

    sale_id: Mapped[str] = mapped_column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    condition: Mapped[str | None] = mapped_column(String(40), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)  # comma-separated

    item_reference: Mapped[str] = mapped_column(String(20), nullable=False)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=new_opaque_token, nullable=False)

    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus), nullable=False, default=ItemStatus.AVAILABLE, index=True)

    original_listed_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    current_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    minimum_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    final_sold_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    internal_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    sold_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    sold_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    sale = relationship("Sale", back_populates="items")
    images = relationship("ItemImage", back_populates="item", cascade="all, delete-orphan", order_by="ItemImage.sort_order")
    price_history = relationship("PriceHistory", back_populates="item", cascade="all, delete-orphan", order_by="PriceHistory.created_at")
    transactions = relationship("Transaction", back_populates="item", cascade="all, delete-orphan")


class ItemImage(UUIDPKMixin, Base):
    __tablename__ = "item_images"

    item_id: Mapped[str] = mapped_column(String(36), ForeignKey("items.id", ondelete="CASCADE"), index=True, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    item = relationship("Item", back_populates="images")


class PriceHistory(UUIDPKMixin, Base):
    __tablename__ = "price_history"

    item_id: Mapped[str] = mapped_column(String(36), ForeignKey("items.id", ondelete="CASCADE"), index=True, nullable=False)
    old_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    new_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    item = relationship("Item", back_populates="price_history")

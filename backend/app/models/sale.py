from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import SaleStatus, TimestampMixin, UUIDPKMixin


class Sale(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "sales"

    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    sale_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    status: Mapped[SaleStatus] = mapped_column(Enum(SaleStatus), nullable=False, default=SaleStatus.DRAFT)
    sales_goal: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_public: Mapped[bool] = mapped_column(default=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    organization = relationship("Organization", back_populates="sales")
    items = relationship("Item", back_populates="sale", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="sale", cascade="all, delete-orphan")

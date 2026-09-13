from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import PaymentMethod, TransactionStatus, UUIDPKMixin


class Transaction(UUIDPKMixin, Base):
    __tablename__ = "transactions"

    sale_id: Mapped[str] = mapped_column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), index=True, nullable=False)
    item_id: Mapped[str] = mapped_column(String(36), ForeignKey("items.id", ondelete="CASCADE"), index=True, nullable=False)
    sold_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.CASH)
    sold_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), nullable=False, default=TransactionStatus.COMPLETED, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reversed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    sale = relationship("Sale", back_populates="transactions")
    item = relationship("Item", back_populates="transactions")

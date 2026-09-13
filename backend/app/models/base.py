import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func


def gen_uuid() -> str:
    return str(uuid.uuid4())


class UUIDPKMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class OrgRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    SELLER = "SELLER"
    VIEWER = "VIEWER"


class MemberStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    REMOVED = "REMOVED"


class SaleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PREPARING = "PREPARING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class ItemStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    REMOVED = "REMOVED"
    UNSOLD = "UNSOLD"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    VENMO = "VENMO"
    PAYPAL = "PAYPAL"
    OTHER = "OTHER"


class TransactionStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    REVERSED = "REVERSED"


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


# Valid item state transitions - enforced server-side, never trust the client.
ITEM_STATUS_TRANSITIONS: dict[ItemStatus, set[ItemStatus]] = {
    ItemStatus.DRAFT: {ItemStatus.AVAILABLE, ItemStatus.REMOVED},
    ItemStatus.AVAILABLE: {
        ItemStatus.SOLD,
        ItemStatus.RESERVED,
        ItemStatus.REMOVED,
        ItemStatus.UNSOLD,
    },
    ItemStatus.RESERVED: {ItemStatus.SOLD, ItemStatus.AVAILABLE, ItemStatus.REMOVED},
    ItemStatus.SOLD: {ItemStatus.AVAILABLE},  # undo sale
    ItemStatus.UNSOLD: {ItemStatus.AVAILABLE, ItemStatus.REMOVED},
    ItemStatus.REMOVED: set(),
}

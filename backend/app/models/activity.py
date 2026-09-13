from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import InvitationStatus, OrgRole, UUIDPKMixin


class ActivityLog(UUIDPKMixin, Base):
    __tablename__ = "activity_logs"

    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    sale_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), index=True, nullable=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    previous_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    log_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)


class Invitation(UUIDPKMixin, Base):
    __tablename__ = "invitations"

    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[OrgRole] = mapped_column(Enum(OrgRole), nullable=False, default=OrgRole.SELLER)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    invited_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[InvitationStatus] = mapped_column(Enum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    organization = relationship("Organization", back_populates="invitations")

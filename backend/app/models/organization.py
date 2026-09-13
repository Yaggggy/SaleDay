from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import MemberStatus, OrgRole, TimestampMixin, UUIDPKMixin


class Organization(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="organization", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMember(UUIDPKMixin, Base):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_member"),)

    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[OrgRole] = mapped_column(Enum(OrgRole), nullable=False, default=OrgRole.SELLER)
    status: Mapped[MemberStatus] = mapped_column(Enum(MemberStatus), nullable=False, default=MemberStatus.ACTIVE)
    joined_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")

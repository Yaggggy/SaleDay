from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.base import InvitationStatus, MemberStatus, OrgRole


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    created_at: datetime


class OrganizationMembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    organization_id: str
    organization_name: str
    role: OrgRole
    status: MemberStatus


class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    full_name: str
    email: EmailStr
    role: OrgRole
    status: MemberStatus
    joined_at: datetime
    last_active_at: datetime | None = None


class UpdateMemberRoleRequest(BaseModel):
    role: OrgRole


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: OrgRole = OrgRole.SELLER


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    role: OrgRole
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime


class AcceptInvitationRequest(BaseModel):
    token: str
    full_name: str | None = Field(default=None, max_length=150)
    password: str | None = Field(default=None, min_length=8, max_length=128)

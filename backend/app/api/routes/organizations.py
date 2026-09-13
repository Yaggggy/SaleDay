from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies.tenancy import get_org_context
from app.core.db import get_db
from app.models.organization import Organization
from app.schemas.organization import OrganizationOut

router = APIRouter(tags=["organizations"])


@router.get("/organizations/{org_id}", response_model=OrganizationOut)
def get_organization(org_id: str, db: Session = Depends(get_db), ctx=Depends(get_org_context)):
    org = db.get(Organization, org_id)
    return org

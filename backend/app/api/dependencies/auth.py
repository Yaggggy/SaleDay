from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import decode_token
from app.models.user import User


def _resolve_user_from_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.get(User, user_id)
    if not user or not user.is_active:
        return None
    return user


def current_user_optional(
    db: Session = Depends(get_db),
    saleday_access: str | None = Cookie(default=None, alias=settings.ACCESS_COOKIE_NAME),
) -> User | None:
    """Returns the authenticated user if a valid access token cookie is present, else None.
    Used by public endpoints (e.g. the QR item page) that behave differently for staff."""
    return _resolve_user_from_token(saleday_access, db)


def current_user_required(
    db: Session = Depends(get_db),
    saleday_access: str | None = Cookie(default=None, alias=settings.ACCESS_COOKIE_NAME),
) -> User:
    user = _resolve_user_from_token(saleday_access, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user

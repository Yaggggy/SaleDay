import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash
from jose import jwt, JWTError

from app.core.config import settings

_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, password)
    except (VerifyMismatchError, InvalidHash):
        return False


def needs_rehash(hashed: str) -> bool:
    try:
        return _hasher.check_needs_rehash(hashed)
    except InvalidHash:
        return True


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta, extra: dict[str, Any] | None = None) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": expire,
        "jti": jti,
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expire


def create_access_token(user_id: str) -> tuple[str, str, datetime]:
    return _create_token(
        user_id, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    return _create_token(
        user_id, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


def new_opaque_token() -> str:
    """Used for invitation tokens / QR item tokens: unguessable opaque strings."""
    return uuid.uuid4().hex + uuid.uuid4().hex

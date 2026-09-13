import os
import uuid

from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _ensure_upload_dir() -> None:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


async def save_item_image(file: UploadFile) -> dict:
    _ensure_upload_dir()

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, WEBP, or GIF images are allowed.",
        )

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image must be smaller than {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}[file.content_type]
    key = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.UPLOAD_DIR, key)

    with open(path, "wb") as f:
        f.write(contents)

    width, height = None, None
    try:
        with Image.open(path) as img:
            width, height = img.size
    except Exception:
        pass

    return {
        "storage_key": key,
        "mime_type": file.content_type,
        "size": len(contents),
        "width": width,
        "height": height,
    }


def image_url(storage_key: str) -> str:
    return f"/uploads/{storage_key}"

import io

import qrcode
from qrcode.image.pure import PyPNGImage

from app.core.config import settings


def item_public_url(qr_token: str) -> str:
    return f"{settings.PUBLIC_APP_URL}/i/{qr_token}"


def generate_qr_png_bytes(data: str) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(image_factory=PyPNGImage)
    buffer = io.BytesIO()
    img.save(buffer)
    return buffer.getvalue()

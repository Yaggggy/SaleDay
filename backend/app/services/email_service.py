"""Outbound email for team invitations.

Sends over SMTP (STARTTLS) using stdlib smtplib only — no extra dependency.
If SMTP_HOST isn't configured (local/dev), emails are logged instead of sent
so the rest of the invitation flow keeps working without a mail server.

Callers should invoke `send_invitation_email` from a FastAPI BackgroundTask,
never inline in the request path — SMTP calls are blocking and must not
delay the API response or roll back a successful invitation write.
"""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings
from app.core.logging import logger


def _build_invitation_message(*, to_email: str, org_name: str, inviter_name: str, role: str, accept_url: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"{inviter_name} invited you to join {org_name} on SaleDay"
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    msg["To"] = to_email

    text_body = (
        f"Hi,\n\n"
        f"{inviter_name} invited you to join \"{org_name}\" on SaleDay as a {role.title()}.\n\n"
        f"Accept the invitation here:\n{accept_url}\n\n"
        f"This link expires in 7 days. If you weren't expecting this, you can safely ignore this email.\n\n"
        f"— The SaleDay team"
    )
    html_body = f"""\
<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#faf6ef; padding:32px; color:#2b2620;">
    <table role="presentation" width="100%" style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; padding:32px; border:1px solid #ece3d3;">
      <tr><td>
        <h2 style="margin:0 0 12px; font-size:20px;">You're invited to join {org_name}</h2>
        <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#5c5347;">
          <strong>{inviter_name}</strong> invited you to help manage <strong>{org_name}</strong>'s
          yard sale on SaleDay as a <strong>{role.title()}</strong>.
        </p>
        <a href="{accept_url}"
           style="display:inline-block; background:#e8792c; color:#ffffff; text-decoration:none;
                  padding:12px 24px; border-radius:10px; font-weight:600; font-size:14px;">
          Accept Invitation
        </a>
        <p style="margin:24px 0 0; font-size:12px; color:#8a8072;">
          This link expires in 7 days. If the button doesn't work, copy this link into your browser:<br>
          <span style="word-break:break-all;">{accept_url}</span>
        </p>
      </td></tr>
    </table>
  </body>
</html>"""

    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    return msg


def _send(msg: EmailMessage) -> None:
    """Blocking SMTP send. Never raises — failures are logged, not propagated,
    so a mail outage can't roll back or crash the calling request/background task."""
    if not settings.EMAIL_ENABLED:
        logger.info("Email disabled (no SMTP_HOST configured) — would have sent: %s -> %s", msg["Subject"], msg["To"])
        return
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as client:
            if settings.SMTP_USE_TLS:
                client.starttls()
            if settings.SMTP_USERNAME:
                client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            client.send_message(msg)
        logger.info("Sent invitation email to %s", msg["To"])
    except Exception as exc:  # noqa: BLE001 - best-effort delivery, invitation record already persisted
        logger.error("Failed to send invitation email to %s: %s", msg["To"], exc)


def send_invitation_email(*, to_email: str, org_name: str, inviter_name: str, role: str, token: str) -> None:
    accept_url = f"{settings.PUBLIC_APP_URL.rstrip('/')}/accept-invite?token={token}"
    msg = _build_invitation_message(
        to_email=to_email, org_name=org_name, inviter_name=inviter_name, role=role, accept_url=accept_url
    )
    _send(msg)

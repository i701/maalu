from fastapi import APIRouter, HTTPException, status

from app import mailer
from app.config import settings
from app.dependencies import CurrentUser
from app.schemas import EmailStatus

router = APIRouter(prefix="/email", tags=["email"])


@router.get("/status", response_model=EmailStatus)
async def email_status(_user: CurrentUser):
    """Whether this server can send email at all (the SMTP settings are an operator's choice)."""
    return EmailStatus(
        configured=mailer.configured(),
        sender=settings.smtp_from if mailer.configured() else None,
    )


@router.post("/test", status_code=status.HTTP_204_NO_CONTENT)
async def send_test(user: CurrentUser):
    """Send a short message to your own sign-in address, to check the settings work. The provider's
    own error (a wrong key, an unverified sender) comes back as the reason."""
    try:
        await mailer.send(
            user.email,
            "Maalu: a test email",
            "If you can read this, email from your Maalu server works.\n",
            "<p>If you can read this, email from your Maalu server works.</p>",
        )
    except mailer.MailError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"Could not send: {exc}") from exc

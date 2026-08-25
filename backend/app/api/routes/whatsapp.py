from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.config import settings
from app.services.whatsapp_service import WhatsAppService
from app.core.logging import logger

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Webhook"])


@router.get("/webhook", response_class=PlainTextResponse)
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """
    Webhook verification endpoint required by Meta WhatsApp Cloud API.
    """
    logger.info(f"WhatsApp verification attempt: mode={hub_mode}, token={hub_verify_token}")
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully!")
        return PlainTextResponse(content=hub_challenge, status_code=200)

    # Return 403 if token mismatch
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch",
    )


@router.post("/webhook")
async def process_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Incoming webhook events from Meta WhatsApp Cloud API.
    """
    try:
        payload = await request.json()
        logger.info(f"Incoming WhatsApp webhook event received: {payload}")
        service = WhatsAppService(db)
        await service.handle_webhook_event(payload)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error handling WhatsApp webhook: {e}")
        # Always return 200 to Meta so it does not retry endlessly on application errors
        return {"status": "error", "detail": str(e)}

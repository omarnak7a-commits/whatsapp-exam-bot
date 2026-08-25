import httpx
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger


class WhatsAppClient:
    def __init__(self):
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_version = settings.WHATSAPP_API_VERSION
        self.base_url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}"

    async def send_raw_message(self, payload: Dict[str, Any]) -> bool:
        """Sends payload to WhatsApp Meta Cloud API."""
        if self.access_token == "MOCK_TOKEN" or not self.access_token:
            logger.info(f"[MOCK WHATSAPP SEND] Payload: {payload}")
            return True

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url}/messages"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                if response.status_code >= 400:
                    logger.error(f"WhatsApp API Error {response.status_code}: {response.text}")
                    return False
                return True
            except Exception as e:
                logger.error(f"WhatsApp API Exception: {e}")
                return False

    async def send_text_message(self, recipient: str, text: str) -> bool:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient,
            "type": "text",
            "text": {"body": text},
        }
        return await self.send_raw_message(payload)

    async def send_interactive_buttons(
        self, recipient: str, body_text: str, buttons: list, header_text: Optional[str] = None
    ) -> bool:
        """
        buttons: list of dicts [{"id": "...", "title": "..."}] (max 3 buttons)
        """
        interactive_obj: Dict[str, Any] = {
            "type": "button",
            "body": {"text": body_text},
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {"id": btn["id"], "title": btn["title"][:20]},  # 20 char limit on button titles
                    }
                    for btn in buttons[:3]
                ]
            },
        }
        if header_text:
            interactive_obj["header"] = {"type": "text", "text": header_text}

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient,
            "type": "interactive",
            "interactive": interactive_obj,
        }
        return await self.send_raw_message(payload)

    async def send_interactive_list(
        self, recipient: str, body_text: str, button_label: str, title: str, rows: list
    ) -> bool:
        """
        rows: list of dicts [{"id": "...", "title": "...", "description": "..."}]
        """
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {"type": "text", "text": title},
                "body": {"text": body_text},
                "action": {
                    "button": button_label[:20],
                    "sections": [
                        {
                            "title": "الاختيارات المتاحة",
                            "rows": [
                                {
                                    "id": row["id"],
                                    "title": row["title"][:24],  # 24 char limit on list item titles
                                }
                                for row in rows[:10]
                            ],
                        }
                    ],
                },
            },
        }
        return await self.send_raw_message(payload)

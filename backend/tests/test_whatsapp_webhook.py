import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_webhook_verification(client: AsyncClient):
    # Test valid verification
    params = {
        "hub.mode": "subscribe",
        "hub.challenge": "123456789",
        "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
    }
    response = await client.get("/api/whatsapp/webhook", params=params)
    assert response.status_code == 200
    assert response.text == "123456789"

    # Test invalid token
    bad_params = {
        "hub.mode": "subscribe",
        "hub.challenge": "123456789",
        "hub.verify_token": "wrong_token",
    }
    bad_response = await client.get("/api/whatsapp/webhook", params=bad_params)
    assert bad_response.status_code == 403


@pytest.mark.asyncio
async def test_webhook_duplicate_protection(client: AsyncClient):
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"phone_number_id": "1234567890"},
                            "contacts": [{"profile": {"name": "محمود أحمد"}}],
                            "messages": [
                                {
                                    "from": "201234567890",
                                    "id": "wamid.HBgLMjAxMjM0NTY3ODkwFQIAERgSQjA1RDZFNUU1N0U1RjU4RkE5AA==",
                                    "timestamp": "1700000000",
                                    "type": "text",
                                    "text": {"body": "مرحبا"},
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }

    # First event delivery
    res1 = await client.post("/api/whatsapp/webhook", json=payload)
    assert res1.status_code == 200

    # Duplicate delivery with same wamid -> should return 200 and process safely without error
    res2 = await client.post("/api/whatsapp/webhook", json=payload)
    assert res2.status_code == 200

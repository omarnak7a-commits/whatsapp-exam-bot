from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class WebhookVerificationQuery(BaseModel):
    hub_mode: str
    hub_challenge: str
    hub_verify_token: str


class WebhookPayload(BaseModel):
    object: Optional[str] = None
    entry: Optional[List[Dict[str, Any]]] = None

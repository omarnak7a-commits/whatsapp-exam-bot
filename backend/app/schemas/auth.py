from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_name: str
    admin_email: str


class TokenData(BaseModel):
    sub: Optional[str] = None


class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

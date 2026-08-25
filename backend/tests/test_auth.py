import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    response = await client.post(
        "/api/auth/login",
        json={"email": "testadmin@exam.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["admin_email"] == "testadmin@exam.com"


@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient, admin_user):
    response = await client.post(
        "/api/auth/login",
        json={"email": "testadmin@exam.com", "password": "wrong_password"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_protected(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "testadmin@exam.com"

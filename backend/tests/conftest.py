import asyncio
import pytest
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import Base, get_db
from app.core.security import get_password_hash
from app.models.admin import Admin

TEST_DATABASE_URL = "sqlite+aiosqlite:///file:testdb?mode=memory&cache=shared"

engine_test = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False, "uri": True},
    poolclass=StaticPool,
    echo=False,
)
AsyncSessionTest = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
async def prepare_database():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionTest() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionTest() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> Admin:
    admin = Admin(
        name="مدير في الاختبارات",
        email="testadmin@exam.com",
        password_hash=get_password_hash("password123"),
        role="ADMIN",
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
async def admin_auth_token(client: AsyncClient, admin_user: Admin) -> str:
    res = await client.post(
        "/api/auth/login",
        json={"email": "testadmin@exam.com", "password": "password123"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]

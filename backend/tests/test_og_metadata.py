"""Open Graph metadata must be present in the HTML served to social crawlers."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.og import OG_TITLE, OG_DESCRIPTION

WHATSAPP_HEADERS = {
    "user-agent": "WhatsApp/2.23.20.79 A",
    "x-forwarded-host": "whatsapp-exam-bot.vercel.app",
    "x-forwarded-proto": "https",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.mark.parametrize("path", ["/", "/exam/some-slug", "/exam/some-slug/leaderboard"])
def test_og_tags_in_server_html(client, path):
    r = client.get(path, headers=WHATSAPP_HEADERS)
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
    body = r.text
    assert f'<title>{OG_TITLE}</title>' in body
    assert f'<meta property="og:title" content="{OG_TITLE}" />' in body
    assert f'<meta property="og:description" content="{OG_DESCRIPTION}" />' in body
    assert f'og:url" content="https://whatsapp-exam-bot.vercel.app{path}"' in body
    assert 'og:image" content="https://whatsapp-exam-bot.vercel.app/og-image.png"' in body
    assert body.count('property="og:title"') == 1


def test_exam_url_uses_article_type(client):
    body = client.get("/exam/some-slug", headers=WHATSAPP_HEADERS).text
    assert '<meta property="og:type" content="article" />' in body


def test_api_routes_still_json(client):
    assert client.get("/api/unknown").status_code == 404
    assert client.get("/health").json() == {"status": "healthy"}


def test_static_assets_still_served(client):
    assert client.get("/og-image.png").status_code == 200

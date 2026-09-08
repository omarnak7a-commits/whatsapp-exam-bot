"""Server-side Open Graph metadata for share links (WhatsApp / Facebook).

The frontend is a Vite SPA, so social crawlers never execute its JavaScript.
This module renders the built `index.html` with the Open Graph / Twitter tags
already present in the HTML that reaches the crawler.

Nothing here changes routing, exam URLs, or the deployed domain: the same SPA
document is returned, only its <head> metadata is rewritten.
"""
from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

# Branding requested for every share preview.
OG_TITLE = "جبت كام؟ | مس إيه فايز"
OG_DESCRIPTION = "اختبر نفسك وشوف جبت كام مع مس إيه فايز!"
OG_IMAGE_PATH = "/og-image.png"
OG_SITE_NAME = "جبت كام؟"
DEFAULT_SITE_URL = "https://whatsapp-exam-bot.vercel.app"

# Tags we manage; any pre-existing copy in index.html is stripped before we
# inject the freshly-computed ones (prevents duplicate/conflicting metadata).
_MANAGED_META = re.compile(
    r"""\s*<meta\s+[^>]*(?:property|name)\s*=\s*["'](?:og:[^"']+|twitter:[^"']+|description)["'][^>]*>""",
    re.IGNORECASE,
)
_TITLE_RE = re.compile(r"<title>.*?</title>", re.IGNORECASE | re.DOTALL)


def _esc(value: str) -> str:
    return html.escape(value, quote=True)


def site_base_url(request=None) -> str:
    """Absolute origin for og:url / og:image (never hardcodes a new domain)."""
    if request is not None:
        try:
            forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
            proto = request.headers.get("x-forwarded-proto")
            if forwarded_host:
                scheme = proto or request.url.scheme or "https"
                if forwarded_host.startswith("localhost") or forwarded_host.startswith("127."):
                    scheme = proto or "http"
                return f"{scheme}://{forwarded_host}".rstrip("/")
        except Exception:  # noqa: BLE001 - metadata must never break page delivery
            pass
    return DEFAULT_SITE_URL


def canonical_url(request=None, path: str = "/") -> str:
    base = site_base_url(request)
    if not path.startswith("/"):
        path = "/" + path
    parts = urlsplit(base)
    return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


def build_meta_tags(
    *,
    title: str = OG_TITLE,
    description: str = OG_DESCRIPTION,
    url: str = DEFAULT_SITE_URL,
    image: str | None = None,
    og_type: str = "website",
) -> str:
    image = image or (DEFAULT_SITE_URL + OG_IMAGE_PATH)
    t, d, u, i = _esc(title), _esc(description), _esc(url), _esc(image)
    return (
        f'\n    <meta name="description" content="{d}" />'
        f'\n    <meta property="og:site_name" content="{_esc(OG_SITE_NAME)}" />'
        f'\n    <meta property="og:locale" content="ar_AR" />'
        f'\n    <meta property="og:type" content="{_esc(og_type)}" />'
        f'\n    <meta property="og:title" content="{t}" />'
        f'\n    <meta property="og:description" content="{d}" />'
        f'\n    <meta property="og:url" content="{u}" />'
        f'\n    <meta property="og:image" content="{i}" />'
        f'\n    <meta property="og:image:secure_url" content="{i}" />'
        f'\n    <meta property="og:image:type" content="image/png" />'
        f'\n    <meta property="og:image:width" content="1200" />'
        f'\n    <meta property="og:image:height" content="630" />'
        f'\n    <meta property="og:image:alt" content="{t}" />'
        f'\n    <meta name="twitter:card" content="summary_large_image" />'
        f'\n    <meta name="twitter:title" content="{t}" />'
        f'\n    <meta name="twitter:description" content="{d}" />'
        f'\n    <meta name="twitter:image" content="{i}" />'
        f'\n    <link rel="canonical" href="{u}" />\n  '
    )


def render_index_with_meta(
    index_html: str,
    *,
    title: str = OG_TITLE,
    description: str = OG_DESCRIPTION,
    url: str = DEFAULT_SITE_URL,
    image: str | None = None,
    og_type: str = "website",
) -> str:
    """Return the SPA document with our OG/Twitter metadata in the <head>."""
    doc = _MANAGED_META.sub("", index_html)
    doc = _TITLE_RE.sub(f"<title>{_esc(title)}</title>", doc, count=1)
    tags = build_meta_tags(
        title=title, description=description, url=url, image=image, og_type=og_type
    )
    if "</head>" in doc:
        doc = doc.replace("</head>", f"{tags}</head>", 1)
    else:  # pragma: no cover - built index always has a head
        doc = tags + doc
    return doc


def read_index(dist_dir: Path) -> str:
    return (dist_dir / "index.html").read_text(encoding="utf-8")

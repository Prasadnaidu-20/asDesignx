"""Where customer mockups and print files are stored.

Only the "local" backend exists today: files go under settings.MEDIA_DIR and are served
by the /media static mount. To move to Cloudflare R2, add a backend here with the same
save()/delete() signatures (boto3 S3 client with endpoint_url=https://<account>.r2.cloudflarestorage.com)
and select it with STORAGE_BACKEND=r2. Keys are random, so public URLs are unguessable.
"""

import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


def _root() -> Path:
    path = Path(settings.MEDIA_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def media_root() -> Path:
    return _root()


def save(key: str, data: bytes, content_type: str) -> str:
    """Store bytes under `key` (e.g. "customizations/<uuid>/front-mockup.webp") and return its URL."""
    if settings.STORAGE_BACKEND != "local":
        raise RuntimeError(f"Unsupported STORAGE_BACKEND {settings.STORAGE_BACKEND!r}")
    path = _root() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return f"{settings.MEDIA_URL.rstrip('/')}/{key}"


def delete_prefix(prefix: str) -> None:
    """Best-effort removal of everything saved under `prefix` (used to clean up failed uploads)."""
    folder = _root() / prefix
    if not folder.is_dir():
        return
    for file in folder.iterdir():
        try:
            file.unlink()
        except OSError:
            logger.warning("Could not remove %s", file)
    try:
        folder.rmdir()
    except OSError:
        logger.warning("Could not remove %s", folder)

import logging
import re
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import user_design as design_crud
from app.models.user import User
from app.models.user_design import UserDesign
from app.services.errors import ServiceError

logger = logging.getLogger(__name__)

NUMBER_PATTERN = re.compile(r"^\d{1,3}$")


def _detect_image(data: bytes) -> tuple[str, str] | None:
    """Sniff the real type from the file header; the client's content type is not trusted."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


def upload_dir() -> Path:
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def image_path(design: UserDesign) -> Path:
    return upload_dir() / design.image_filename


def create_design(db: Session, user: User, name: str, number: str, data: bytes) -> UserDesign:
    name = name.strip()
    number = number.strip()
    if not 1 <= len(name) <= 40:
        raise ServiceError("Name must be 1-40 characters", 422)
    if not NUMBER_PATTERN.match(number):
        raise ServiceError("Number must be 1-3 digits", 422)
    if not data:
        raise ServiceError("Design image is required", 422)
    if len(data) > settings.MAX_UPLOAD_BYTES:
        limit_mb = settings.MAX_UPLOAD_BYTES // (1024 * 1024)
        raise ServiceError(f"Image must be {limit_mb} MB or smaller", 413)

    kind = _detect_image(data)
    if kind is None:
        raise ServiceError("Design must be a PNG, JPEG or WebP image", 415)
    content_type, ext = kind

    filename = f"{uuid.uuid4().hex}{ext}"
    path = upload_dir() / filename
    path.write_bytes(data)

    design = UserDesign(
        user_id=user.id,
        name=name,
        number=number,
        image_filename=filename,
        content_type=content_type,
    )
    try:
        return design_crud.create(db, design)
    except Exception:
        path.unlink(missing_ok=True)  # don't leave an orphaned file if the insert fails
        raise


def delete_design(db: Session, design: UserDesign) -> None:
    path = image_path(design)
    design_crud.delete(db, design)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Could not remove design image %s", path)

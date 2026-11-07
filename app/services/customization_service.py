import json
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import customization as customization_crud
from app.models.customization import Customization
from app.models.product import Product
from app.models.user import User
from app.services import storage
from app.services.errors import ServiceError

VIEWS = ("front", "back")


def _image_kind(data: bytes) -> tuple[str, str] | None:
    """Sniff the real type from the header; the client's content type is not trusted."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


def _check_size(data: bytes, label: str) -> None:
    if not data:
        raise ServiceError(f"{label} is empty", 422)
    if len(data) > settings.MAX_CUSTOMIZATION_BYTES:
        limit_mb = settings.MAX_CUSTOMIZATION_BYTES // (1024 * 1024)
        raise ServiceError(f"{label} must be {limit_mb} MB or smaller", 413)


def create_customization(
    db: Session,
    user: User,
    product_id: int,
    design: bytes,
    files: dict[str, tuple[bytes | None, bytes | None]],
) -> Customization:
    """`files` maps view -> (mockup bytes, print bytes); a view is either fully present or absent."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise ServiceError(f"Product {product_id} not found", 404)

    _check_size(design, "Design JSON")
    try:
        json.loads(design)
    except ValueError:
        raise ServiceError("Design must be valid JSON", 422) from None

    present = {}
    for view in VIEWS:
        mockup, print_file = files.get(view, (None, None))
        if not mockup and not print_file:
            continue
        if not mockup or not print_file:
            raise ServiceError(f"The {view} view needs both a mockup and a print file", 422)
        _check_size(mockup, f"{view.title()} mockup")
        _check_size(print_file, f"{view.title()} print file")
        mockup_kind = _image_kind(mockup)
        if mockup_kind is None:
            raise ServiceError(f"{view.title()} mockup must be a WebP or PNG image", 415)
        if _image_kind(print_file) != ("image/png", ".png"):
            raise ServiceError(f"{view.title()} print file must be a PNG image", 415)
        present[view] = (mockup, mockup_kind, print_file)
    if not present:
        raise ServiceError("Design at least one side of the shirt", 422)

    prefix = f"customizations/{uuid.uuid4().hex}"
    try:
        views = {}
        for view, (mockup, (mockup_type, mockup_ext), print_file) in present.items():
            views[view] = {
                "mockup_url": storage.save(f"{prefix}/{view}-mockup{mockup_ext}", mockup, mockup_type),
                "print_url": storage.save(f"{prefix}/{view}-print.png", print_file, "image/png"),
            }
        design_url = storage.save(f"{prefix}/design.json", design, "application/json")
        return customization_crud.create(
            db,
            Customization(user_id=user.id, product_id=product_id, views=views, design_url=design_url),
        )
    except Exception:
        storage.delete_prefix(prefix)  # don't leave orphaned files if anything fails
        raise

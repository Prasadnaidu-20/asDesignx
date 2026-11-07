from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.schema.customization import CustomizationRead
from app.services import customization_service

router = APIRouter(prefix="/customizations", tags=["customizations"])


async def _read(file: UploadFile | None) -> bytes | None:
    # Read one byte past the limit so oversized files are rejected without reading them whole.
    return await file.read(settings.MAX_CUSTOMIZATION_BYTES + 1) if file else None


@router.post("", response_model=CustomizationRead, status_code=status.HTTP_201_CREATED)
async def upload_customization(
    db: DbSession,
    user: CurrentUser,
    product_id: Annotated[int, Form()],
    design: Annotated[UploadFile, File()],
    front_mockup: Annotated[UploadFile | None, File()] = None,
    front_print: Annotated[UploadFile | None, File()] = None,
    back_mockup: Annotated[UploadFile | None, File()] = None,
    back_print: Annotated[UploadFile | None, File()] = None,
):
    files = {
        "front": (await _read(front_mockup), await _read(front_print)),
        "back": (await _read(back_mockup), await _read(back_print)),
    }
    return customization_service.create_customization(db, user, product_id, await _read(design), files)

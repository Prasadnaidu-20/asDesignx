from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.crud import user_design as design_crud
from app.models.user import User
from app.models.user_design import UserDesign
from app.schema.user_design import UserDesignRead
from app.services import design_service

router = APIRouter(prefix="/my-designs", tags=["my-designs"])


def _get_owned(db: DbSession, design_id: int, user: User) -> UserDesign:
    design = design_crud.get(db, design_id)
    # Same 404 for "missing" and "someone else's" to avoid leaking design IDs.
    if design is None or (design.user_id != user.id and not user.is_admin):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found")
    return design


@router.post("", response_model=UserDesignRead, status_code=status.HTTP_201_CREATED)
async def upload_design(
    db: DbSession,
    user: CurrentUser,
    image: Annotated[UploadFile, File()],
    name: Annotated[str, Form(max_length=40)],
    number: Annotated[str, Form(max_length=3)],
):
    # Read one byte past the limit so oversized files are rejected without reading them whole.
    data = await image.read(settings.MAX_UPLOAD_BYTES + 1)
    return design_service.create_design(db, user, name, number, data)


@router.get("", response_model=list[UserDesignRead])
def list_my_designs(
    db: DbSession,
    user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    return design_crud.list_for_user(db, user.id, skip, limit)


@router.get("/{design_id}/image")
def get_design_image(design_id: int, db: DbSession, user: CurrentUser):
    design = _get_owned(db, design_id, user)
    path = design_service.image_path(design)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design image missing")
    return FileResponse(path, media_type=design.content_type)


@router.delete("/{design_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_design(design_id: int, db: DbSession, user: CurrentUser):
    design = _get_owned(db, design_id, user)
    design_service.delete_design(db, design)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

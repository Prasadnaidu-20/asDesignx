from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DbSession
from app.schema.user import Token, UserCreate, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: DbSession):
    return auth_service.register(db, data)


@router.post("/login", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    # OAuth2 form uses "username" for the email so Swagger's Authorize button works.
    return Token(access_token=auth_service.login(db, form.username, form.password))


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser):
    return user

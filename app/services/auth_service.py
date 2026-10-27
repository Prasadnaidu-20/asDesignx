from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.crud import user as user_crud
from app.models.user import User
from app.schema.user import UserCreate
from app.services.errors import ServiceError


def register(db: Session, data: UserCreate) -> User:
    if user_crud.get_by_email(db, data.email):
        raise ServiceError("Email already registered", 409)
    return user_crud.create(db, data)


def login(db: Session, email: str, password: str) -> str:
    user = user_crud.get_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise ServiceError("Incorrect email or password", 401)
    if not user.is_active:
        raise ServiceError("Account is disabled", 403)
    return create_access_token(user.id)

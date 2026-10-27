from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user_design import UserDesign


def get(db: Session, design_id: int) -> UserDesign | None:
    return db.get(UserDesign, design_id)


def list_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[UserDesign]:
    stmt = (
        select(UserDesign)
        .where(UserDesign.user_id == user_id)
        .order_by(UserDesign.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def create(db: Session, design: UserDesign) -> UserDesign:
    db.add(design)
    db.commit()
    return design


def delete(db: Session, design: UserDesign) -> None:
    db.delete(design)
    db.commit()

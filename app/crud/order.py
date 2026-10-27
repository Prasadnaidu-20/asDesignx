from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order


def get(db: Session, order_id: int) -> Order | None:
    return db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )


def list_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[Order]:
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user_id)
        .order_by(Order.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt))

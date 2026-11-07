from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customization import Customization
from app.models.order import OrderItem


def get(db: Session, customization_id: int) -> Customization | None:
    return db.get(Customization, customization_id)


def is_attached(db: Session, customization_id: int) -> bool:
    return db.scalar(select(OrderItem.id).where(OrderItem.customization_id == customization_id)) is not None


def create(db: Session, customization: Customization) -> Customization:
    db.add(customization)
    db.commit()
    return customization

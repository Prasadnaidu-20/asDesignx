from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schema.product import ProductCreate, ProductUpdate


def get(db: Session, product_id: int) -> Product | None:
    return db.get(Product, product_id)


def list_active(db: Session, skip: int = 0, limit: int = 50) -> list[Product]:
    stmt = select(Product).where(Product.is_active).offset(skip).limit(limit)
    return list(db.scalars(stmt))


def create(db: Session, data: ProductCreate) -> Product:
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    return product


def update(db: Session, product: Product, data: ProductUpdate) -> Product:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    return product


def delete(db: Session, product: Product) -> None:
    product.is_active = False  # soft delete keeps order history intact
    db.commit()

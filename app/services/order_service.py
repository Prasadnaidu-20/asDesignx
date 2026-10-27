from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.crud import order as order_crud
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schema.order import OrderCreate
from app.services.errors import ServiceError


def place_order(db: Session, user: User, data: OrderCreate) -> Order:
    # Merge duplicate lines so each product is validated and decremented once.
    quantities: dict[int, int] = {}
    jerseys: dict[int, list[dict]] = {}
    for line in data.items:
        quantities[line.product_id] = quantities.get(line.product_id, 0) + line.quantity
        if line.jerseys is not None:
            jerseys.setdefault(line.product_id, []).extend(j.model_dump() for j in line.jerseys)

    products = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.id.in_(quantities)))
    }

    order = Order(user_id=user.id)
    total = Decimal("0")
    for product_id, qty in quantities.items():
        product = products.get(product_id)
        if product is None or not product.is_active:
            raise ServiceError(f"Product {product_id} not found", 404)

        # Each jersey is printed individually, so names/numbers must cover every unit.
        product_jerseys = jerseys.get(product_id)
        if product.is_jersey:
            if product_jerseys is None or len(product_jerseys) != qty:
                raise ServiceError(
                    f"'{product.name}' needs a name and jersey number for each of the {qty} jerseys", 422
                )
        elif product_jerseys:
            raise ServiceError(f"'{product.name}' does not take jersey names or numbers", 422)

        # Atomic conditional decrement guards against overselling under concurrency.
        result = db.execute(
            update(Product)
            .where(Product.id == product_id, Product.stock >= qty)
            .values(stock=Product.stock - qty)
        )
        if result.rowcount == 0:
            db.rollback()
            raise ServiceError(f"Insufficient stock for '{product.name}'", 409)

        order.items.append(
            OrderItem(
                product_id=product_id,
                quantity=qty,
                unit_price=product.price,
                jerseys=product_jerseys if product.is_jersey else None,
            )
        )
        total += product.price * qty

    order.total = total
    db.add(order)
    db.commit()
    return order_crud.get(db, order.id)

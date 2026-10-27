from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.crud import order as order_crud
from app.schema.order import OrderCreate, OrderRead
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(data: OrderCreate, db: DbSession, user: CurrentUser):
    return order_service.place_order(db, user, data)


@router.get("", response_model=list[OrderRead])
def my_orders(
    db: DbSession,
    user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    return order_crud.list_for_user(db, user.id, skip, limit)


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: DbSession, user: CurrentUser):
    order = order_crud.get(db, order_id)
    # Same 404 for "missing" and "someone else's" to avoid leaking order IDs.
    if order is None or (order.user_id != user.id and not user.is_admin):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order

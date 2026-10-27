from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, DbSession
from app.crud import product as product_crud
from app.schema.product import ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(
    db: DbSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    return product_crud.list_active(db, skip, limit)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession):
    product = product_crud.get(db, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DbSession, _: CurrentAdmin):
    return product_crud.create(db, data)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, data: ProductUpdate, db: DbSession, _: CurrentAdmin):
    product = product_crud.get(db, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product_crud.update(db, product, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession, _: CurrentAdmin):
    product = product_crud.get(db, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    product_crud.delete(db, product)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

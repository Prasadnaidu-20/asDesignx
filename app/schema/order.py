from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class JerseyEntry(BaseModel):
    # Same rules as personalised uploads (see design_service): 1-40 char name, 1-3 digit number.
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    number: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{1,3}$")]


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=1000)
    # Required (one per unit) for jersey designs; must be omitted for everything else.
    jerseys: list[JerseyEntry] | None = None


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    quantity: int
    unit_price: Decimal
    jerseys: list[JerseyEntry] | None = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    total: Decimal
    created_at: datetime
    items: list[OrderItemRead]

    @field_validator("created_at")
    @classmethod
    def assume_utc(cls, value: datetime) -> datetime:
        # SQLite drops tzinfo on read; we always store UTC, so re-attach it.
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

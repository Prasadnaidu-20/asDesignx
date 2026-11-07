"""add shirt customizations

Revision ID: b5d81c3e6a24
Revises: a7c4e2f91b30
Create Date: 2026-11-07 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b5d81c3e6a24"
down_revision: Union[str, Sequence[str], None] = "a7c4e2f91b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("views", sa.JSON(), nullable=False),
        sa.Column("design_url", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customizations_user_id"), "customizations", ["user_id"], unique=False)
    with op.batch_alter_table("order_items") as batch_op:
        batch_op.add_column(sa.Column("customization_id", sa.Integer(), nullable=True))
        batch_op.create_unique_constraint("uq_order_items_customization_id", ["customization_id"])
        batch_op.create_foreign_key(
            "fk_order_items_customization_id", "customizations", ["customization_id"], ["id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("order_items") as batch_op:
        batch_op.drop_constraint("fk_order_items_customization_id", type_="foreignkey")
        batch_op.drop_constraint("uq_order_items_customization_id", type_="unique")
        batch_op.drop_column("customization_id")
    op.drop_index(op.f("ix_customizations_user_id"), table_name="customizations")
    op.drop_table("customizations")

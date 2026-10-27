"""add jersey personalisation

Revision ID: a7c4e2f91b30
Revises: 763bf595f59a
Create Date: 2026-10-27 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c4e2f91b30'
down_revision: Union[str, Sequence[str], None] = '763bf595f59a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_jersey', sa.Boolean(), server_default='0', nullable=False))

    with op.batch_alter_table('order_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('jerseys', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('order_items', schema=None) as batch_op:
        batch_op.drop_column('jerseys')

    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_column('is_jersey')

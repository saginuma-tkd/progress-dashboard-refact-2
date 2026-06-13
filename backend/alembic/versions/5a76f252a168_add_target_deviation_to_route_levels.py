"""add target_deviation to route_levels

Revision ID: 5a76f252a168
Revises: 238a2cd07d13
Create Date: 2026-06-11 21:51:35.870240

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '5a76f252a168'
down_revision: Union[str, None] = '238a2cd07d13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    
    if 'route_levels' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('route_levels')]
        if 'target_deviation' not in columns:
            with op.batch_alter_table('route_levels', schema=None) as batch_op:
                batch_op.add_column(sa.Column('target_deviation', sa.Float(), nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    if 'route_levels' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('route_levels')]
        if 'target_deviation' in columns:
            with op.batch_alter_table('route_levels', schema=None) as batch_op:
                batch_op.drop_column('target_deviation')
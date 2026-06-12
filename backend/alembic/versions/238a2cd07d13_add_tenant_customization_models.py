"""add target_deviation to route_levels

Revision ID: 5a76f252a168
Revises: 238a2cd07d13
Create Date: (元の日付のままでOK)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect # 🌟 インスペクターを追加


# revision identifiers, used by Alembic.
revision: str = '5a76f252a168'
down_revision: Union[str, None] = '238a2cd07d13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 🌟 カラムが既に存在するかチェックして、無い場合だけ追加する
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # route_levelsが存在する場合のみカラムチェックを行う
    if 'route_levels' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('route_levels')]
        if 'target_deviation' not in columns:
            with op.batch_alter_table('route_levels', schema=None) as batch_op:
                batch_op.add_column(sa.Column('target_deviation', sa.Float(), nullable=True))


def downgrade() -> None:
    # 🌟 ロールバック時はカラムが存在すれば消す
    conn = op.get_bind()
    inspector = inspect(conn)
    if 'route_levels' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('route_levels')]
        if 'target_deviation' in columns:
            with op.batch_alter_table('route_levels', schema=None) as batch_op:
                batch_op.drop_column('target_deviation')
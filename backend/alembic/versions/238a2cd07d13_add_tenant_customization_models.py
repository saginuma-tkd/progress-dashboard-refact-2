"""add tenant customization models

Revision ID: 238a2cd07d13
Revises: befc911f79af
Create Date: 2026-06-11 15:29:26.248904

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '238a2cd07d13'
down_revision: Union[str, None] = 'befc911f79af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 🌟 本番環境にはすでにテーブルが存在するため、全テーブルの作成命令を削除。
    # 代わりに、既存の route_levels テーブルに target_deviation カラムを追加する処理だけを実行します。
    op.add_column('route_levels', sa.Column('target_deviation', sa.Float(), nullable=True))


def downgrade() -> None:
    # 🌟 ロールバック時は追加したカラムを削除します
    op.drop_column('route_levels', 'target_deviation')
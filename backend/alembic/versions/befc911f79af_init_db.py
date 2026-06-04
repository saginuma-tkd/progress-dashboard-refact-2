"""safe_update_for_new_architecture

Revision ID: befc911f79af
Revises: 
Create Date: 2026-06-05 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'befc911f79af'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # === 1. 新規テーブルの作成 ===
    
    # 🌟 追加：一番最初に tenants テーブルを作成する！
    op.create_table('tenants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)
    op.create_index(op.f('ix_tenants_name'), 'tenants', ['name'], unique=True)

    # 次に schools テーブルを作成 (tenant_idを外部キーとして持つ)
    op.create_table('schools',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'name', name='_tenant_school_name_uc')
    )
    op.create_index(op.f('ix_schools_id'), 'schools', ['id'], unique=False)


    # === 2. 既存テーブルへの安全なカラム追加 ===
    # （※既存データを壊さないよう、すべて nullable=True または server_default を設定しています）

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('school_id', sa.Integer(), sa.ForeignKey('schools.id', ondelete='SET NULL'), nullable=True))

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('school_id', sa.Integer(), sa.ForeignKey('schools.id', ondelete='SET NULL'), nullable=True))
        batch_op.add_column(sa.Column('shared_memo', sa.String(), nullable=True))

    with op.batch_alter_table('master_textbooks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('school_id', sa.Integer(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=True))

    with op.batch_alter_table('bulk_presets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('school_id', sa.Integer(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=True))

    with op.batch_alter_table('teaching_materials', schema=None) as batch_op:
        batch_op.add_column(sa.Column('school_id', sa.Integer(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=True))
        batch_op.add_column(sa.Column('s3_key', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('file_size', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('original_filename', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('category', sa.String(), server_default='material', nullable=False))
        batch_op.add_column(sa.Column('academic_year', sa.Integer(), nullable=True))

    with op.batch_alter_table('root_tables', schema=None) as batch_op:
        batch_op.add_column(sa.Column('s3_key', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('file_size', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('original_filename', sa.String(), nullable=True))

    with op.batch_alter_table('transfer_requests', schema=None) as batch_op:
        batch_op.add_column(sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=True))
        batch_op.add_column(sa.Column('instructor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(), server_default='pending', nullable=False))
        batch_op.add_column(sa.Column('approved_date', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('instructor_comment', sa.String(), nullable=True))

    with op.batch_alter_table('absence_reports', schema=None) as batch_op:
        batch_op.add_column(sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=True))
        batch_op.add_column(sa.Column('instructor_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True))
        batch_op.add_column(sa.Column('absence_date', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(), server_default='pending', nullable=False))

def downgrade() -> None:
    pass
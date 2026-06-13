"""add tenant customization models

Revision ID: 238a2cd07d13
Revises: befc911f79af
Create Date: 2026-06-11 15:29:26.248904

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '238a2cd07d13'
down_revision: Union[str, None] = 'befc911f79af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'tenants' not in existing_tables:
        op.create_table('tenants',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)
        op.create_index(op.f('ix_tenants_name'), 'tenants', ['name'], unique=True)

    if 'schools' not in existing_tables:
        op.create_table('schools',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'name', name='_tenant_school_name_uc')
        )
        op.create_index(op.f('ix_schools_id'), 'schools', ['id'], unique=False)

    if 'subjects' not in existing_tables:
        op.create_table('subjects',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'name', name='_tenant_subject_name_uc')
        )
        op.create_index(op.f('ix_subjects_id'), 'subjects', ['id'], unique=False)

    if 'tenant_settings' not in existing_tables:
        op.create_table('tenant_settings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), nullable=False),
            sa.Column('duration_slope_formula', sa.Text(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id')
        )
        op.create_index(op.f('ix_tenant_settings_id'), 'tenant_settings', ['id'], unique=False)

    if 'route_levels' not in existing_tables:
        op.create_table('route_levels',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), nullable=False),
            sa.Column('level_name', sa.String(), nullable=False),
            sa.Column('sequence_order', sa.Integer(), nullable=False),
            sa.Column('graph_line_type', sa.String(), nullable=False),
            sa.Column('show_on_graph', sa.Boolean(), nullable=False),
            # ⚠️ ここには target_deviation は書きません（次のファイルで追加するため）
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_route_levels_id'), 'route_levels', ['id'], unique=False)

    if 'bulk_presets' not in existing_tables:
        op.create_table('bulk_presets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('subject', sa.String(), nullable=False),
            sa.Column('preset_name', sa.String(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), nullable=True),
            sa.Column('school_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('subject', 'preset_name', 'tenant_id', 'school_id', name='_subject_preset_scope_uc')
        )
        op.create_index(op.f('ix_bulk_presets_id'), 'bulk_presets', ['id'], unique=False)

def downgrade() -> None:
    pass
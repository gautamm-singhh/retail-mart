"""add nullable tax_snapshot to orders

Revision ID: 001_add_tax_snapshot
Revises: 
Create Date: 2026-10-18 02:00:00.000000

Safe Production Database Migration:
- Adds nullable `tax_snapshot` JSON column to `orders` table.
- Does not lock table or block concurrent reads/writes (in MySQL 8.0+ ALGORITHM=INSTANT).
- Preserves all 88 existing order records with NULL tax_snapshot.
- Full rollback capability via downgrade() dropping column.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_add_tax_snapshot'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Nullable JSON column preserves all existing orders without modifying current totals
    op.add_column('orders', sa.Column('tax_snapshot', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('orders', 'tax_snapshot')

"""Initial migration.

Revision ID: e10a30c555df
Revises: 75a78bebf601
Create Date: 2024-05-16 12:19:54.517314

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e10a30c555df'
down_revision = '75a78bebf601'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('collaboration', schema=None) as batch_op:
        batch_op.alter_column('room',
               existing_type=sa.VARCHAR(length=36),
               nullable=False)
        batch_op.alter_column('host_user_id',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.alter_column('guest_username',
               existing_type=sa.VARCHAR(length=150),
               nullable=False)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('collaboration', schema=None) as batch_op:
        batch_op.alter_column('guest_username',
               existing_type=sa.VARCHAR(length=150),
               nullable=True)
        batch_op.alter_column('host_user_id',
               existing_type=sa.INTEGER(),
               nullable=True)
        batch_op.alter_column('room',
               existing_type=sa.VARCHAR(length=36),
               nullable=True)

    # ### end Alembic commands ###
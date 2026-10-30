"""job queue (procrastinate)

Revision ID: b4e8d1a7c3f2
Revises: a9d4c7e2b6f1
Create Date: 2026-10-31 18:00:00.000000

Applies procrastinate's schema, frozen in `migrations/sql/` so this revision never changes meaning.
When procrastinate is upgraded, add a revision that runs its new files from
`procrastinate/sql/migrations/` (see `procrastinate schema --migrations-path`).
"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op
from sqlalchemy.util import await_only

# revision identifiers, used by Alembic.
revision: str = 'b4e8d1a7c3f2'
down_revision: Union[str, Sequence[str], None] = 'a9d4c7e2b6f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = Path(__file__).parent.parent / "sql" / "procrastinate_3_10_schema.sql"


def run_script(sql: str) -> None:
    """Run several statements at once. asyncpg refuses that through a prepared statement, but its
    own `execute` sends them as a simple query."""
    await_only(op.get_bind().connection.driver_connection.execute(sql))


def upgrade() -> None:
    """Upgrade schema."""
    run_script(SCHEMA.read_text())


def downgrade() -> None:
    """Downgrade schema."""
    run_script(
        """
        DROP TABLE IF EXISTS procrastinate_events, procrastinate_periodic_defers,
            procrastinate_jobs, procrastinate_workers CASCADE;
        DROP TYPE IF EXISTS procrastinate_job_to_defer_v1, procrastinate_job_event_type,
            procrastinate_job_status CASCADE;
        DO $$
        DECLARE fn record;
        BEGIN
            FOR fn IN SELECT oid::regprocedure AS sig FROM pg_proc WHERE proname LIKE 'procrastinate\\_%'
            LOOP
                EXECUTE 'DROP FUNCTION IF EXISTS ' || fn.sig || ' CASCADE';
            END LOOP;
        END $$;
        """
    )

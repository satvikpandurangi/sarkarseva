"""Lock down migration metadata, trigger lookup paths and extension placement.

Revision ID: 20261122_0006
Revises: 20261009_0005
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261122_0006"
down_revision: str | None = "20261009_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON public.alembic_version FROM PUBLIC")
    op.execute("""
        DO $$ DECLARE client_role text; BEGIN
            FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
                    EXECUTE format('REVOKE ALL ON public.alembic_version FROM %I', client_role);
                END IF;
            END LOOP;
        END $$;
    """)
    op.execute(
        "ALTER FUNCTION public.reject_published_version_mutation() "
        "SET search_path = pg_catalog, public"
    )
    op.execute(
        "ALTER FUNCTION public.reject_published_version_child_mutation() "
        "SET search_path = pg_catalog, public"
    )
    op.execute("CREATE SCHEMA IF NOT EXISTS extensions")
    op.execute("ALTER EXTENSION vector SET SCHEMA extensions")


def downgrade() -> None:
    # Preserve RLS on migration metadata even when removing this hardening revision.
    op.execute("ALTER EXTENSION vector SET SCHEMA public")
    op.execute("ALTER FUNCTION public.reject_published_version_mutation() RESET search_path")
    op.execute("ALTER FUNCTION public.reject_published_version_child_mutation() RESET search_path")

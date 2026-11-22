BEGIN;

-- Running upgrade 20261009_0005 -> 20261122_0006

ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.alembic_version FROM PUBLIC;

DO $$ DECLARE client_role text; BEGIN
            FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
                    EXECUTE format('REVOKE ALL ON public.alembic_version FROM %I', client_role);
                END IF;
            END LOOP;
        END $$;;

ALTER FUNCTION public.reject_published_version_mutation() SET search_path = pg_catalog, public;

ALTER FUNCTION public.reject_published_version_child_mutation() SET search_path = pg_catalog, public;

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION vector SET SCHEMA extensions;

UPDATE alembic_version SET version_num='20261122_0006' WHERE alembic_version.version_num = '20261009_0005';

COMMIT;

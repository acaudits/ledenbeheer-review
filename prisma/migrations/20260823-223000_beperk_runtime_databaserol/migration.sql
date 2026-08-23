-- Rechtenrol voor de draaiende applicatie.
-- Deze rol kan niet rechtstreeks inloggen en bevat geen wachtwoord.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname =
      'asbestcrm_runtime_access'
  ) THEN
    CREATE ROLE
      asbestcrm_runtime_access
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END

$$;

GRANT CONNECT
ON DATABASE postgres
TO asbestcrm_runtime_access;

GRANT USAGE
ON SCHEMA public
TO asbestcrm_runtime_access;

REVOKE CREATE
ON SCHEMA public
FROM asbestcrm_runtime_access;

REVOKE ALL
ON TABLE public."_prisma_migrations"
FROM asbestcrm_runtime_access;

-- Beperk de toegang tot bestaande CRM-tabellen.
DO $$
DECLARE
  tabel_record record;
BEGIN
  FOR tabel_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <>
        '_prisma_migrations'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO asbestcrm_runtime_access',
      tabel_record.tablename
    );

    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tabel_record.tablename
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename =
          tabel_record.tablename
        AND policyname =
          'asbestcrm_runtime_toegang'
    ) THEN
      EXECUTE format(
        'CREATE POLICY asbestcrm_runtime_toegang ON public.%I FOR ALL TO asbestcrm_runtime_access USING (true) WITH CHECK (true)',
        tabel_record.tablename
      );
    END IF;
  END LOOP;
END

$$;

-- Nodig voor tabellen met automatische numerieke ID's.
DO $$
DECLARE
  sequence_record record;
BEGIN
  FOR sequence_record IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE public.%I TO asbestcrm_runtime_access',
      sequence_record.sequencename
    );
  END LOOP;
END

$$;

/*
 * De Next.js/Prisma-backend maakt verbinding als asbestcrm_runtime.
 * RLS blijft ingeschakeld.
 *
 * Alleen de dedicated backendrol krijgt:
 * - SELECT voor de beveiligde beheerpagina;
 * - INSERT en UPDATE voor de publieke loggingroute;
 * - toegang tot de SERIAL-sequence.
 *
 * DELETE wordt niet toegekend.
 * anon en authenticated blijven zonder tabelrechten.
 */

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'asbestcrm_runtime'
  ) THEN
    RAISE EXCEPTION
      'Vereiste databaserol asbestcrm_runtime bestaat niet';
  END IF;
END

$$;

GRANT USAGE
ON SCHEMA public
TO asbestcrm_runtime;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.laattijdige_formulier_sessies
TO asbestcrm_runtime;

GRANT USAGE, SELECT
ON SEQUENCE public.laattijdige_formulier_sessies_id_seq
TO asbestcrm_runtime;

CREATE POLICY "formulierlogging_runtime_select"
ON public.laattijdige_formulier_sessies
FOR SELECT
TO asbestcrm_runtime
USING (true);

CREATE POLICY "formulierlogging_runtime_insert"
ON public.laattijdige_formulier_sessies
FOR INSERT
TO asbestcrm_runtime
WITH CHECK (true);

CREATE POLICY "formulierlogging_runtime_update"
ON public.laattijdige_formulier_sessies
FOR UPDATE
TO asbestcrm_runtime
USING (true)
WITH CHECK (true);

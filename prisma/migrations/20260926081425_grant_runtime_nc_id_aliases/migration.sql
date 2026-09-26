GRANT SELECT
ON TABLE "non_conformiteit_nc_id_aliases"
TO "asbestcrm_runtime";

CREATE POLICY "non_conformiteit_nc_id_aliases_runtime_select"
ON "non_conformiteit_nc_id_aliases"
FOR SELECT
TO "asbestcrm_runtime"
USING (TRUE);

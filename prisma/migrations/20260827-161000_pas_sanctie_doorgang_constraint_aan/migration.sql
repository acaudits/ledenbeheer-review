ALTER TABLE "opvolging_sancties"
DROP CONSTRAINT "opvolging_sancties_categorie_datums_check";

ALTER TABLE "opvolging_sancties"
ADD CONSTRAINT "opvolging_sancties_categorie_datums_check"
CHECK (
  (
    "nc_categorie" IN ('CAT_1', 'CAT_2')
    AND (
      (
        "sanctie_doorgezet" = TRUE
        AND "sanctie_begindatum" IS NOT NULL
        AND "sanctie_einddatum" IS NOT NULL
        AND NULLIF(
          BTRIM(
            COALESCE(
              "reden_niet_doorzetten",
              ''
            )
          ),
          ''
        ) IS NULL
      )
      OR
      (
        "sanctie_doorgezet" = FALSE
        AND "sanctie_begindatum" IS NULL
        AND "sanctie_einddatum" IS NULL
        AND NULLIF(
          BTRIM(
            COALESCE(
              "reden_niet_doorzetten",
              ''
            )
          ),
          ''
        ) IS NOT NULL
      )
    )
  )
  OR
  "nc_categorie" IN ('CAT_0', 'CAT_3', 'CAT_4')
);

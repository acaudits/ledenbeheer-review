ALTER TABLE "opvolging_sancties"
ADD COLUMN "sanctie_doorgezet" BOOLEAN,
ADD COLUMN "reden_niet_doorzetten" TEXT;

UPDATE "opvolging_sancties"
SET "sanctie_doorgezet" = TRUE
WHERE "nc_categorie" IN ('CAT_1', 'CAT_2')
  AND (
    "sanctie_begindatum" IS NOT NULL
    OR "sanctie_einddatum" IS NOT NULL
  );

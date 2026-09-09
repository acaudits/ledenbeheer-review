ALTER TYPE "OpvolgingSanctieBron"
ADD VALUE IF NOT EXISTS 'HANDMATIG';

ALTER TYPE "OpvolgingSanctieBron"
ADD VALUE IF NOT EXISTS 'EXCEL_IMPORT';

ALTER TABLE "opvolging_sancties"
ALTER COLUMN "bron_id" DROP NOT NULL;

ALTER TABLE "opvolging_sancties"
ADD COLUMN "bron_bestandsnaam" VARCHAR(255),
ADD COLUMN "bron_excel_rij" INTEGER;

CREATE UNIQUE INDEX
"opvolging_sancties_bron_bestandsnaam_bron_excel_rij_key"
ON "opvolging_sancties"(
  "bron_bestandsnaam",
  "bron_excel_rij"
);

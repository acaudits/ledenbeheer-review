BEGIN;

ALTER TABLE "laattijdige_plaatsbezoeken"
  ADD COLUMN "busnummer" VARCHAR(50),
  ADD COLUMN "extra_adresdetails" TEXT,
  ADD COLUMN "gemeenschappelijke_delen" BOOLEAN NOT NULL DEFAULT false;

COMMIT;

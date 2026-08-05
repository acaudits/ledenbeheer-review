ALTER TABLE "na_finalisatie"
ADD COLUMN "bron_id" VARCHAR(255);

CREATE UNIQUE INDEX "na_finalisatie_bron_id_key"
ON "na_finalisatie"("bron_id");

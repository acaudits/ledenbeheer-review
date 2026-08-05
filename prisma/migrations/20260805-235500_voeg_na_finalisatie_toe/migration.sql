BEGIN;

CREATE TYPE "NaFinalisatiePlaatsbezoek" AS ENUM (
  'SPONTAAN',
  'TELEFONISCHE_AFSPRAAK',
  'EMAILAFSPRAAK',
  'KLACHT'
);

CREATE TYPE "NaFinalisatieTypeControle" AS ENUM (
  'GEHEEL',
  'DEELS',
  'ENKEL_OPENBARE_WEG'
);

CREATE TABLE "na_finalisatie" (
  "id" SERIAL NOT NULL,
  "auditeur" VARCHAR(255) NOT NULL,
  "naam_adi" VARCHAR(255),
  "geregistreerd" BOOLEAN NOT NULL DEFAULT false,
  "link_attest" VARCHAR(2000) NOT NULL,
  "attestnummer" VARCHAR(255) NOT NULL,
  "attest_id" UUID NOT NULL,
  "datum_na_finalisatie" DATE NOT NULL,
  "plaatsbezoek" "NaFinalisatiePlaatsbezoek" NOT NULL,
  "type_controle" "NaFinalisatieTypeControle" NOT NULL,
  "reden" TEXT,
  "opmerking" TEXT NOT NULL,
  "inspectielocatie" TEXT,
  "naam_bedrijf" VARCHAR(500),
  "persoons_id" VARCHAR(100),
  "bron_bestandsnaam" VARCHAR(255),
  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
  "verwijderd_op" TIMESTAMP(3),

  CONSTRAINT "na_finalisatie_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "na_finalisatie_verwijderd_op_idx"
  ON "na_finalisatie"("verwijderd_op");

CREATE INDEX "na_finalisatie_geregistreerd_idx"
  ON "na_finalisatie"("geregistreerd");

CREATE INDEX "na_finalisatie_datum_na_finalisatie_idx"
  ON "na_finalisatie"("datum_na_finalisatie");

CREATE INDEX "na_finalisatie_auditeur_idx"
  ON "na_finalisatie"("auditeur");

CREATE INDEX "na_finalisatie_persoons_id_idx"
  ON "na_finalisatie"("persoons_id");

CREATE INDEX "na_finalisatie_attest_id_idx"
  ON "na_finalisatie"("attest_id");

CREATE INDEX "na_finalisatie_attest_id_datum_na_finalisatie_plaatsbezoek_type_controle_idx"
  ON "na_finalisatie"(
    "attest_id",
    "datum_na_finalisatie",
    "plaatsbezoek",
    "type_controle"
  );

COMMIT;

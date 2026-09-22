CREATE TYPE "LaattijdigeFormulierStatus" AS ENUM (
  'GESTART',
  'BEZIG',
  'MISLUKT',
  'GESLAAGD',
  'ONVOLLEDIG'
);

CREATE TYPE "LaattijdigeFormulierStap" AS ENUM (
  'PERSOONSGEGEVENS',
  'ADRES',
  'PLANNING',
  'BEVESTIGING',
  'VERZENDEN',
  'VOLTOOID'
);

CREATE TYPE "LaattijdigeFormulierApparaat" AS ENUM (
  'MOBIEL',
  'TABLET',
  'DESKTOP',
  'ONBEKEND'
);

CREATE TABLE "laattijdige_formulier_sessies" (
  "id" SERIAL NOT NULL,
  "sessie_token" UUID NOT NULL,
  "inzending_token" UUID,
  "status" "LaattijdigeFormulierStatus" NOT NULL DEFAULT 'GESTART',
  "stap" "LaattijdigeFormulierStap" NOT NULL DEFAULT 'PERSOONSGEGEVENS',
  "apparaat" "LaattijdigeFormulierApparaat" NOT NULL DEFAULT 'ONBEKEND',
  "gestart_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "laatste_activiteit_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actieve_duur_seconden" INTEGER NOT NULL DEFAULT 0,
  "validatie_pogingen" INTEGER NOT NULL DEFAULT 0,
  "foutcode" VARCHAR(100),
  "foutmelding" VARCHAR(1000),
  "momentopname" JSONB,
  "ovam_link_geklikt" BOOLEAN NOT NULL DEFAULT FALSE,
  "ovam_link_klikken" INTEGER NOT NULL DEFAULT 0,
  "ovam_link_laatst_op" TIMESTAMP(3),
  "melding_id" INTEGER,
  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "laattijdige_formulier_sessies_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "laattijdige_formulier_sessies_sessie_token_key"
ON
  "laattijdige_formulier_sessies"("sessie_token");

CREATE UNIQUE INDEX
  "laattijdige_formulier_sessies_melding_id_key"
ON
  "laattijdige_formulier_sessies"("melding_id");

CREATE INDEX
  "laattijdige_formulier_sessies_status_gestart_op_idx"
ON
  "laattijdige_formulier_sessies"("status", "gestart_op" DESC);

CREATE INDEX
  "laattijdige_formulier_sessies_stap_idx"
ON
  "laattijdige_formulier_sessies"("stap");

CREATE INDEX
  "laattijdige_formulier_sessies_apparaat_idx"
ON
  "laattijdige_formulier_sessies"("apparaat");

CREATE INDEX
  "laattijdige_formulier_sessies_laatste_activiteit_op_idx"
ON
  "laattijdige_formulier_sessies"("laatste_activiteit_op");

CREATE INDEX
  "laattijdige_formulier_sessies_inzending_token_idx"
ON
  "laattijdige_formulier_sessies"("inzending_token");

CREATE INDEX
  "laattijdige_formulier_sessies_ovam_link_geklikt_idx"
ON
  "laattijdige_formulier_sessies"("ovam_link_geklikt");

ALTER TABLE
  "laattijdige_formulier_sessies"
ADD CONSTRAINT
  "laattijdige_formulier_sessies_melding_id_fkey"
FOREIGN KEY
  ("melding_id")
REFERENCES
  "laattijdige_plaatsbezoek_meldingen"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE
  "laattijdige_formulier_sessies"
ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'anon'
  ) THEN
    REVOKE ALL
    ON TABLE "laattijdige_formulier_sessies"
    FROM anon;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'authenticated'
  ) THEN
    REVOKE ALL
    ON TABLE "laattijdige_formulier_sessies"
    FROM authenticated;
  END IF;
END

$$;

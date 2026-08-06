BEGIN;

CREATE TABLE "laattijdige_plaatsbezoek_meldingen" (
  "id" SERIAL NOT NULL,
  "lid_id" INTEGER NOT NULL,
  "naam_adi" VARCHAR(255) NOT NULL,
  "bedrijfsnaam" VARCHAR(500) NOT NULL,
  "aangemeld_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "laattijdige_plaatsbezoek_meldingen_pkey"
    PRIMARY KEY ("id")
);

CREATE TABLE "laattijdige_plaatsbezoeken" (
  "id" SERIAL NOT NULL,
  "melding_id" INTEGER NOT NULL,
  "inspectielocatie" VARCHAR(500) NOT NULL,
  "geopunt_id" VARCHAR(100),
  "straat" VARCHAR(255),
  "huisnummer" VARCHAR(50),
  "postcode" VARCHAR(20),
  "gemeente" VARCHAR(255),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "datum_plaatsbezoek" DATE NOT NULL,
  "tijdstip" TIME(0) NOT NULL,
  "reden" TEXT NOT NULL,
  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "laattijdige_plaatsbezoeken_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX "laattijdige_plaatsbezoek_meldingen_lid_id_idx"
  ON "laattijdige_plaatsbezoek_meldingen"("lid_id");

CREATE INDEX "laattijdige_plaatsbezoek_meldingen_aangemeld_op_idx"
  ON "laattijdige_plaatsbezoek_meldingen"("aangemeld_op");

CREATE INDEX "laattijdige_plaatsbezoeken_melding_id_idx"
  ON "laattijdige_plaatsbezoeken"("melding_id");

CREATE INDEX "laattijdige_plaatsbezoeken_datum_plaatsbezoek_idx"
  ON "laattijdige_plaatsbezoeken"("datum_plaatsbezoek");

CREATE INDEX "laattijdige_plaatsbezoeken_aangemaakt_op_idx"
  ON "laattijdige_plaatsbezoeken"("aangemaakt_op");

ALTER TABLE "laattijdige_plaatsbezoek_meldingen"
  ADD CONSTRAINT "laattijdige_plaatsbezoek_meldingen_lid_id_fkey"
  FOREIGN KEY ("lid_id")
  REFERENCES "leden"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "laattijdige_plaatsbezoeken"
  ADD CONSTRAINT "laattijdige_plaatsbezoeken_melding_id_fkey"
  FOREIGN KEY ("melding_id")
  REFERENCES "laattijdige_plaatsbezoek_meldingen"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Rechtstreekse toegang via de publieke Supabase Data API blokkeren.
ALTER TABLE public.laattijdige_plaatsbezoek_meldingen
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.laattijdige_plaatsbezoeken
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.laattijdige_plaatsbezoek_meldingen,
  public.laattijdige_plaatsbezoeken
FROM anon, authenticated;

REVOKE ALL PRIVILEGES ON SEQUENCE
  public.laattijdige_plaatsbezoek_meldingen_id_seq,
  public.laattijdige_plaatsbezoeken_id_seq
FROM anon, authenticated;

COMMIT;

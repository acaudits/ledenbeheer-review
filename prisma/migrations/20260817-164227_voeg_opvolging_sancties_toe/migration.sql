-- Voeg de centrale opvolgings- en sanctielijst toe.
--
-- Gegevens kunnen worden overgenomen uit een deskcontrole,
-- terreincontrole of registratie na finalisatie.
-- De bronwaarden worden als momentopname opgeslagen.

CREATE TYPE "OpvolgingSanctieBron" AS ENUM (
  'DESKCONTROLE',
  'TERREINCONTROLE',
  'NA_FINALISATIE'
);

CREATE TYPE "OpvolgingNcCategorie" AS ENUM (
  'CAT_0',
  'CAT_1',
  'CAT_2',
  'CAT_3',
  'CAT_4'
);

CREATE TABLE "opvolging_sancties" (
  "id" SERIAL NOT NULL,

  "bron_type" "OpvolgingSanctieBron" NOT NULL,
  "bron_id" INTEGER NOT NULL,

  "auditeur" TEXT,
  "auditeur_gebruiker_id" INTEGER,
  "naam_adi" TEXT,

  "opvolging_afgerond" BOOLEAN NOT NULL DEFAULT false,
  "datum_afgerond" DATE,
  "afgerond_door_gebruiker_id" INTEGER,

  "link_attest" VARCHAR(2048),
  "attestnummer" VARCHAR(255),

  "reden" TEXT NOT NULL,

  "bedrijfsnaam" VARCHAR(500),
  "ovam_id" VARCHAR(255),

  "datum_vaststelling" DATE NOT NULL,
  "opmerkingen" TEXT,

  "nc_categorie" "OpvolgingNcCategorie" NOT NULL,

  "sanctie_begindatum" DATE,
  "sanctie_einddatum" DATE,

  "aangemaakt_door_id" INTEGER,

  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bijgewerkt_op" TIMESTAMP(3) NOT NULL,
  "verwijderd_op" TIMESTAMP(3),

  CONSTRAINT "opvolging_sancties_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "opvolging_sancties_afgerond_check"
    CHECK (
      (
        "opvolging_afgerond" = false
        AND "datum_afgerond" IS NULL
        AND "afgerond_door_gebruiker_id" IS NULL
      )
      OR
      (
        "opvolging_afgerond" = true
        AND "datum_afgerond" IS NOT NULL
        AND "afgerond_door_gebruiker_id" IS NOT NULL
      )
    ),

  CONSTRAINT "opvolging_sancties_periode_check"
    CHECK (
      "sanctie_einddatum" IS NULL
      OR (
        "sanctie_begindatum" IS NOT NULL
        AND "sanctie_einddatum" >= "sanctie_begindatum"
      )
    ),

  CONSTRAINT "opvolging_sancties_categorie_datums_check"
    CHECK (
      (
        "nc_categorie" IN ('CAT_1', 'CAT_2')
        AND "sanctie_begindatum" IS NOT NULL
        AND "sanctie_einddatum" IS NOT NULL
      )
      OR
      "nc_categorie" IN ('CAT_0', 'CAT_3', 'CAT_4')
    )
);

CREATE UNIQUE INDEX
  "opvolging_sancties_bron_type_bron_id_key"
ON "opvolging_sancties"(
  "bron_type",
  "bron_id"
);

CREATE INDEX
  "opvolging_sancties_auditeur_gebruiker_id_idx"
ON "opvolging_sancties"(
  "auditeur_gebruiker_id"
);

CREATE INDEX
  "opvolging_sancties_afgerond_door_gebruiker_id_idx"
ON "opvolging_sancties"(
  "afgerond_door_gebruiker_id"
);

CREATE INDEX
  "opvolging_sancties_aangemaakt_door_id_idx"
ON "opvolging_sancties"(
  "aangemaakt_door_id"
);

CREATE INDEX
  "opvolging_sancties_opvolging_afgerond_idx"
ON "opvolging_sancties"(
  "opvolging_afgerond"
);

CREATE INDEX
  "opvolging_sancties_nc_categorie_idx"
ON "opvolging_sancties"(
  "nc_categorie"
);

CREATE INDEX
  "opvolging_sancties_datum_vaststelling_idx"
ON "opvolging_sancties"(
  "datum_vaststelling"
);

CREATE INDEX
  "opvolging_sancties_sanctie_begindatum_idx"
ON "opvolging_sancties"(
  "sanctie_begindatum"
);

CREATE INDEX
  "opvolging_sancties_sanctie_einddatum_idx"
ON "opvolging_sancties"(
  "sanctie_einddatum"
);

CREATE INDEX
  "opvolging_sancties_verwijderd_op_idx"
ON "opvolging_sancties"(
  "verwijderd_op"
);

CREATE INDEX
  "opvolging_sancties_actieve_lijst_idx"
ON "opvolging_sancties"(
  "verwijderd_op",
  "datum_vaststelling" DESC,
  "id" DESC
);

ALTER TABLE "opvolging_sancties"
  ADD CONSTRAINT "opvolging_sancties_auditeur_gebruiker_id_fkey"
  FOREIGN KEY ("auditeur_gebruiker_id")
  REFERENCES "toegestane_gebruikers"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "opvolging_sancties"
  ADD CONSTRAINT "opvolging_sancties_afgerond_door_gebruiker_id_fkey"
  FOREIGN KEY ("afgerond_door_gebruiker_id")
  REFERENCES "toegestane_gebruikers"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "opvolging_sancties"
  ADD CONSTRAINT "opvolging_sancties_aangemaakt_door_id_fkey"
  FOREIGN KEY ("aangemaakt_door_id")
  REFERENCES "toegestane_gebruikers"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- De tabel bevindt zich in het via de Supabase API bereikbare
-- public-schema en wordt daarom standaard met RLS afgeschermd.
ALTER TABLE "opvolging_sancties"
  ENABLE ROW LEVEL SECURITY;

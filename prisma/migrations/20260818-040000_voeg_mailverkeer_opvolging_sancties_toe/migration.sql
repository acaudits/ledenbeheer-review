CREATE TABLE "opvolging_sanctie_mails" (
  "id" SERIAL NOT NULL,
  "opvolging_sanctie_id" INTEGER NOT NULL,
  "bestandsnaam" VARCHAR(255) NOT NULL,
  "bestandstype" VARCHAR(10) NOT NULL,
  "mime_type" VARCHAR(255) NOT NULL,
  "bestandsgrootte" INTEGER NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "afzender_naam" VARCHAR(500),
  "afzender_email" VARCHAR(320) NOT NULL,
  "ontvangers" JSONB NOT NULL,
  "cc" JSONB NOT NULL,
  "onderwerp" VARCHAR(1000),
  "bericht_id" VARCHAR(1000),
  "verzonden_op" TIMESTAMP(3) NOT NULL,
  "tekst_inhoud" TEXT NOT NULL,
  "bijlagen" JSONB NOT NULL,
  "intern_verzonden" BOOLEAN NOT NULL,
  "origineel" BYTEA NOT NULL,
  "aangemaakt_door_id" INTEGER,
  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "opvolging_sanctie_mails_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "opvolging_sanctie_mails_bestandstype_check"
    CHECK ("bestandstype" IN ('EML', 'MSG')),

  CONSTRAINT "opvolging_sanctie_mails_bestandsgrootte_check"
    CHECK (
      "bestandsgrootte" > 0
      AND "bestandsgrootte" <= 10485760
    )
);

CREATE UNIQUE INDEX
  "opvolging_sanctie_mails_opvolging_sanctie_id_sha256_key"
ON "opvolging_sanctie_mails"(
  "opvolging_sanctie_id",
  "sha256"
);

CREATE INDEX
  "opvolging_sanctie_mails_opvolging_sanctie_id_verzonden_op_id_idx"
ON "opvolging_sanctie_mails"(
  "opvolging_sanctie_id",
  "verzonden_op",
  "id"
);

CREATE INDEX
  "opvolging_sanctie_mails_aangemaakt_door_id_idx"
ON "opvolging_sanctie_mails"(
  "aangemaakt_door_id"
);

ALTER TABLE "opvolging_sanctie_mails"
  ADD CONSTRAINT "opvolging_sanctie_mails_opvolging_sanctie_id_fkey"
  FOREIGN KEY ("opvolging_sanctie_id")
  REFERENCES "opvolging_sancties"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "opvolging_sanctie_mails"
  ADD CONSTRAINT "opvolging_sanctie_mails_aangemaakt_door_id_fkey"
  FOREIGN KEY ("aangemaakt_door_id")
  REFERENCES "toegestane_gebruikers"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "opvolging_sanctie_mails"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
ON TABLE public.opvolging_sanctie_mails
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES
ON SEQUENCE public.opvolging_sanctie_mails_id_seq
FROM anon, authenticated, PUBLIC;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE
  "laattijdige_plaatsbezoek_meldingen"
ADD COLUMN
  "referentie" VARCHAR(35);

UPDATE
  "laattijdige_plaatsbezoek_meldingen"
SET
  "referentie" =
    'LP-' ||
    UPPER(
      REPLACE(
        gen_random_uuid()::text,
        '-',
        ''
      )
    )
WHERE
  "referentie" IS NULL;

ALTER TABLE
  "laattijdige_plaatsbezoek_meldingen"
ALTER COLUMN
  "referentie" SET NOT NULL;

CREATE UNIQUE INDEX
  "laattijdige_meldingen_referentie_key"
ON
  "laattijdige_plaatsbezoek_meldingen"
  ("referentie");

ALTER TABLE
  "laattijdige_plaatsbezoeken"
ADD COLUMN
  "adres_geverifieerd" BOOLEAN NOT NULL
  DEFAULT true;

ALTER TABLE
  "laattijdige_plaatsbezoek_meldingen"
ADD COLUMN
  "inzending_token" UUID;

UPDATE
  "laattijdige_plaatsbezoek_meldingen"
SET
  "inzending_token" =
    gen_random_uuid()
WHERE
  "inzending_token" IS NULL;

ALTER TABLE
  "laattijdige_plaatsbezoek_meldingen"
ALTER COLUMN
  "inzending_token" SET NOT NULL;

CREATE UNIQUE INDEX
  "laattijdige_meldingen_inzending_token_key"
ON
  "laattijdige_plaatsbezoek_meldingen"
  ("inzending_token");

CREATE TABLE
  "publieke_rate_limits" (
    "sleutel" VARCHAR(64) NOT NULL,
    "venster_start" TIMESTAMP(3) NOT NULL,
    "vervalt_op" TIMESTAMP(3) NOT NULL,
    "aantal" INTEGER NOT NULL,

    CONSTRAINT
      "publieke_rate_limits_pkey"
    PRIMARY KEY
      ("sleutel")
  );

CREATE INDEX
  "publieke_rate_limits_vervalt_op_idx"
ON
  "publieke_rate_limits"
  ("vervalt_op");

ALTER TABLE
  "publieke_rate_limits"
ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
ON TABLE
  "publieke_rate_limits"
FROM
  anon,
  authenticated;

COMMIT;

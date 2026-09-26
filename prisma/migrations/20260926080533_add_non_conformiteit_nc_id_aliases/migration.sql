CREATE TABLE "non_conformiteit_nc_id_aliases" (
  "alias_genormaliseerd" TEXT NOT NULL,
  "canonieke_nc_id" TEXT NOT NULL,
  "handmatig" BOOLEAN NOT NULL DEFAULT FALSE,
  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bijgewerkt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "non_conformiteit_nc_id_aliases_pkey"
    PRIMARY KEY ("alias_genormaliseerd")
);

CREATE INDEX "non_conformiteit_nc_id_aliases_canonieke_nc_id_idx"
  ON "non_conformiteit_nc_id_aliases" ("canonieke_nc_id");

ALTER TABLE "non_conformiteit_nc_id_aliases"
  ENABLE ROW LEVEL SECURITY;

WITH "bronwaarden" AS (
  SELECT
    BTRIM(COALESCE("nc_id"::text, '')) AS "rauw"
  FROM "deskcontrole_vaststellingen"

  UNION ALL

  SELECT
    BTRIM(COALESCE("nc_id"::text, '')) AS "rauw"
  FROM "terreincontrole_vaststellingen"
),
"genormaliseerd" AS (
  SELECT DISTINCT
    "rauw",
    LOWER("rauw") AS "alias_genormaliseerd",
    CASE
      WHEN RIGHT(LOWER("rauw"), 2) = '-2'
      THEN LEFT(LOWER("rauw"), LENGTH(LOWER("rauw")) - 2)
      ELSE LOWER("rauw")
    END AS "groepssleutel",
    RIGHT(LOWER("rauw"), 2) = '-2' AS "is_suffix_2"
  FROM "bronwaarden"
  WHERE "rauw" <> ''
),
"groepen" AS (
  SELECT
    "groepssleutel",
    COALESCE(
      MIN("rauw") FILTER (WHERE "is_suffix_2"),
      MIN("rauw")
    ) AS "canonieke_nc_id"
  FROM "genormaliseerd"
  WHERE "groepssleutel" <> ''
  GROUP BY "groepssleutel"
),
"koppelingen" AS (
  SELECT
    "genormaliseerd"."alias_genormaliseerd",
    "groepen"."canonieke_nc_id"
  FROM "genormaliseerd"
  INNER JOIN "groepen"
    ON "groepen"."groepssleutel" =
       "genormaliseerd"."groepssleutel"

  UNION

  SELECT
    "groepen"."groepssleutel" AS "alias_genormaliseerd",
    "groepen"."canonieke_nc_id"
  FROM "groepen"
)
INSERT INTO "non_conformiteit_nc_id_aliases" (
  "alias_genormaliseerd",
  "canonieke_nc_id"
)
SELECT DISTINCT ON ("alias_genormaliseerd")
  "alias_genormaliseerd",
  "canonieke_nc_id"
FROM "koppelingen"
WHERE
  "alias_genormaliseerd" <> ''
  AND "canonieke_nc_id" <> ''
ORDER BY
  "alias_genormaliseerd",
  "canonieke_nc_id"
ON CONFLICT ("alias_genormaliseerd")
DO UPDATE SET
  "canonieke_nc_id" = EXCLUDED."canonieke_nc_id",
  "bijgewerkt_op" = CURRENT_TIMESTAMP
WHERE
  "non_conformiteit_nc_id_aliases"."handmatig" = FALSE;

CREATE OR REPLACE FUNCTION
  "registreer_non_conformiteit_nc_id_alias"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  "rauwe_nc_id" TEXT;
  "genormaliseerde_nc_id" TEXT;
  "basis_nc_id" TEXT;
  "canonieke_nc_id" TEXT;
BEGIN
  "rauwe_nc_id" := BTRIM(COALESCE(NEW."nc_id"::text, ''));

  IF "rauwe_nc_id" = '' THEN
    RETURN NEW;
  END IF;

  "genormaliseerde_nc_id" := LOWER("rauwe_nc_id");

  IF RIGHT("genormaliseerde_nc_id", 2) = '-2' THEN
    "basis_nc_id" := LEFT(
      "genormaliseerde_nc_id",
      LENGTH("genormaliseerde_nc_id") - 2
    );

    INSERT INTO "non_conformiteit_nc_id_aliases" (
      "alias_genormaliseerd",
      "canonieke_nc_id"
    )
    VALUES (
      "genormaliseerde_nc_id",
      "rauwe_nc_id"
    )
    ON CONFLICT ("alias_genormaliseerd")
    DO UPDATE SET
      "canonieke_nc_id" = EXCLUDED."canonieke_nc_id",
      "bijgewerkt_op" = CURRENT_TIMESTAMP
    WHERE
      "non_conformiteit_nc_id_aliases"."handmatig" = FALSE;

    SELECT "alias"."canonieke_nc_id"
    INTO "canonieke_nc_id"
    FROM "non_conformiteit_nc_id_aliases" AS "alias"
    WHERE
      "alias"."alias_genormaliseerd" =
      "genormaliseerde_nc_id";

    IF "basis_nc_id" <> '' THEN
      INSERT INTO "non_conformiteit_nc_id_aliases" (
        "alias_genormaliseerd",
        "canonieke_nc_id"
      )
      VALUES (
        "basis_nc_id",
        COALESCE("canonieke_nc_id", "rauwe_nc_id")
      )
      ON CONFLICT ("alias_genormaliseerd")
      DO UPDATE SET
        "canonieke_nc_id" = EXCLUDED."canonieke_nc_id",
        "bijgewerkt_op" = CURRENT_TIMESTAMP
      WHERE
        "non_conformiteit_nc_id_aliases"."handmatig" = FALSE;
    END IF;
  ELSE
    SELECT "alias"."canonieke_nc_id"
    INTO "canonieke_nc_id"
    FROM "non_conformiteit_nc_id_aliases" AS "alias"
    WHERE
      "alias"."alias_genormaliseerd" =
      "genormaliseerde_nc_id" || '-2';

    INSERT INTO "non_conformiteit_nc_id_aliases" (
      "alias_genormaliseerd",
      "canonieke_nc_id"
    )
    VALUES (
      "genormaliseerde_nc_id",
      COALESCE("canonieke_nc_id", "rauwe_nc_id")
    )
    ON CONFLICT ("alias_genormaliseerd")
    DO UPDATE SET
      "canonieke_nc_id" = EXCLUDED."canonieke_nc_id",
      "bijgewerkt_op" = CURRENT_TIMESTAMP
    WHERE
      "non_conformiteit_nc_id_aliases"."handmatig" = FALSE;
  END IF;

  RETURN NEW;
END;

$$;

REVOKE ALL ON FUNCTION
  "registreer_non_conformiteit_nc_id_alias"()
FROM PUBLIC;

CREATE TRIGGER
  "deskcontrole_vaststellingen_nc_id_alias"
AFTER INSERT OR UPDATE OF "nc_id"
ON "deskcontrole_vaststellingen"
FOR EACH ROW
EXECUTE FUNCTION
  "registreer_non_conformiteit_nc_id_alias"();

CREATE TRIGGER
  "terreincontrole_vaststellingen_nc_id_alias"
AFTER INSERT OR UPDATE OF "nc_id"
ON "terreincontrole_vaststellingen"
FOR EACH ROW
EXECUTE FUNCTION
  "registreer_non_conformiteit_nc_id_alias"();

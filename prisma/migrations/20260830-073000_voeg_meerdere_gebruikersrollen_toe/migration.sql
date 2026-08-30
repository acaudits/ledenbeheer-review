ALTER TYPE "Gebruikersrol"
ADD VALUE IF NOT EXISTS 'INTERNE_AUDITEUR';

ALTER TYPE "Gebruikersrol"
ADD VALUE IF NOT EXISTS 'KLACHTENBEHANDELAAR';

ALTER TYPE "Gebruikersrol"
ADD VALUE IF NOT EXISTS 'BEGELEIDER';

ALTER TYPE "Gebruikersrol"
ADD VALUE IF NOT EXISTS 'HELPDESK';

ALTER TYPE "Gebruikersrol"
ADD VALUE IF NOT EXISTS 'FACTURATIE';

ALTER TABLE "toegestane_gebruikers"
ADD COLUMN "rollen" "Gebruikersrol"[] NOT NULL
DEFAULT ARRAY['AUDITEUR'::"Gebruikersrol"];

UPDATE "toegestane_gebruikers"
SET "rollen" = ARRAY["rol"];

ALTER TABLE "toegestane_gebruikers"
ADD CONSTRAINT "toegestane_gebruikers_rollen_niet_leeg"
CHECK (cardinality("rollen") > 0);

CREATE INDEX "toegestane_gebruikers_rollen_idx"
ON "toegestane_gebruikers"
USING GIN ("rollen");

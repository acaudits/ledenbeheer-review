CREATE TYPE "LidSoort" AS ENUM ('NIEUW_LID', 'OVERNAME');
CREATE TYPE "OvergekomenVan" AS ENUM ('COPRO', 'DNV');

ALTER TABLE "leden"
  ADD COLUMN "verzekering_verloopt_op" DATE,
  ADD COLUMN "praktijk_bijscholing_gevolgd" BOOLEAN,
  ADD COLUMN "bijscholing_2026_gevolgd" BOOLEAN,
  ADD COLUMN "lid_soort" "LidSoort",
  ADD COLUMN "begeleidingstraject" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "overgekomen_van" "OvergekomenVan",
  ADD COLUMN "aantal_attesten_andere_ci_2026" INTEGER,
  ADD COLUMN "controleverslagen_overgenomen" BOOLEAN,
  ADD COLUMN "officiele_klachten" BOOLEAN,
  ADD COLUMN "officiele_klachten_toelichting" TEXT;

ALTER TABLE "leden"
  ADD CONSTRAINT "leden_aantal_attesten_andere_ci_2026_check"
  CHECK (
    "aantal_attesten_andere_ci_2026" IS NULL
    OR "aantal_attesten_andere_ci_2026" >= 0
  );

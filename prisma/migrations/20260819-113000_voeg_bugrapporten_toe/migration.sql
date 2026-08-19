CREATE TYPE "BugRapportStatus" AS ENUM (
  'OPEN',
  'IN_BEHANDELING',
  'BEHANDELD',
  'AFGEWEZEN'
);

CREATE TABLE "bug_rapporten" (
  "id" SERIAL NOT NULL,
  "prioriteit" INTEGER NOT NULL,
  "webpagina" VARCHAR(2048) NOT NULL,
  "uitleg" TEXT NOT NULL,
  "status" "BugRapportStatus" NOT NULL DEFAULT 'OPEN',
  "gebruiker_id" INTEGER NOT NULL,
  "gebruiker_naam" VARCHAR(255) NOT NULL,
  "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bug_rapporten_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "bug_rapporten_prioriteit_check"
    CHECK ("prioriteit" BETWEEN 1 AND 3)
);

ALTER TABLE "bug_rapporten"
ADD CONSTRAINT "bug_rapporten_gebruiker_id_fkey"
FOREIGN KEY ("gebruiker_id")
REFERENCES "toegestane_gebruikers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE INDEX "bug_rapporten_status_idx"
ON "bug_rapporten"("status");

CREATE INDEX "bug_rapporten_prioriteit_idx"
ON "bug_rapporten"("prioriteit");

CREATE INDEX "bug_rapporten_gebruiker_id_idx"
ON "bug_rapporten"("gebruiker_id");

CREATE INDEX "bug_rapporten_aangemaakt_op_id_idx"
ON "bug_rapporten"("aangemaakt_op" DESC, "id" DESC);

ALTER TABLE "bug_rapporten"
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "bug_rapporten"
FROM anon, authenticated, PUBLIC;

REVOKE ALL ON SEQUENCE "bug_rapporten_id_seq"
FROM anon, authenticated, PUBLIC;

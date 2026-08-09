CREATE TABLE "push_abonnementen" (
    "id" SERIAL NOT NULL,
    "gebruiker_id" INTEGER NOT NULL,
    "endpoint" VARCHAR(2048) NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(500),
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_abonnementen_pkey"
      PRIMARY KEY ("id")
);

CREATE TABLE "push_verzendingen" (
    "id" SERIAL NOT NULL,
    "plaatsbezoek_id" INTEGER NOT NULL,
    "abonnement_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'WACHTEND',
    "pogingen" INTEGER NOT NULL DEFAULT 0,
    "verzonden_op" TIMESTAMP(3),
    "laatste_fout" TEXT,
    "aangemaakt_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_verzendingen_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "push_abonnementen_endpoint_key"
ON "push_abonnementen"("endpoint");

CREATE INDEX
  "push_abonnementen_gebruiker_id_idx"
ON "push_abonnementen"("gebruiker_id");

CREATE UNIQUE INDEX
  "push_verzendingen_plaatsbezoek_id_abonnement_id_key"
ON "push_verzendingen"(
  "plaatsbezoek_id",
  "abonnement_id"
);

CREATE INDEX
  "push_verzendingen_status_idx"
ON "push_verzendingen"("status");

CREATE INDEX
  "push_verzendingen_aangemaakt_op_idx"
ON "push_verzendingen"("aangemaakt_op");

ALTER TABLE "push_abonnementen"
ADD CONSTRAINT "push_abonnementen_gebruiker_id_fkey"
FOREIGN KEY ("gebruiker_id")
REFERENCES "toegestane_gebruikers"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "push_verzendingen"
ADD CONSTRAINT "push_verzendingen_plaatsbezoek_id_fkey"
FOREIGN KEY ("plaatsbezoek_id")
REFERENCES "laattijdige_plaatsbezoeken"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "push_verzendingen"
ADD CONSTRAINT "push_verzendingen_abonnement_id_fkey"
FOREIGN KEY ("abonnement_id")
REFERENCES "push_abonnementen"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.push_abonnementen
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_verzendingen
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
ON TABLE public.push_abonnementen
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.push_verzendingen
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON SEQUENCE public.push_abonnementen_id_seq
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON SEQUENCE public.push_verzendingen_id_seq
FROM anon, authenticated;

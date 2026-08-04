-- T13: tijdelijke exclusieve reserveringen voor plaatsbezoeken.

CREATE TABLE "terreincontrole_reserveringen" (
    "id" SERIAL NOT NULL,
    "attest_id" UUID NOT NULL,
    "gebruiker_id" INTEGER NOT NULL,
    "gereserveerd_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verloopt_op" TIMESTAMP(3) NOT NULL,
    "bijgewerkt_op" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terreincontrole_reserveringen_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
    "terreincontrole_reserveringen_attest_id_key"
ON "terreincontrole_reserveringen"("attest_id");

CREATE INDEX
    "terreincontrole_reserveringen_gebruiker_id_idx"
ON "terreincontrole_reserveringen"("gebruiker_id");

CREATE INDEX
    "terreincontrole_reserveringen_verloopt_op_idx"
ON "terreincontrole_reserveringen"("verloopt_op");

ALTER TABLE "terreincontrole_reserveringen"
ADD CONSTRAINT
    "terreincontrole_reserveringen_gebruiker_id_fkey"
FOREIGN KEY ("gebruiker_id")
REFERENCES "toegestane_gebruikers"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

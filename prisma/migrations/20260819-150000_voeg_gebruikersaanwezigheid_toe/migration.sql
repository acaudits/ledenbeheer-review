ALTER TABLE "toegestane_gebruikers"
ADD COLUMN "laatste_activiteit_op" TIMESTAMP(3),
ADD COLUMN "is_ingelogd" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "toegestane_gebruikers_laatste_activiteit_op_idx"
ON "toegestane_gebruikers"("laatste_activiteit_op");

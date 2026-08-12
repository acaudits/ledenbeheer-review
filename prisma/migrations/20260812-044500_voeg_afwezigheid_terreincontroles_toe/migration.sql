ALTER TABLE "terreincontroles"
ADD COLUMN "afwezig_op" TIMESTAMP(3),
ADD COLUMN "afwezig_reden" TEXT;

CREATE INDEX "terreincontroles_afwezig_lijst_idx"
ON "terreincontroles"(
  "verwijderd_op",
  "afwezig_op",
  "datum_plaatsbezoek" DESC,
  "id" DESC
);

CREATE INDEX "terreincontroles_afwezig_ovam_idx"
ON "terreincontroles"(
  "verwijderd_op",
  "afwezig_op",
  "ovam_id"
);

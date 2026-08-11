CREATE INDEX "terreincontroles_verwijderd_op_datum_plaatsbezoek_id_idx"
ON "terreincontroles"(
  "verwijderd_op",
  "datum_plaatsbezoek" DESC,
  "id" DESC
);

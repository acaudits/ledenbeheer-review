CREATE INDEX "na_finalisatie_verwijderd_op_datum_na_finalisatie_id_idx"
ON "na_finalisatie"(
  "verwijderd_op",
  "datum_na_finalisatie" DESC,
  "id" DESC
);

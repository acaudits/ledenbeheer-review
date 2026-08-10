CREATE INDEX "procescertificaten_verwijderd_op_naam_bedrijf_id_idx"
ON "procescertificaten"(
  "verwijderd_op",
  "naam_bedrijf",
  "id"
);

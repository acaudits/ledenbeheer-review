CREATE INDEX "terreincontrole_dossiers_verwijderd_op_datum_controle_id_idx"
ON "terreincontrole_dossiers"(
  "verwijderd_op",
  "datum_controle" DESC,
  "id" DESC
);

CREATE INDEX
  "deskcontroles_verwijderd_op_datum_controle_id_idx"
ON
  "deskcontroles"(
    "verwijderd_op",
    "datum_controle",
    "id"
  );

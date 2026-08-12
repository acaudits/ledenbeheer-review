CREATE INDEX "laattijdige_meldingen_aangemeld_op_id_idx"
ON "laattijdige_plaatsbezoek_meldingen"(
  "aangemeld_op" DESC,
  "id" DESC
);

CREATE INDEX "laattijdige_plaatsbezoeken_aangemaakt_op_id_idx"
ON "laattijdige_plaatsbezoeken"(
  "aangemaakt_op" DESC,
  "id" DESC
);

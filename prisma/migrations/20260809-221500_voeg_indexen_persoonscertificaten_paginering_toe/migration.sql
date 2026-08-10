CREATE INDEX "leden_verwijderd_op_naam_persoon_id_idx"
ON "leden"("verwijderd_op", "naam_persoon", "id");

CREATE INDEX "deskcontroles_lid_id_verwijderd_op_idx"
ON "deskcontroles"("lid_id", "verwijderd_op");

CREATE INDEX "terreincontrole_dossiers_lid_id_verwijderd_op_idx"
ON "terreincontrole_dossiers"("lid_id", "verwijderd_op");

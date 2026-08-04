-- De kolom uur_plaatsbezoek is gewijzigd van tekst naar PostgreSQL TIME.
-- De oude UU:MM-tekstcontrole keurt geldige TIME-waarden zoals
-- 09:30:00 onterecht af. Het datatype TIME valideert de uurwaarde zelf.

ALTER TABLE "terreincontroles"
DROP CONSTRAINT IF EXISTS "terreincontroles_uur_check";

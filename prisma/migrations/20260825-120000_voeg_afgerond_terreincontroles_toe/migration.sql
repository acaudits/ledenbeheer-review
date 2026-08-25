-- Voeg de status Afgerond toe aan ingeplande terreincontroles.
-- Bestaande en nieuwe records zijn standaard niet afgerond.
ALTER TABLE "terreincontroles"
  ADD COLUMN "afgerond" BOOLEAN NOT NULL DEFAULT false;

-- Houd ingeplande terreincontroles gescheiden van de bestaande
-- terreincontroledossiers in Opvolging/sancties.
ALTER TYPE "OpvolgingSanctieBron"
  ADD VALUE 'INGEPLANDE_TERREINCONTROLE';

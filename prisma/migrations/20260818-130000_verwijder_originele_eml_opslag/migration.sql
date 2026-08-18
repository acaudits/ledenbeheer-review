-- Bijlagen en originele EML-bytes worden niet langer opgeslagen.
ALTER TABLE "opvolging_sanctie_mails"
DROP COLUMN IF EXISTS "origineel";

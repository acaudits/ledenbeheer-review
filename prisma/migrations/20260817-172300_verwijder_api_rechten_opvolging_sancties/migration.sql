-- De webapp gebruikt uitsluitend de server-side Prisma-verbinding.
-- De Supabase API-rollen krijgen geen rechtstreekse toegang tot
-- opvolging_sancties of de bijbehorende ID-sequence.

REVOKE ALL PRIVILEGES
ON TABLE public.opvolging_sancties
FROM anon;

REVOKE ALL PRIVILEGES
ON TABLE public.opvolging_sancties
FROM authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.opvolging_sancties
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON SEQUENCE public.opvolging_sancties_id_seq
FROM anon;

REVOKE ALL PRIVILEGES
ON SEQUENCE public.opvolging_sancties_id_seq
FROM authenticated;

REVOKE ALL PRIVILEGES
ON SEQUENCE public.opvolging_sancties_id_seq
FROM PUBLIC;

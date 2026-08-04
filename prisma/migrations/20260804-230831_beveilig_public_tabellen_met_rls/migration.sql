BEGIN;

-- Deze toepassing benadert de database uitsluitend server-side via Prisma.
-- De Supabase Data API-rollen krijgen geen rechtstreekse tabeltoegang.
-- Er wordt bewust geen FORCE ROW LEVEL SECURITY gebruikt, zodat de
-- database-eigenaar en Prisma-migraties toegang behouden.

ALTER TABLE public.attest_persoon_statistieken
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attest_bedrijf_statistieken
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attest_correcties
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attest_statistiek_imports
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deskcontrole_vaststellingen
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deskcontroles
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meldingen
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditlogs
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terreincontrole_vaststellingen
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terreincontrole_dossiers
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leden
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toegestane_gebruikers
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procescertificaten
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terreincontrole_reserveringen
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terreincontroles
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.attest_persoon_statistieken,
  public.attest_bedrijf_statistieken,
  public.attest_correcties,
  public.attest_statistiek_imports,
  public.deskcontrole_vaststellingen,
  public.deskcontroles,
  public.meldingen,
  public.auditlogs,
  public.terreincontrole_vaststellingen,
  public.terreincontrole_dossiers,
  public.leden,
  public.toegestane_gebruikers,
  public.procescertificaten,
  public._prisma_migrations,
  public.terreincontrole_reserveringen,
  public.terreincontroles
FROM anon, authenticated;

-- Voorkomt ook rechtstreeks gebruik van publieke sequences via de Data API.
REVOKE ALL PRIVILEGES
  ON ALL SEQUENCES IN SCHEMA public
  FROM anon, authenticated;

COMMIT;

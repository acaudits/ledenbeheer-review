import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type AuditDatabase = Pick<
  Prisma.TransactionClient,
  "auditlog"
>;

type AuditGebruiker = {
  id: number;
  email: string;
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
};

type AuditlogInvoer = {
  actie: string;
  entiteit: string;
  entiteitId?: number | null;
  omschrijving?: string | null;
  oudeWaarde?: Prisma.InputJsonValue;
  nieuweWaarde?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

function bepaalGebruikerNaam(
  gebruiker: AuditGebruiker,
) {
  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    volledigeNaam ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

export async function schrijfAuditlog(
  database: AuditDatabase,
  gebruiker: AuditGebruiker,
  invoer: AuditlogInvoer,
) {
  await database.auditlog.create({
    data: {
      gebruikerId: gebruiker.id,
      gebruikerNaam:
        bepaalGebruikerNaam(
          gebruiker,
        ),
      gebruikerEmail:
        gebruiker.email,
      actie: invoer.actie,
      entiteit: invoer.entiteit,
      entiteitId:
        invoer.entiteitId ?? null,
      omschrijving:
        invoer.omschrijving ?? null,
      oudeWaarde:
        invoer.oudeWaarde,
      nieuweWaarde:
        invoer.nieuweWaarde,
      metadata: invoer.metadata,
    },
  });
}

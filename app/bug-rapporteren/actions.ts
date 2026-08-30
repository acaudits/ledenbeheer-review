"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisMachtiging } from "@/lib/auth";
import { schrijfAuditlog } from "@/lib/auditlog";
import { prisma } from "@/lib/prisma";

const STATUSSEN = [
  "OPEN",
  "IN_BEHANDELING",
  "BEHANDELD",
  "AFGEWEZEN",
] as const;

type BugStatus =
  (typeof STATUSSEN)[number];

function isBugStatus(
  waarde: string,
): waarde is BugStatus {
  return STATUSSEN.some(
    (status) => status === waarde,
  );
}

function gebruikersnaam(
  gebruiker: {
    voornaam?: string | null;
    achternaam?: string | null;
    naam?: string | null;
    email: string;
  },
) {
  return (
    [
      gebruiker.voornaam,
      gebruiker.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

function geldigeUrl(
  invoer: string,
): string | null {
  if (!invoer || invoer.length > 2048) {
    return null;
  }

  try {
    const url = new URL(invoer);

    return url.protocol === "https:" ||
      url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function leesInvoer(formData: FormData) {
  const prioriteit = Number(
    formData.get("prioriteit"),
  );

  const webpagina = geldigeUrl(
    String(
      formData.get("webpagina") ?? "",
    ).trim(),
  );

  const uitleg = String(
    formData.get("uitleg") ?? "",
  ).trim();

  const opmerkingen =
    String(
      formData.get("opmerkingen") ?? "",
    ).trim() || null;

  return {
    prioriteit,
    webpagina,
    uitleg,
    opmerkingen,
  };
}

function valideerInvoer(
  invoer: ReturnType<typeof leesInvoer>,
) {
  if (
    !Number.isInteger(invoer.prioriteit) ||
    invoer.prioriteit < 1 ||
    invoer.prioriteit > 3
  ) {
    return "prioriteit";
  }

  if (!invoer.webpagina) {
    return "webpagina";
  }

  if (
    invoer.uitleg.length < 5 ||
    invoer.uitleg.length > 10_000
  ) {
    return "uitleg";
  }

  if (
    invoer.opmerkingen &&
    invoer.opmerkingen.length > 10_000
  ) {
    return "opmerkingen";
  }

  return null;
}

export async function maakBugRapport(
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "CERTIFICATEN_BEKIJKEN",
    );

  const invoer = leesInvoer(formData);
  const fout = valideerInvoer(invoer);

  if (fout || !invoer.webpagina) {
    redirect(
      `/bug-rapporteren?fout=${fout ?? "webpagina"}`,
    );
  }

  await prisma.$transaction(
    async (database) => {
      const rapport =
        await database.bugRapport.create({
          data: {
            prioriteit:
              invoer.prioriteit,
            webpagina:
              invoer.webpagina!,
            uitleg: invoer.uitleg,
            opmerkingen:
              invoer.opmerkingen,
            status: "OPEN",
            gebruikerId: gebruiker.id,
            gebruikerNaam:
              gebruikersnaam(gebruiker),
          },
        });

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "BUGRAPPORT_AANGEMAAKT",
          entiteit: "BugRapport",
          entiteitId: rapport.id,
          omschrijving:
            "Bugrapport aangemaakt.",
          nieuweWaarde: {
            prioriteit:
              invoer.prioriteit,
            webpagina:
              invoer.webpagina,
            status: "OPEN",
          },
        },
      );
    },
  );

  revalidatePath("/bug-rapporteren");
  redirect(
    "/bug-rapporteren?aangemaakt=1",
  );
}

export async function bewerkBugRapport(
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "CERTIFICATEN_BEKIJKEN",
    );

  const isBeheerder =
    gebruiker.rollen.includes("BEHEERDER");

  const id = Number(formData.get("id"));
  const status = String(
    formData.get("status") ?? "",
  );

  const invoer = leesInvoer(formData);
  const fout = valideerInvoer(invoer);

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    (isBeheerder &&
      !isBugStatus(status)) ||
    fout ||
    !invoer.webpagina
  ) {
    redirect(
      `/bug-rapporteren/${id}/bewerken?fout=${fout ?? "invoer"}`,
    );
  }

  await prisma.$transaction(
    async (database) => {
      const bestaand =
        await database.bugRapport.findUnique({
          where: { id },
        });

      if (!bestaand) {
        return;
      }

      const opgeslagenStatus =
        isBeheerder &&
        isBugStatus(status)
          ? status
          : bestaand.status;

      await database.bugRapport.update({
        where: { id },
        data: {
          prioriteit:
            invoer.prioriteit,
          webpagina:
            invoer.webpagina!,
          uitleg: invoer.uitleg,
          opmerkingen:
            invoer.opmerkingen,
          status: opgeslagenStatus,
        },
      });

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "BUGRAPPORT_BEWERKT",
          entiteit: "BugRapport",
          entiteitId: id,
          omschrijving:
            "Bugrapport bewerkt.",
          oudeWaarde: {
            prioriteit:
              bestaand.prioriteit,
            webpagina:
              bestaand.webpagina,
            status:
              bestaand.status,
          },
          nieuweWaarde: {
            prioriteit:
              invoer.prioriteit,
            webpagina:
              invoer.webpagina,
            status: opgeslagenStatus,
          },
        },
      );
    },
  );

  revalidatePath("/bug-rapporteren");
  redirect(
    "/bug-rapporteren?gewijzigd=1",
  );
}

export async function wijzigBugStatus(
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "CERTIFICATEN_BEKIJKEN",
    );

  if (!gebruiker.rollen.includes("BEHEERDER")) {
    redirect(
      "/bug-rapporteren?fout=geen-toegang",
    );
  }

  const id = Number(formData.get("id"));
  const status = String(
    formData.get("status") ?? "",
  );

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !isBugStatus(status)
  ) {
    redirect(
      "/bug-rapporteren?fout=status",
    );
  }

  await prisma.$transaction(
    async (database) => {
      const bestaand =
        await database.bugRapport.findUnique({
          where: { id },
          select: { status: true },
        });

      if (!bestaand) {
        return;
      }

      await database.bugRapport.update({
        where: { id },
        data: { status },
      });

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "BUGRAPPORT_STATUS_GEWIJZIGD",
          entiteit: "BugRapport",
          entiteitId: id,
          omschrijving:
            `Status gewijzigd van ${bestaand.status} naar ${status}.`,
          oudeWaarde: {
            status: bestaand.status,
          },
          nieuweWaarde: { status },
        },
      );
    },
  );

  revalidatePath("/bug-rapporteren");
  redirect(
    "/bug-rapporteren?gewijzigd=1",
  );
}

export async function verwijderBugRapport(
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "CERTIFICATEN_BEKIJKEN",
    );

  if (!gebruiker.rollen.includes("BEHEERDER")) {
    redirect(
      "/bug-rapporteren?fout=geen-toegang",
    );
  }

  const id = Number(formData.get("id"));

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/bug-rapporteren?fout=verwijderen",
    );
  }

  await prisma.$transaction(
    async (database) => {
      const bestaand =
        await database.bugRapport.findUnique({
          where: { id },
        });

      if (!bestaand) {
        return;
      }

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "BUGRAPPORT_VERWIJDERD",
          entiteit: "BugRapport",
          entiteitId: id,
          omschrijving:
            "Bugrapport verwijderd.",
          oudeWaarde: {
            prioriteit:
              bestaand.prioriteit,
            webpagina:
              bestaand.webpagina,
            status:
              bestaand.status,
          },
        },
      );

      await database.bugRapport.delete({
        where: { id },
      });
    },
  );

  revalidatePath("/bug-rapporteren");
  redirect(
    "/bug-rapporteren?verwijderd=1",
  );
}

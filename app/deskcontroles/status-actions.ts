"use server";

import { revalidatePath } from "next/cache";
import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function controleerId(id: number) {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Ongeldig deskcontrole-ID.",
    );
  }
}

function herlaadPaden(
  id: number,
) {
  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(
    "/deskcontroles/verwijderd",
  );
  revalidatePath(
    `/deskcontroles/${id}`,
  );
  revalidatePath(
    "/mijn-overzicht",
  );
  revalidatePath("/meldingen");
}

export async function verwijderDeskcontrole(
  id: number,
) {
  const gebruiker =
    await vereisMachtiging(
      "DESKCONTROLES_BEHEREN",
    );

  controleerId(id);

  const verwijderdOp =
    new Date();

  const verwijderd =
    await prisma.$transaction(
      async (tx) => {
        const deskcontrole =
          await tx.deskcontrole.findFirst({
            where: {
              id,
              verwijderdOp: null,
            },
            select: {
              id: true,
              attestnummer: true,
              status: true,
            },
          });

        if (!deskcontrole) {
          return false;
        }

        const resultaat =
          await tx.deskcontrole.updateMany({
            where: {
              id,
              verwijderdOp: null,
            },
            data: {
              verwijderdOp,
            },
          });

        if (
          resultaat.count === 0
        ) {
          return false;
        }

        await schrijfAuditlog(
          tx,
          gebruiker,
          {
            actie:
              "DESKCONTROLE_VERWIJDERD",
            entiteit:
              "DESKCONTROLE",
            entiteitId: id,
            omschrijving:
              "Deskcontrole naar verwijderde controles verplaatst.",
            oudeWaarde: {
              verwijderdOp: null,
            },
            nieuweWaarde: {
              verwijderdOp:
                verwijderdOp.toISOString(),
            },
            metadata: {
              attestnummer:
                deskcontrole.attestnummer,
              status:
                deskcontrole.status,
            },
          },
        );

        return true;
      },
    );

  if (!verwijderd) {
    throw new Error(
      "Deze deskcontrole bestaat niet of is al verwijderd.",
    );
  }

  herlaadPaden(id);

  return {
    succes: true,
    melding:
      "De deskcontrole is verwijderd.",
  };
}

export async function herstelDeskcontrole(
  id: number,
) {
  const gebruiker =
    await vereisMachtiging(
      "DESKCONTROLES_BEHEREN",
    );

  controleerId(id);

  const hersteld =
    await prisma.$transaction(
      async (tx) => {
        const deskcontrole =
          await tx.deskcontrole.findFirst({
            where: {
              id,
              verwijderdOp: {
                not: null,
              },
            },
            select: {
              id: true,
              attestnummer: true,
              status: true,
              verwijderdOp: true,
            },
          });

        if (
          !deskcontrole?.verwijderdOp
        ) {
          return false;
        }

        const resultaat =
          await tx.deskcontrole.updateMany({
            where: {
              id,
              verwijderdOp:
                deskcontrole.verwijderdOp,
            },
            data: {
              verwijderdOp: null,
            },
          });

        if (
          resultaat.count === 0
        ) {
          return false;
        }

        await schrijfAuditlog(
          tx,
          gebruiker,
          {
            actie:
              "DESKCONTROLE_HERSTELD",
            entiteit:
              "DESKCONTROLE",
            entiteitId: id,
            omschrijving:
              "Verwijderde deskcontrole hersteld.",
            oudeWaarde: {
              verwijderdOp:
                deskcontrole
                  .verwijderdOp
                  .toISOString(),
            },
            nieuweWaarde: {
              verwijderdOp: null,
            },
            metadata: {
              attestnummer:
                deskcontrole.attestnummer,
              status:
                deskcontrole.status,
            },
          },
        );

        return true;
      },
    );

  if (!hersteld) {
    throw new Error(
      "Deze deskcontrole bestaat niet of is al hersteld.",
    );
  }

  herlaadPaden(id);

  return {
    succes: true,
    melding:
      "De deskcontrole is hersteld.",
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type WijzigOpmerkingenResultaat = {
  succes: boolean;
  melding?: string;
  opmerkingen?: string;
};

export async function wijzigDeskcontroleOpmerkingen(
  id: number,
  nieuweOpmerkingen: string,
): Promise<WijzigOpmerkingenResultaat> {
  const gebruiker =
    await vereisMachtiging(
      "DESKCONTROLES_BEHEREN",
    );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return {
      succes: false,
      melding:
        "Ongeldig deskcontrole-ID.",
    };
  }

  const opmerkingen =
    typeof nieuweOpmerkingen ===
    "string"
      ? nieuweOpmerkingen.trim()
      : "";

  if (
    opmerkingen.length > 5000
  ) {
    return {
      succes: false,
      melding:
        "Opmerkingen mogen maximaal 5000 tekens bevatten.",
    };
  }

  const nieuweWaarde =
    opmerkingen || null;

  const resultaat =
    await prisma.$transaction(
      async (tx) => {
        const bestaande =
          await tx.deskcontrole.findFirst({
            where: {
              id,
              verwijderdOp: null,
            },
            select: {
              opmerkingen: true,
            },
          });

        if (!bestaande) {
          return {
            gevonden: false,
            gewijzigd: false,
          };
        }

        if (
          bestaande.opmerkingen ===
          nieuweWaarde
        ) {
          return {
            gevonden: true,
            gewijzigd: false,
          };
        }

        const wijziging =
          await tx.deskcontrole.updateMany({
            where: {
              id,
              verwijderdOp: null,
              opmerkingen:
                bestaande.opmerkingen,
            },
            data: {
              opmerkingen:
                nieuweWaarde,
            },
          });

        if (
          wijziging.count === 0
        ) {
          return {
            gevonden: false,
            gewijzigd: false,
          };
        }

        await schrijfAuditlog(
          tx,
          gebruiker,
          {
            actie:
              "DESKCONTROLE_OPMERKINGEN_GEWIJZIGD",
            entiteit:
              "DESKCONTROLE",
            entiteitId: id,
            omschrijving:
              "Opmerkingen van de deskcontrole gewijzigd.",
            oudeWaarde: {
              opmerkingen:
                bestaande.opmerkingen,
            },
            nieuweWaarde: {
              opmerkingen:
                nieuweWaarde,
            },
          },
        );

        return {
          gevonden: true,
          gewijzigd: true,
        };
      },
    );

  if (!resultaat.gevonden) {
    return {
      succes: false,
      melding:
        "De deskcontrole bestaat niet, is verwijderd of werd ondertussen gewijzigd.",
    };
  }

  if (!resultaat.gewijzigd) {
    return {
      succes: true,
      melding:
        "De opmerkingen waren al opgeslagen.",
      opmerkingen,
    };
  }

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(
    `/deskcontroles/${id}`,
  );
  revalidatePath(
    `/deskcontroles/${id}/bewerken`,
  );

  return {
    succes: true,
    melding:
      "De opmerkingen zijn opgeslagen.",
    opmerkingen,
  };
}

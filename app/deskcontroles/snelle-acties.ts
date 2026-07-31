"use server";

import { revalidatePath } from "next/cache";
import { vereisMachtiging } from "@/lib/auth";
import { schrijfAuditlog } from "@/lib/auditlog";
import { prisma } from "@/lib/prisma";

const toegestaneStatussen = [
  "GEEN",
  "IN_OPMAAK",
  "GEACTUALISEERD",
  "AFGEROND",
] as const;

type DeskcontroleStatus =
  (typeof toegestaneStatussen)[number];

const toegestaneSelectievakken = [
  "mailSanctieVerzonden",
  "mailCorrectieVerzonden",
  "voorwaardelijkeOpheffing",
] as const;

export type DeskcontroleSelectievak =
  (typeof toegestaneSelectievakken)[number];

type ActieResultaat = {
  succes: boolean;
  melding?: string;
};

function isGeldigId(id: number) {
  return Number.isInteger(id) && id > 0;
}

function isToegestaneStatus(
  status: string,
): status is DeskcontroleStatus {
  return toegestaneStatussen.some(
    (toegestaneStatus) =>
      toegestaneStatus === status,
  );
}

function isToegestaanSelectievak(
  veld: string,
): veld is DeskcontroleSelectievak {
  return toegestaneSelectievakken.some(
    (toegestaanVeld) =>
      toegestaanVeld === veld,
  );
}

function selectievakLabel(
  veld: DeskcontroleSelectievak,
) {
  if (
    veld ===
    "mailSanctieVerzonden"
  ) {
    return "Sanctiemail verzonden";
  }

  if (
    veld ===
    "mailCorrectieVerzonden"
  ) {
    return "Correctiemail verzonden";
  }

  return "Voorwaardelijke opheffing";
}

function herlaadDeskcontrolePaden(
  id: number,
) {
  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(
    `/deskcontroles/${id}`,
  );
  revalidatePath(
    `/deskcontroles/${id}/bewerken`,
  );
  revalidatePath("/mijn-overzicht");
  revalidatePath("/meldingen");
}

export async function wijzigDeskcontroleStatus(
  id: number,
  status: string,
): Promise<ActieResultaat> {
  const gebruiker =
    await vereisMachtiging(
      "DESKCONTROLES_BEHEREN",
    );

  if (!isGeldigId(id)) {
    return {
      succes: false,
      melding:
        "Ongeldig deskcontrole-ID.",
    };
  }

  if (
    !isToegestaneStatus(status)
  ) {
    return {
      succes: false,
      melding: "Ongeldige status.",
    };
  }

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
              status: true,
            },
          });

        if (!bestaande) {
          return {
            gevonden: false,
            gewijzigd: false,
          };
        }

        if (
          bestaande.status === status
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
              status:
                bestaande.status,
            },
            data: {
              status,
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
              "DESKCONTROLE_STATUS_GEWIJZIGD",
            entiteit:
              "DESKCONTROLE",
            entiteitId: id,
            omschrijving:
              "Status van de deskcontrole gewijzigd.",
            oudeWaarde: {
              status:
                bestaande.status,
            },
            nieuweWaarde: {
              status,
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
        "De deskcontrole bestaat niet of is verwijderd.",
    };
  }

  if (!resultaat.gewijzigd) {
    return {
      succes: true,
      melding:
        "De status was al ingesteld.",
    };
  }

  herlaadDeskcontrolePaden(id);

  return {
    succes: true,
    melding: "De status is aangepast.",
  };
}

export async function wijzigDeskcontroleSelectievak(
  id: number,
  veld: string,
  waarde: boolean,
): Promise<ActieResultaat> {
  const gebruiker =
    await vereisMachtiging(
      "DESKCONTROLES_BEHEREN",
    );

  if (!isGeldigId(id)) {
    return {
      succes: false,
      melding:
        "Ongeldig deskcontrole-ID.",
    };
  }

  if (
    !isToegestaanSelectievak(
      veld,
    )
  ) {
    return {
      succes: false,
      melding:
        "Dit veld kan niet vanuit de tabel worden aangepast.",
    };
  }

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
              mailSanctieVerzonden:
                true,
              mailCorrectieVerzonden:
                true,
              voorwaardelijkeOpheffing:
                true,
            },
          });

        if (!bestaande) {
          return {
            gevonden: false,
            gewijzigd: false,
          };
        }

        const oudeWaarde =
          bestaande[veld] ?? false;

        if (
          oudeWaarde === waarde
        ) {
          return {
            gevonden: true,
            gewijzigd: false,
          };
        }

        let wijziging: {
          count: number;
        };

        if (
          veld ===
          "mailSanctieVerzonden"
        ) {
          wijziging =
            await tx.deskcontrole.updateMany({
              where: {
                id,
                verwijderdOp: null,
                mailSanctieVerzonden:
                  bestaande
                    .mailSanctieVerzonden,
              },
              data: {
                mailSanctieVerzonden:
                  waarde,
              },
            });
        } else if (
          veld ===
          "mailCorrectieVerzonden"
        ) {
          wijziging =
            await tx.deskcontrole.updateMany({
              where: {
                id,
                verwijderdOp: null,
                mailCorrectieVerzonden:
                  bestaande
                    .mailCorrectieVerzonden,
              },
              data: {
                mailCorrectieVerzonden:
                  waarde,
              },
            });
        } else {
          wijziging =
            await tx.deskcontrole.updateMany({
              where: {
                id,
                verwijderdOp: null,
                voorwaardelijkeOpheffing:
                  bestaande
                    .voorwaardelijkeOpheffing,
              },
              data: {
                voorwaardelijkeOpheffing:
                  waarde,
              },
            });
        }

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
              "DESKCONTROLE_VELD_GEWIJZIGD",
            entiteit:
              "DESKCONTROLE",
            entiteitId: id,
            omschrijving:
              `${selectievakLabel(veld)} gewijzigd.`,
            oudeWaarde: {
              veld,
              waarde:
                oudeWaarde,
            },
            nieuweWaarde: {
              veld,
              waarde,
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
        "De waarde was al ingesteld.",
    };
  }

  herlaadDeskcontrolePaden(id);

  return {
    succes: true,
    melding:
      "De wijziging is opgeslagen.",
  };
}

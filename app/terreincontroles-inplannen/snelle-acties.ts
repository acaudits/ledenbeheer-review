"use server";

import { revalidatePath } from "next/cache";

import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TerreincontroleStatusWaarde =
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null;

type SnelleActieResultaat = {
  succes: boolean;
  message?: string;
};

const TOEGESTANE_STATUSSEN = [
  "GEARCHIVEERD_ATTEST",
  "ACTUEEL_ATTEST",
  "IN_OPMAAK",
] as const;

function isGeldigeStatus(
  status: string | null,
): status is
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null {
  return (
    status === null ||
    TOEGESTANE_STATUSSEN.includes(
      status as
        (typeof TOEGESTANE_STATUSSEN)[number],
    )
  );
}

function herlaadTerreincontrolePaden(
  id: number,
) {
  revalidatePath("/");
  revalidatePath(
    "/terreincontroles-inplannen",
  );
  revalidatePath(
    `/terreincontroles-inplannen/${id}`,
  );
}

export async function wijzigTerreincontroleStatus(
  id: number,
  status:
    TerreincontroleStatusWaarde,
): Promise<SnelleActieResultaat> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");


  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return {
      succes: false,
      message:
        "Ongeldige terreincontrole.",
    };
  }

  if (
    !isGeldigeStatus(
      status,
    )
  ) {
    return {
      succes: false,
      message:
        "Ongeldige status.",
    };
  }

  const terreincontrole =
    await prisma.terreincontrole.findFirst({
      where: {
        id,
        verwijderdOp: null,
        afwezigOp: null,
      },

      select: {
        id: true,
      },
    });

  if (!terreincontrole) {
    return {
      succes: false,
      message:
        "Terreincontrole niet gevonden.",
    };
  }

  await prisma.terreincontrole.update({
    where: {
      id,
    },

    data: {
      status,
    },
  });

  herlaadTerreincontrolePaden(
    id,
  );

  return {
    succes: true,
  };
}

export async function wijzigTerreincontroleFactuur(
  id: number,
  factuurVerzonden:
    boolean | null,
): Promise<SnelleActieResultaat> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");


  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return {
      succes: false,
      message:
        "Ongeldige terreincontrole.",
    };
  }

  if (
    factuurVerzonden !==
      true &&
    factuurVerzonden !==
      false &&
    factuurVerzonden !==
      null
  ) {
    return {
      succes: false,
      message:
        "Ongeldige factuurstatus.",
    };
  }

  const terreincontrole =
    await prisma.terreincontrole.findFirst({
      where: {
        id,
        verwijderdOp: null,
        afwezigOp: null,
      },

      select: {
        id: true,
      },
    });

  if (!terreincontrole) {
    return {
      succes: false,
      message:
        "Terreincontrole niet gevonden.",
    };
  }

  await prisma.terreincontrole.update({
    where: {
      id,
    },

    data: {
      factuurVerzonden,
    },
  });

  herlaadTerreincontrolePaden(
    id,
  );

  return {
    succes: true,
  };
}

export async function wijzigTerreincontroleAfgerond(
  id: number,
  afgerond: boolean,
): Promise<SnelleActieResultaat> {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return {
      succes: false,
      message:
        "Ongeldige terreincontrole.",
    };
  }

  if (typeof afgerond !== "boolean") {
    return {
      succes: false,
      message:
        "Ongeldige afgerondstatus.",
    };
  }

  const resultaat =
    await prisma.$transaction(
      async (database) => {
        const bestaande =
          await database.terreincontrole.findFirst({
            where: {
              id,
              verwijderdOp: null,
              afwezigOp: null,
            },
            select: {
              afgerond: true,
            },
          });

        if (!bestaande) {
          return {
            gevonden: false,
            gewijzigd: false,
          };
        }

        if (
          bestaande.afgerond ===
          afgerond
        ) {
          return {
            gevonden: true,
            gewijzigd: false,
          };
        }

        const wijziging =
          await database.terreincontrole.updateMany({
            where: {
              id,
              verwijderdOp: null,
              afwezigOp: null,
              afgerond:
                bestaande.afgerond,
            },
            data: {
              afgerond,
            },
          });

        if (wijziging.count === 0) {
          return {
            gevonden: false,
            gewijzigd: false,
          };
        }

        await schrijfAuditlog(
          database,
          gebruiker,
          {
            actie:
              "TERREINCONTROLE_AFGEROND_GEWIJZIGD",
            entiteit:
              "TERREINCONTROLE",
            entiteitId: id,
            omschrijving:
              "Afgerondstatus van de ingeplande terreincontrole gewijzigd.",
            oudeWaarde: {
              afgerond:
                bestaande.afgerond,
            },
            nieuweWaarde: {
              afgerond,
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
      message:
        "De terreincontrole bestaat niet, is afwezig, is verwijderd of werd ondertussen gewijzigd.",
    };
  }

  herlaadTerreincontrolePaden(id);

  return {
    succes: true,
  };
}


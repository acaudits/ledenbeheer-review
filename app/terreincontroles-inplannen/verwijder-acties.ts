"use server";

import {
  revalidatePath,
} from "next/cache";

import { vereisMachtiging } from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

type ActieResultaat = {
  succes: boolean;
  message?: string;
};

function isGeldigId(
  id: number,
) {
  return (
    Number.isInteger(id) &&
    id > 0
  );
}

function vernieuwPaden(
  id: number,
) {
  revalidatePath(
    "/terreincontroles-inplannen",
  );

  revalidatePath(
    "/terreincontroles-inplannen/verwijderd",
  );

  revalidatePath(
    "/terreincontroles-inplannen/afwezigen",
  );

  revalidatePath(
    `/terreincontroles-inplannen/${id}`,
  );
}

export async function verwijderTerreincontrole(
  id: number,
): Promise<ActieResultaat> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

  if (!isGeldigId(id)) {
    return {
      succes: false,
      message:
        "Ongeldige terreincontrole.",
    };
  }

  try {
    const resultaat =
      await prisma.terreincontrole.updateMany(
        {
          where: {
            id,
            verwijderdOp: null,
            afwezigOp: null,
          },
          data: {
            verwijderdOp:
              new Date(),
          },
        },
      );

    if (
      resultaat.count === 0
    ) {
      return {
        succes: false,
        message:
          "De terreincontrole bestaat niet of werd al verwijderd.",
      };
    }

    vernieuwPaden(id);

    return {
      succes: true,
    };
  } catch (fout) {
    console.error(
      "Terreincontrole verwijderen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De terreincontrole kon niet worden verwijderd.",
    };
  }
}

export async function herstelTerreincontrole(
  id: number,
): Promise<ActieResultaat> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

  if (!isGeldigId(id)) {
    return {
      succes: false,
      message:
        "Ongeldige terreincontrole.",
    };
  }

  try {
    const resultaat =
      await prisma.terreincontrole.updateMany(
        {
          where: {
            id,
            verwijderdOp: {
              not: null,
            },
          },
          data: {
            verwijderdOp: null,
            afwezigOp: null,
            afwezigReden: null,
          },
        },
      );

    if (
      resultaat.count === 0
    ) {
      return {
        succes: false,
        message:
          "De terreincontrole bestaat niet of werd al hersteld.",
      };
    }

    vernieuwPaden(id);

    return {
      succes: true,
    };
  } catch (fout) {
    console.error(
      "Terreincontrole herstellen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De terreincontrole kon niet worden hersteld.",
    };
  }
}


"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

const MAXIMALE_REDENLENGTE =
  1000;

export type AfwezigActieResultaat = {
  succes: boolean;
  message?: string;
};

function isGeldigId(
  id: number,
) {
  return (
    Number.isSafeInteger(id) &&
    id > 0
  );
}

function normaliseerReden(
  reden: unknown,
) {
  if (
    typeof reden !==
    "string"
  ) {
    return {
      waarde: null,
      fout:
        "Vul een reden voor de afwezigheid in.",
    };
  }

  const waarde =
    reden.trim();

  if (!waarde) {
    return {
      waarde: null,
      fout:
        "Vul een reden voor de afwezigheid in.",
    };
  }

  if (
    waarde.length >
    MAXIMALE_REDENLENGTE
  ) {
    return {
      waarde: null,
      fout:
        `De reden mag maximaal ${MAXIMALE_REDENLENGTE} tekens bevatten.`,
    };
  }

  return {
    waarde,
    fout: null,
  };
}

function vernieuwPaden(
  id: number,
) {
  revalidatePath("/");

  revalidatePath(
    "/terreincontroles-inplannen",
  );

  revalidatePath(
    "/terreincontroles-inplannen/afwezigen",
  );

  revalidatePath(
    "/terreincontroles-inplannen/verwijderd",
  );

  revalidatePath(
    `/terreincontroles-inplannen/${id}`,
  );
}

export async function markeerTerreincontroleAfwezig(
  id: number,
  reden: string,
): Promise<AfwezigActieResultaat> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  if (!isGeldigId(id)) {
    return {
      succes: false,
      message:
        "Ongeldige terreincontrole.",
    };
  }

  const genormaliseerdeReden =
    normaliseerReden(reden);

  if (
    genormaliseerdeReden.fout ||
    !genormaliseerdeReden.waarde
  ) {
    return {
      succes: false,
      message:
        genormaliseerdeReden.fout ??
        "Vul een geldige reden in.",
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
            afwezigOp:
              new Date(),
            afwezigReden:
              genormaliseerdeReden.waarde,
          },
        },
      );

    if (
      resultaat.count === 0
    ) {
      return {
        succes: false,
        message:
          "De terreincontrole bestaat niet, werd verwijderd of staat al bij de afwezigen.",
      };
    }

    vernieuwPaden(id);

    return {
      succes: true,
    };
  } catch (fout) {
    console.error(
      "Terreincontrole afwezig melden mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De terreincontrole kon niet als afwezig worden geregistreerd.",
    };
  }
}

export async function herstelAfwezigeTerreincontrole(
  id: number,
): Promise<AfwezigActieResultaat> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

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
            afwezigOp: {
              not: null,
            },
          },
          data: {
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
          "De afwezige terreincontrole bestaat niet of werd al hersteld.",
      };
    }

    vernieuwPaden(id);

    return {
      succes: true,
    };
  } catch (fout) {
    console.error(
      "Afwezige terreincontrole herstellen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De terreincontrole kon niet worden hersteld.",
    };
  }
}

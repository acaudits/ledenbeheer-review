"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { vereisIngelogdeGebruiker } from "@/lib/auth";

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

export async function wijzigDeskcontroleStatus(
  id: number,
  status: string,
): Promise<ActieResultaat> {
  await vereisIngelogdeGebruiker();

  if (!isGeldigId(id)) {
    return {
      succes: false,
      melding: "Ongeldig deskcontrole-ID.",
    };
  }

  if (!isToegestaneStatus(status)) {
    return {
      succes: false,
      melding: "Ongeldige status.",
    };
  }

  const resultaat =
    await prisma.deskcontrole.updateMany({
      where: {
        id,
        verwijderdOp: null,
      },
      data: {
        status,
      },
    });

  if (resultaat.count === 0) {
    return {
      succes: false,
      melding:
        "De deskcontrole bestaat niet of is verwijderd.",
    };
  }

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(
    `/deskcontroles/${id}/bewerken`,
  );

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
  await vereisIngelogdeGebruiker();

  if (!isGeldigId(id)) {
    return {
      succes: false,
      melding: "Ongeldig deskcontrole-ID.",
    };
  }

  if (!isToegestaanSelectievak(veld)) {
    return {
      succes: false,
      melding:
        "Dit veld kan niet vanuit de tabel worden aangepast.",
    };
  }

  let resultaat: {
    count: number;
  };

  if (veld === "mailSanctieVerzonden") {
    resultaat =
      await prisma.deskcontrole.updateMany({
        where: {
          id,
          verwijderdOp: null,
        },
        data: {
          mailSanctieVerzonden: waarde,
        },
      });
  } else if (
    veld === "mailCorrectieVerzonden"
  ) {
    resultaat =
      await prisma.deskcontrole.updateMany({
        where: {
          id,
          verwijderdOp: null,
        },
        data: {
          mailCorrectieVerzonden: waarde,
        },
      });
  } else {
    resultaat =
      await prisma.deskcontrole.updateMany({
        where: {
          id,
          verwijderdOp: null,
        },
        data: {
          voorwaardelijkeOpheffing: waarde,
        },
      });
  }

  if (resultaat.count === 0) {
    return {
      succes: false,
      melding:
        "De deskcontrole bestaat niet of is verwijderd.",
    };
  }

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(
    `/deskcontroles/${id}/bewerken`,
  );

  return {
    succes: true,
    melding: "De wijziging is opgeslagen.",
  };
}


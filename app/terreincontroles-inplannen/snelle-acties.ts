"use server";

import { revalidatePath } from "next/cache";

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


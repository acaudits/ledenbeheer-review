"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { vereisIngelogdeGebruiker } from "@/lib/auth";

function controleerId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Ongeldig deskcontrole-ID.");
  }
}

export async function verwijderDeskcontrole(id: number) {
  await vereisIngelogdeGebruiker();
  controleerId(id);

  const deskcontrole = await prisma.deskcontrole.findFirst({
    where: {
      id,
      verwijderdOp: null,
    },
    select: {
      id: true,
    },
  });

  if (!deskcontrole) {
    throw new Error(
      "Deze deskcontrole bestaat niet of is al verwijderd.",
    );
  }

  await prisma.deskcontrole.update({
    where: {
      id,
    },
    data: {
      verwijderdOp: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath("/deskcontroles/verwijderd");

  return {
    succes: true,
    melding: "De deskcontrole is verwijderd.",
  };
}

export async function herstelDeskcontrole(id: number) {
  await vereisIngelogdeGebruiker();
  controleerId(id);

  const deskcontrole = await prisma.deskcontrole.findFirst({
    where: {
      id,
      verwijderdOp: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (!deskcontrole) {
    throw new Error(
      "Deze deskcontrole bestaat niet of is al hersteld.",
    );
  }

  await prisma.deskcontrole.update({
    where: {
      id,
    },
    data: {
      verwijderdOp: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath("/deskcontroles/verwijderd");

  return {
    succes: true,
    melding: "De deskcontrole is hersteld.",
  };
}

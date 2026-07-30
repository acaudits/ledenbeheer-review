"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { vereisMachtiging } from "@/lib/auth";

type WijzigOpmerkingenResultaat = {
  succes: boolean;
  melding?: string;
  opmerkingen?: string;
};

export async function wijzigDeskcontroleOpmerkingen(
  id: number,
  nieuweOpmerkingen: string,
): Promise<WijzigOpmerkingenResultaat> {
  await vereisMachtiging("DESKCONTROLES_BEHEREN");

  if (!Number.isInteger(id) || id <= 0) {
    return {
      succes: false,
      melding: "Ongeldig deskcontrole-ID.",
    };
  }

  const opmerkingen =
    typeof nieuweOpmerkingen === "string"
      ? nieuweOpmerkingen.trim()
      : "";

  if (opmerkingen.length > 5000) {
    return {
      succes: false,
      melding: "Opmerkingen mogen maximaal 5000 tekens bevatten.",
    };
  }

  const resultaat = await prisma.deskcontrole.updateMany({
    where: {
      id,
      verwijderdOp: null,
    },
    data: {
      opmerkingen: opmerkingen || null,
    },
  });

  if (resultaat.count === 0) {
    return {
      succes: false,
      melding:
        "De deskcontrole bestaat niet of is inmiddels verwijderd.",
    };
  }

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(`/deskcontroles/${id}/bewerken`);

  return {
    succes: true,
    melding: "De opmerkingen zijn opgeslagen.",
    opmerkingen,
  };
}


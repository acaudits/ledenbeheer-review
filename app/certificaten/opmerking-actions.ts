"use server";

import { revalidatePath } from "next/cache";
import {
  haalIngelogdeGebruikerOp,
  vereisMachtiging,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CertificaatSoort = "persoon" | "proces";

type WijzigOpmerkingInvoer = {
  id: number;
  soort: CertificaatSoort;
  opmerking: string;
};

type WijzigOpmerkingResultaat = {
  succes: boolean;
  melding: string;
  opmerking?: string;
};

export async function wijzigCertificaatOpmerking({
  id,
  soort,
  opmerking,
}: WijzigOpmerkingInvoer): Promise<WijzigOpmerkingResultaat> {
  await vereisMachtiging(
    "CERTIFICATEN_BEHEREN",
  );

  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return {
        succes: false,
        melding:
          "Je bent niet ingelogd of je account is niet actief.",
      };
    }

    if (!Number.isInteger(id) || id <= 0) {
      return {
        succes: false,
        melding: "Het certificaatnummer is ongeldig.",
      };
    }

    if (soort !== "persoon" && soort !== "proces") {
      return {
        succes: false,
        melding: "Het certificaattype is ongeldig.",
      };
    }

    const opgeschoondeOpmerking = opmerking.trim();

    if (opgeschoondeOpmerking.length > 5000) {
      return {
        succes: false,
        melding:
          "De opmerking mag maximaal 5000 tekens bevatten.",
      };
    }

    if (soort === "proces") {
      const resultaat =
        await prisma.procescertificaat.updateMany({
          where: {
            id,
            verwijderdOp: null,
          },
          data: {
            opmerking: opgeschoondeOpmerking || null,
          },
        });

      if (resultaat.count === 0) {
        return {
          succes: false,
          melding:
            "Het procescertificaat werd niet gevonden.",
        };
      }

      revalidatePath("/procescertificaten");
    } else {
      const resultaat = await prisma.lid.updateMany({
        where: {
          id,
          verwijderdOp: null,
        },
        data: {
          opmerking: opgeschoondeOpmerking || null,
        },
      });

      if (resultaat.count === 0) {
        return {
          succes: false,
          melding:
            "Het persoonscertificaat werd niet gevonden.",
        };
      }

      revalidatePath("/persoonscertificaten");
    }

    return {
      succes: true,
      melding: "De opmerking werd opgeslagen.",
      opmerking: opgeschoondeOpmerking,
    };
  } catch (error) {
    console.error(
      "Opmerking van certificaat wijzigen mislukt:",
      error,
    );

    return {
      succes: false,
      melding:
        "De opmerking kon niet worden opgeslagen. Probeer opnieuw.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  haalAttestIdUitUrl,
  isGeldigUur,
  leesIsoDatum,
  normaliseerOvamId,
  normaliseerTekst,
  normaliseerTerreincontroleStatus,
} from "@/lib/terreincontrole";

export type TerreincontroleFormState = {
  message?: string;
  errors?: {
    auditeur?: string;
    factuurVerzonden?: string;
    status?: string;
    attestUrl?: string;
    opmerkingen?: string;
    adres?: string;
    datumPlaatsbezoek?: string;
    uurPlaatsbezoek?: string;
    ovamId?: string;
    procescertificaatId?: string;
  };
};

function isPrismaUniekheidsfout(
  fout: unknown,
) {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

export async function maakTerreincontroleAan(
  _vorigeStatus:
    TerreincontroleFormState,
  formData: FormData,
): Promise<TerreincontroleFormState> {
  await vereisIngelogdeGebruiker();

  const errors: NonNullable<
    TerreincontroleFormState["errors"]
  > = {};

  const auditeur =
    normaliseerTekst(
      formData.get(
        "auditeur",
      ),
    );

  const factuurVerzonden =
    formData.get(
      "factuurVerzonden",
    ) === "on";

  const statusWaarde =
    formData.get("status");

  const status =
    normaliseerTerreincontroleStatus(
      statusWaarde,
    );

  const attestUrl =
    normaliseerTekst(
      formData.get(
        "attestUrl",
      ),
    );

  const attestId =
    haalAttestIdUitUrl(
      attestUrl,
    );

  const opmerkingen =
    normaliseerTekst(
      formData.get(
        "opmerkingen",
      ),
    );

  const adres =
    normaliseerTekst(
      formData.get(
        "adres",
      ),
    );

  const datumPlaatsbezoekWaarde =
    normaliseerTekst(
      formData.get(
        "datumPlaatsbezoek",
      ),
    );

  const datumPlaatsbezoek =
    leesIsoDatum(
      datumPlaatsbezoekWaarde,
    );

  const uurPlaatsbezoek =
    normaliseerTekst(
      formData.get(
        "uurPlaatsbezoek",
      ),
    );

  const ovamId =
    normaliseerOvamId(
      formData.get(
        "ovamId",
      ),
    );

  const procescertificaatIdWaarde =
    normaliseerTekst(
      formData.get(
        "procescertificaatId",
      ),
    );

  const procescertificaatId =
    Number(
      procescertificaatIdWaarde,
    );

  if (!auditeur) {
    errors.auditeur =
      "Auditeur is verplicht.";
  } else if (
    auditeur.length > 255
  ) {
    errors.auditeur =
      "Auditeur mag maximaal 255 tekens bevatten.";
  }

  if (
    status === undefined
  ) {
    errors.status =
      "Selecteer een geldige status.";
  }

  if (!attestUrl) {
    errors.attestUrl =
      "AttestURL is verplicht.";
  } else if (!attestId) {
    errors.attestUrl =
      "Vul een geldige OVAM-attestURL met een Attest-ID in.";
  } else if (
    attestUrl.length > 2000
  ) {
    errors.attestUrl =
      "AttestURL is te lang.";
  }

  if (
    opmerkingen.length > 5000
  ) {
    errors.opmerkingen =
      "Opmerkingen mogen maximaal 5000 tekens bevatten.";
  }

  if (!adres) {
    errors.adres =
      "Adres is verplicht.";
  } else if (
    adres.length > 1000
  ) {
    errors.adres =
      "Adres mag maximaal 1000 tekens bevatten.";
  }

  if (
    !datumPlaatsbezoekWaarde
  ) {
    errors.datumPlaatsbezoek =
      "Datum plaatsbezoek is verplicht.";
  } else if (
    !datumPlaatsbezoek
  ) {
    errors.datumPlaatsbezoek =
      "Vul een geldige Datum plaatsbezoek in.";
  }

  if (!uurPlaatsbezoek) {
    errors.uurPlaatsbezoek =
      "Uur plaatsbezoek is verplicht.";
  } else if (
    !isGeldigUur(
      uurPlaatsbezoek,
    )
  ) {
    errors.uurPlaatsbezoek =
      "Vul een geldig uur in, bijvoorbeeld 09:30.";
  }

  if (!ovamId) {
    errors.ovamId =
      "OVAM-ID is verplicht.";
  } else if (
    ovamId.length > 100
  ) {
    errors.ovamId =
      "OVAM-ID is te lang.";
  }

  if (
    !procescertificaatIdWaarde
  ) {
    errors.procescertificaatId =
      "Procescertificaat is verplicht.";
  } else if (
    !Number.isInteger(
      procescertificaatId,
    ) ||
    procescertificaatId <= 0
  ) {
    errors.procescertificaatId =
      "Selecteer een geldig procescertificaat.";
  }

  if (
    Object.keys(errors).length >
    0
  ) {
    return {
      message:
        "Controleer de gemarkeerde velden.",
      errors,
    };
  }

  if (
    !attestId ||
    !datumPlaatsbezoek ||
    status === undefined
  ) {
    return {
      message:
        "Niet alle verplichte gegevens zijn geldig.",
      errors,
    };
  }

  const [
    lid,
    procescertificaat,
    bestaandeTerreincontrole,
  ] = await Promise.all([
    prisma.lid.findFirst({
      where: {
        ovamId: {
          equals: ovamId,
          mode: "insensitive",
        },
        verwijderdOp: null,
      },
      select: {
        id: true,
        ovamId: true,
        naamPersoon: true,
      },
    }),

    prisma.procescertificaat.findFirst({
      where: {
        id:
          procescertificaatId,
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamBedrijf: true,
      },
    }),

    prisma.terreincontrole.findUnique({
      where: {
        attestId,
      },
      select: {
        id: true,
        attestId: true,
      },
    }),
  ]);

  if (!lid) {
    return {
      message:
        `Er werd geen actief persoonscertificaat gevonden voor OVAM-ID ${ovamId}.`,
      errors: {
        ovamId:
          "Controleer de OVAM-ID.",
      },
    };
  }

  if (!procescertificaat) {
    return {
      message:
        "Het geselecteerde procescertificaat werd niet gevonden of is verwijderd.",
      errors: {
        procescertificaatId:
          "Selecteer een actief procescertificaat.",
      },
    };
  }

  if (
    bestaandeTerreincontrole
  ) {
    return {
      message:
        "Voor dit Attest-ID bestaat al een terreincontrole.",
      errors: {
        attestUrl:
          `Attest-ID ${attestId} is al gebruikt.`,
      },
    };
  }

  try {
    await prisma.terreincontrole.create({
      data: {
        auditeur,
        factuurVerzonden,
        status,
        attestUrl,
        opmerkingen:
          opmerkingen || null,
        adres,
        datumPlaatsbezoek,
        uurPlaatsbezoek,
        ovamId: lid.ovamId,
        naamAdi:
          lid.naamPersoon,
        bedrijfsnaam:
          procescertificaat.naamBedrijf,
        attestId,
      },
    });
  } catch (fout) {
    if (
      isPrismaUniekheidsfout(
        fout,
      )
    ) {
      return {
        message:
          "Voor dit Attest-ID bestaat al een terreincontrole.",
        errors: {
          attestUrl:
            `Attest-ID ${attestId} is al gebruikt.`,
        },
      };
    }

    console.error(
      "Terreincontrole aanmaken mislukt:",
      fout,
    );

    return {
      message:
        "Er is een technische fout opgetreden bij het opslaan.",
    };
  }

  revalidatePath("/");
  revalidatePath(
    "/terreincontroles",
  );

  redirect(
    "/terreincontroles",
  );
}


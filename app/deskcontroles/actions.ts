"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DeskcontroleStatusWaarde =
  | "GEEN"
  | "IN_OPMAAK"
  | "GEACTUALISEERD";

type DeskcontroleTypeWaarde =
  | "NIEUWE_CONTROLE"
  | "OPVOLGING";

export type DeskcontroleFormState = {
  message?: string;
  errors?: {
    auditeur?: string;
    lidId?: string;
    procescertificaatId?: string;
    linkAttest?: string;
    attestnummer?: string;
    status?: string;
    typeControle?: string;
    oneDrive?: string;
    datumControle?: string;
    finalisatieDatum?: string;
    adres?: string;
    opmerkingen?: string;
  };
};

function tekst(
  formData: FormData,
  veld: string,
) {
  return String(
    formData.get(veld) ?? "",
  ).trim();
}

function optioneleTekst(
  formData: FormData,
  veld: string,
) {
  const waarde = tekst(formData, veld);

  return waarde || null;
}

function isAangevinkt(
  formData: FormData,
  veld: string,
) {
  const waarde = formData.get(veld);

  return (
    waarde === "on" ||
    waarde === "true" ||
    waarde === "1"
  );
}

function leesPositiefId(
  formData: FormData,
  veld: string,
) {
  const waarde = Number(
    tekst(formData, veld),
  );

  if (
    !Number.isInteger(waarde) ||
    waarde <= 0
  ) {
    return null;
  }

  return waarde;
}

function leesDatum(
  waarde: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      waarde,
    )
  ) {
    return null;
  }

  const datum = new Date(
    `${waarde}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(datum.getTime()) ||
    datum.toISOString().slice(0, 10) !==
      waarde
  ) {
    return null;
  }

  return datum;
}

function telDagenBij(
  datum: Date,
  aantalDagen: number,
) {
  const resultaat = new Date(
    datum.getTime(),
  );

  resultaat.setUTCDate(
    resultaat.getUTCDate() +
      aantalDagen,
  );

  return resultaat;
}

function haalAttestIdUitLink(
  linkAttest: string,
) {
  try {
    const url = new URL(linkAttest);

    if (url.protocol !== "https:") {
      return null;
    }

    if (
      url.hostname.toLowerCase() !==
      "asbestinventaris.ovam.be"
    ) {
      return null;
    }

    const onderdelen =
      url.pathname
        .split("/")
        .filter(Boolean);

    if (
      onderdelen.length !== 2 ||
      onderdelen[0].toLowerCase() !==
        "asbestinventaris"
    ) {
      return null;
    }

    const attestId =
      onderdelen[1].toLowerCase();

    const uuidPatroon =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPatroon.test(attestId)) {
      return null;
    }

    return attestId;
  } catch {
    return null;
  }
}

function isGeldigeUrl(
  waarde: string,
) {
  try {
    const url = new URL(waarde);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export async function maakDeskcontroleAan(
  _vorigeStatus: DeskcontroleFormState,
  formData: FormData,
): Promise<DeskcontroleFormState> {
  await vereisIngelogdeGebruiker();

  const auditeur = tekst(
    formData,
    "auditeur",
  );

  const lidId = leesPositiefId(
    formData,
    "lidId",
  );

  const procescertificaatId =
    leesPositiefId(
      formData,
      "procescertificaatId",
    );

  const linkAttest = tekst(
    formData,
    "linkAttest",
  );

  const attestnummer = tekst(
    formData,
    "attestnummer",
  ).toUpperCase();

  const statusWaarde = tekst(
    formData,
    "status",
  );

  const typeControleWaarde = tekst(
    formData,
    "typeControle",
  );

  const datumControleWaarde = tekst(
    formData,
    "datumControle",
  );

  const finalisatieDatumWaarde =
    tekst(
      formData,
      "finalisatieDatum",
    );

  const oneDrive = optioneleTekst(
    formData,
    "oneDrive",
  );

  const adres = optioneleTekst(
    formData,
    "adres",
  );

  const opmerkingen = optioneleTekst(
    formData,
    "opmerkingen",
  );

  const mailSanctieVerzonden =
    isAangevinkt(
      formData,
      "mailSanctieVerzonden",
    );

  const mailCorrectieVerzonden =
    isAangevinkt(
      formData,
      "mailCorrectieVerzonden",
    );

  const voorwaardelijkeOpheffing =
    isAangevinkt(
      formData,
      "voorwaardelijkeOpheffing",
    );

  const errors: NonNullable<
    DeskcontroleFormState["errors"]
  > = {};

  if (!auditeur) {
    errors.auditeur =
      "Auditeur is verplicht.";
  }

  if (!lidId) {
    errors.lidId =
      "Kies een Naam ADI.";
  }

  if (!procescertificaatId) {
    errors.procescertificaatId =
      "Kies een bedrijfsnaam.";
  }

  if (!linkAttest) {
    errors.linkAttest =
      "Link Attest is verplicht.";
  }

  const attestId = linkAttest
    ? haalAttestIdUitLink(linkAttest)
    : null;

  if (linkAttest && !attestId) {
    errors.linkAttest =
      "Gebruik een geldige OVAM-attestlink, bijvoorbeeld https://asbestinventaris.ovam.be/asbestinventaris/a0295bbc-6cd3-4c02-b39e-590658978f3c.";
  }

  if (!attestnummer) {
    errors.attestnummer =
      "Attestnummer is verplicht.";
  }

  const toegestaneStatussen:
    DeskcontroleStatusWaarde[] = [
      "GEEN",
      "IN_OPMAAK",
      "GEACTUALISEERD",
    ];

  const status =
    toegestaneStatussen.includes(
      statusWaarde as DeskcontroleStatusWaarde,
    )
      ? (statusWaarde as DeskcontroleStatusWaarde)
      : null;

  if (!status) {
    errors.status =
      "Kies Geen, In opmaak of Geactualiseerd.";
  }

  const toegestaneTypes:
    DeskcontroleTypeWaarde[] = [
      "NIEUWE_CONTROLE",
      "OPVOLGING",
    ];

  const typeControle =
    toegestaneTypes.includes(
      typeControleWaarde as DeskcontroleTypeWaarde,
    )
      ? (typeControleWaarde as DeskcontroleTypeWaarde)
      : null;

  if (!typeControle) {
    errors.typeControle =
      "Kies Nieuwe controle of Opvolging.";
  }

  if (!datumControleWaarde) {
    errors.datumControle =
      "Datum controle is verplicht.";
  }

  const datumControle =
    datumControleWaarde
      ? leesDatum(
          datumControleWaarde,
        )
      : null;

  if (
    datumControleWaarde &&
    !datumControle
  ) {
    errors.datumControle =
      "Vul een geldige datum in.";
  }

  let finalisatieDatum: Date | null =
    null;

  if (finalisatieDatumWaarde) {
    finalisatieDatum = leesDatum(
      finalisatieDatumWaarde,
    );

    if (!finalisatieDatum) {
      errors.finalisatieDatum =
        "Vul een geldige finalisatiedatum in.";
    }
  }

  if (
    oneDrive &&
    !isGeldigeUrl(oneDrive)
  ) {
    errors.oneDrive =
      "Vul een geldige OneDrive-URL in.";
  }

  if (
    opmerkingen &&
    opmerkingen.length > 5000
  ) {
    errors.opmerkingen =
      "Opmerkingen mogen maximaal 5000 tekens bevatten.";
  }

  if (
    adres &&
    adres.length > 1000
  ) {
    errors.adres =
      "Het adres mag maximaal 1000 tekens bevatten.";
  }

  if (
    Object.keys(errors).length > 0
  ) {
    return {
      message:
        "Controleer de gemarkeerde velden.",
      errors,
    };
  }

  if (
    !lidId ||
    !procescertificaatId ||
    !attestId ||
    !status ||
    !typeControle ||
    !datumControle
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
    bestaand,
  ] = await Promise.all([
    prisma.lid.findFirst({
      where: {
        id: lidId,
        verwijderdOp: null,
      },
      select: {
        id: true,
      },
    }),

    prisma.procescertificaat.findFirst({
      where: {
        id: procescertificaatId,
        verwijderdOp: null,
      },
      select: {
        id: true,
      },
    }),

    prisma.deskcontrole.findFirst({
      where: {
        OR: [
          {
            attestId,
          },
          {
            linkAttest,
          },
          {
            attestnummer,
          },
        ],
      },
      select: {
        attestId: true,
        linkAttest: true,
        attestnummer: true,
      },
    }),
  ]);

  if (!lid) {
    errors.lidId =
      "Het gekozen persoonscertificaat bestaat niet meer of is verwijderd.";
  }

  if (!procescertificaat) {
    errors.procescertificaatId =
      "Het gekozen procescertificaat bestaat niet meer of is verwijderd.";
  }

  if (
    bestaand?.attestnummer ===
    attestnummer
  ) {
    errors.attestnummer =
      "Dit attestnummer bestaat al.";
  }

  if (
    bestaand?.attestId === attestId ||
    bestaand?.linkAttest === linkAttest
  ) {
    errors.linkAttest =
      "Voor deze attestlink bestaat al een deskcontrole.";
  }

  if (
    Object.keys(errors).length > 0
  ) {
    return {
      message:
        "De deskcontrole kan niet worden opgeslagen.",
      errors,
    };
  }

  const deadlineSanctie =
    telDagenBij(datumControle, 21);

  const deadlineCorrectie =
    finalisatieDatum
      ? telDagenBij(
          finalisatieDatum,
          30,
        )
      : null;

  try {
    await prisma.deskcontrole.create({
      data: {
        attestId,
        auditeur,
        lidId,
        procescertificaatId,
        linkAttest,
        attestnummer,
        status,
        deadlineSanctie,
        mailSanctieVerzonden,
        typeControle,
        deadlineCorrectie,
        mailCorrectieVerzonden,
        oneDrive,
        voorwaardelijkeOpheffing,
        opmerkingen,
        datumControle,
        adres,
        finalisatieDatum,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        message:
          "Het attestnummer, de attestlink of het attest-ID bestaat al.",
        errors: {
          attestnummer:
            "Controleer of dit attestnummer al werd toegevoegd.",
          linkAttest:
            "Controleer of deze attestlink al werd toegevoegd.",
        },
      };
    }

    console.error(
      "Deskcontrole opslaan mislukt:",
      error,
    );

    return {
      message:
        "Er is een technische fout opgetreden. Probeer opnieuw.",
    };
  }

  revalidatePath("/");
  revalidatePath("/deskcontroles");

  redirect(
    "/deskcontroles?toegevoegd=1",
  );
}


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

    return uuidPatroon.test(attestId)
      ? attestId
      : null;
  } catch {
    return null;
  }
}

function stuurNaarFout(
  id: number,
  melding: string,
): never {
  redirect(
    `/deskcontroles/${id}/bewerken?fout=${encodeURIComponent(
      melding,
    )}`,
  );
}

export async function wijzigDeskcontrole(
  id: number,
  formData: FormData,
) {
  await vereisIngelogdeGebruiker();

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect("/deskcontroles");
  }

  const bestaandeDeskcontrole =
    await prisma.deskcontrole.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        verwijderdOp: true,
      },
    });

  if (
    !bestaandeDeskcontrole ||
    bestaandeDeskcontrole.verwijderdOp
  ) {
    redirect("/deskcontroles");
  }

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

  if (!auditeur) {
    stuurNaarFout(
      id,
      "Auditeur is verplicht.",
    );
  }

  if (!lidId) {
    stuurNaarFout(
      id,
      "Kies een geldige Naam ADI.",
    );
  }

  if (!procescertificaatId) {
    stuurNaarFout(
      id,
      "Kies een geldig procescertificaat.",
    );
  }

  if (!linkAttest) {
    stuurNaarFout(
      id,
      "Link Attest is verplicht.",
    );
  }

  const attestId =
    haalAttestIdUitLink(linkAttest);

  if (!attestId) {
    stuurNaarFout(
      id,
      "Gebruik een geldige OVAM-attestlink.",
    );
  }

  if (!attestnummer) {
    stuurNaarFout(
      id,
      "Attestnummer is verplicht.",
    );
  }

  const toegestaneStatussen:
    DeskcontroleStatusWaarde[] = [
      "GEEN",
      "IN_OPMAAK",
      "GEACTUALISEERD",
    ];

  if (
    !toegestaneStatussen.includes(
      statusWaarde as DeskcontroleStatusWaarde,
    )
  ) {
    stuurNaarFout(
      id,
      "Kies Geen, In opmaak of Geactualiseerd.",
    );
  }

  const status =
    statusWaarde as DeskcontroleStatusWaarde;

  const toegestaneTypes:
    DeskcontroleTypeWaarde[] = [
      "NIEUWE_CONTROLE",
      "OPVOLGING",
    ];

  if (
    !toegestaneTypes.includes(
      typeControleWaarde as DeskcontroleTypeWaarde,
    )
  ) {
    stuurNaarFout(
      id,
      "Kies Nieuwe controle of Opvolging.",
    );
  }

  const typeControle =
    typeControleWaarde as DeskcontroleTypeWaarde;

  if (!datumControleWaarde) {
    stuurNaarFout(
      id,
      "Datum controle is verplicht.",
    );
  }

  const datumControle = leesDatum(
    datumControleWaarde,
  );

  if (!datumControle) {
    stuurNaarFout(
      id,
      "Vul een geldige datum controle in.",
    );
  }

  let finalisatieDatum: Date | null =
    null;

  if (finalisatieDatumWaarde) {
    finalisatieDatum = leesDatum(
      finalisatieDatumWaarde,
    );

    if (!finalisatieDatum) {
      stuurNaarFout(
        id,
        "Vul een geldige finalisatiedatum in.",
      );
    }
  }

  if (
    oneDrive &&
    !isGeldigeUrl(oneDrive)
  ) {
    stuurNaarFout(
      id,
      "Vul een geldige OneDrive-URL in.",
    );
  }

  if (
    opmerkingen &&
    opmerkingen.length > 5000
  ) {
    stuurNaarFout(
      id,
      "Opmerkingen mogen maximaal 5000 tekens bevatten.",
    );
  }

  if (
    adres &&
    adres.length > 1000
  ) {
    stuurNaarFout(
      id,
      "Het adres mag maximaal 1000 tekens bevatten.",
    );
  }

  const [
    lid,
    procescertificaat,
    dubbel,
  ] = await Promise.all([
    prisma.lid.findUnique({
      where: {
        id: lidId,
      },
      select: {
        id: true,
      },
    }),

    prisma.procescertificaat.findUnique({
      where: {
        id: procescertificaatId,
      },
      select: {
        id: true,
      },
    }),

    prisma.deskcontrole.findFirst({
      where: {
        id: {
          not: id,
        },
        OR: [
          {
            attestnummer,
          },
          {
            attestId,
          },
          {
            linkAttest,
          },
        ],
      },
      select: {
        attestnummer: true,
        attestId: true,
        linkAttest: true,
      },
    }),
  ]);

  if (!lid) {
    stuurNaarFout(
      id,
      "Het gekozen persoonscertificaat bestaat niet meer.",
    );
  }

  if (!procescertificaat) {
    stuurNaarFout(
      id,
      "Het gekozen procescertificaat bestaat niet meer.",
    );
  }

  if (
    dubbel?.attestnummer ===
    attestnummer
  ) {
    stuurNaarFout(
      id,
      "Dit attestnummer bestaat al.",
    );
  }

  if (
    dubbel?.attestId === attestId ||
    dubbel?.linkAttest === linkAttest
  ) {
    stuurNaarFout(
      id,
      "Voor deze attestlink bestaat al een andere deskcontrole.",
    );
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
    await prisma.deskcontrole.update({
      where: {
        id,
      },
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
      stuurNaarFout(
        id,
        "Het attestnummer, de attestlink of het attest-ID bestaat al.",
      );
    }

    console.error(
      "Deskcontrole wijzigen mislukt:",
      error,
    );

    stuurNaarFout(
      id,
      "De deskcontrole kon door een technische fout niet worden opgeslagen.",
    );
  }

  revalidatePath("/");
  revalidatePath("/deskcontroles");
  revalidatePath(
    `/deskcontroles/${id}/bewerken`,
  );

  redirect(
    "/deskcontroles?gewijzigd=1",
  );
}


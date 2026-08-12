"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function tekst(
  formData: FormData,
  naam: string,
) {
  return String(
    formData.get(naam) ?? "",
  ).trim();
}

function positiefId(
  formData: FormData,
  naam: string,
) {
  const waarde = Number(
    tekst(formData, naam),
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

    const delen = url.pathname
      .split("/")
      .filter(Boolean);

    if (
      delen.length !== 2 ||
      delen[0].toLowerCase() !==
        "asbestinventaris"
    ) {
      return null;
    }

    const attestId =
      delen[1].toLowerCase();

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return uuid.test(attestId)
      ? attestId
      : null;
  } catch {
    return null;
  }
}

function foutRedirect(
  melding: string,
): never {
  redirect(
    `/terreincontroles/nieuw?fout=${encodeURIComponent(
      melding,
    )}`,
  );
}

function isUniekheidsfout(
  fout: unknown,
) {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

function gebruikersnaam(
  gebruiker: {
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
    email: string;
  },
) {
  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    gebruiker.naam?.trim() ||
    volledigeNaam ||
    gebruiker.email
  );
}

export async function maakTerreincontroleAan(
  formData: FormData,
) {
  const ingelogdeGebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const auditeurGebruikerId =
    positiefId(
      formData,
      "auditeurGebruikerId",
    );

  const lidId = positiefId(
    formData,
    "lidId",
  );

  const procescertificaatId =
    positiefId(
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

  const datumControleWaarde =
    tekst(
      formData,
      "datumControle",
    );

  const datumControle =
    leesDatum(
      datumControleWaarde,
    );

  const adres =
    tekst(formData, "adres") ||
    null;

  const opmerkingen =
    tekst(formData, "opmerkingen") ||
    null;

  const attestId =
    haalAttestIdUitLink(
      linkAttest,
    );

  if (!auditeurGebruikerId) {
    foutRedirect(
      "Kies een auditeur.",
    );
  }

  if (!lidId) {
    foutRedirect(
      "Kies een persoonscertificaat.",
    );
  }

  if (!procescertificaatId) {
    foutRedirect(
      "Kies een procescertificaat.",
    );
  }

  if (!linkAttest || !attestId) {
    foutRedirect(
      "Gebruik een geldige OVAM-attestlink.",
    );
  }

  if (!attestnummer) {
    foutRedirect(
      "Attestnummer is verplicht.",
    );
  }

  if (!datumControle) {
    foutRedirect(
      "Vul een geldige datum controle in.",
    );
  }

  if (
    opmerkingen &&
    opmerkingen.length > 5000
  ) {
    foutRedirect(
      "Opmerkingen mogen maximaal 5000 tekens bevatten.",
    );
  }

  if (
    adres &&
    adres.length > 1000
  ) {
    foutRedirect(
      "Adres mag maximaal 1000 tekens bevatten.",
    );
  }

  const [
    auditeurGebruiker,
    lid,
    procescertificaat,
  ] = await Promise.all([
    prisma.toegestaneGebruiker.findFirst({
      where: {
        id: auditeurGebruikerId,
        actief: true,
      },
      select: {
        id: true,
        naam: true,
        voornaam: true,
        achternaam: true,
        email: true,
      },
    }),

    prisma.lid.findFirst({
      where: {
        id: lidId,
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
        certificaatnummer: true,
        certificatiePlatform: true,
      },
    }),

    prisma.procescertificaat.findFirst({
      where: {
        id: procescertificaatId,
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamBedrijf: true,
        kboNummer: true,
        certificaatnummer: true,
      },
    }),
  ]);

  if (!auditeurGebruiker) {
    foutRedirect(
      "De gekozen auditeur bestaat niet of is niet actief.",
    );
  }

  if (!lid) {
    foutRedirect(
      "Het gekozen persoonscertificaat bestaat niet meer.",
    );
  }

  if (!procescertificaat) {
    foutRedirect(
      "Het gekozen procescertificaat bestaat niet meer.",
    );
  }

  const auditeur =
    gebruikersnaam(
      auditeurGebruiker,
    );

  let nieuwId: number;

  try {
    nieuwId =
      await prisma.$transaction(
        async (tx) => {
          const nieuw =
            await tx.terreincontroleDossier.create({
              data: {
                auditeur,
                auditeurGebruikerId:
                  auditeurGebruiker.id,

                naamAdi:
                  lid.naamPersoon,

                linkAttest,
                attestId,
                attestnummer,

                certificatiePlatform:
                  lid.certificatiePlatform,

                opmerkingen,
                datumControle,
                adres,

                persoonsId:
                  lid.ovamId,

                lidId: lid.id,

                bedrijfsnaam:
                  procescertificaat
                    .naamBedrijf,

                ondernemingsnummer:
                  procescertificaat
                    .kboNummer,

                procescertificaatId:
                  procescertificaat.id,

                persoonscertificaatNummer:
                  lid.certificaatnummer,

                procescertificaatNummer:
                  procescertificaat
                    .certificaatnummer,
              },
              select: {
                id: true,
              },
            });

          await schrijfAuditlog(
            tx,
            ingelogdeGebruiker,
            {
              actie:
                "TERREINCONTROLE_AANGEMAAKT",
              entiteit:
                "TERREINCONTROLE_DOSSIER",
              entiteitId: nieuw.id,
              omschrijving:
                "Terreincontrole aangemaakt.",
              nieuweWaarde: {
                auditeur,
                naamAdi:
                  lid.naamPersoon,
                attestnummer,
                datumControle:
                  datumControle.toISOString(),
                persoonsId:
                  lid.ovamId,
                ondernemingsnummer:
                  procescertificaat
                    .kboNummer,
              },
              metadata: {
                attestnummer,
              },
            },
          );

          return nieuw.id;
        },
      );
  } catch (fout) {
    if (isUniekheidsfout(fout)) {
      foutRedirect(
        "Dit attestnummer of deze attestlink bestaat al in Terreincontroles.",
      );
    }

    console.error(
      "Terreincontrole aanmaken mislukt:",
      fout,
    );

    foutRedirect(
      "De terreincontrole kon door een technische fout niet worden opgeslagen.",
    );
  }

  revalidatePath(
    "/terreincontroles",
  );

  redirect(
    `/terreincontroles/${nieuwId}?toegevoegd=1`,
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUSSEN = [
  "GEEN",
  "IN_OPMAAK",
  "GEACTUALISEERD",
  "AFGEROND",
] as const;

type Status =
  (typeof STATUSSEN)[number];

function controleerId(id: number) {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Ongeldig terreincontrole-ID.",
    );
  }
}

function tekst(
  formData: FormData,
  naam: string,
) {
  return String(
    formData.get(naam) ?? "",
  ).trim();
}

function optioneleTekst(
  formData: FormData,
  naam: string,
) {
  return (
    tekst(formData, naam) ||
    null
  );
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

    if (
      url.protocol !== "https:" ||
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

    const patroon =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return patroon.test(attestId)
      ? attestId
      : null;
  } catch {
    return null;
  }
}

function geldigeStatus(
  waarde: string,
): waarde is Status {
  return STATUSSEN.includes(
    waarde as Status,
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
  return (
    gebruiker.naam?.trim() ||
    [
      gebruiker.voornaam,
      gebruiker.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.email
  );
}

function herlaad(id: number) {
  revalidatePath(
    "/terreincontroles",
  );
  revalidatePath(
    "/terreincontroles/verwijderd",
  );
  revalidatePath(
    `/terreincontroles/${id}`,
  );
  revalidatePath(
    `/terreincontroles/${id}/bewerken`,
  );
  revalidatePath(
    "/mijn-overzicht",
  );
}

export async function wijzigTerreincontroleStatus(
  id: number,
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  controleerId(id);

  const status = tekst(
    formData,
    "status",
  );

  if (!geldigeStatus(status)) {
    throw new Error(
      "Ongeldige status.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const bestaand =
        await tx.terreincontroleDossier.findFirst({
          where: {
            id,
            verwijderdOp: null,
          },
          select: {
            status: true,
            attestnummer: true,
          },
        });

      if (!bestaand) {
        throw new Error(
          "De terreincontrole bestaat niet of is verwijderd.",
        );
      }

      if (
        bestaand.status === status
      ) {
        return;
      }

      await tx.terreincontroleDossier.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });

      await schrijfAuditlog(
        tx,
        gebruiker,
        {
          actie:
            "TERREINCONTROLE_STATUS_GEWIJZIGD",
          entiteit:
            "TERREINCONTROLE_DOSSIER",
          entiteitId: id,
          omschrijving:
            "Status van terreincontrole gewijzigd.",
          oudeWaarde: {
            status:
              bestaand.status,
          },
          nieuweWaarde: {
            status,
          },
          metadata: {
            attestnummer:
              bestaand.attestnummer,
          },
        },
      );
    },
  );

  herlaad(id);
}

export async function voegTerreincontroleVaststellingToe(
  id: number,
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  controleerId(id);

  const ncId = tekst(
    formData,
    "ncId",
  );

  if (!ncId) {
    throw new Error(
      "NC-ID is verplicht.",
    );
  }

  const invoer = {
    parameter:
      optioneleTekst(
        formData,
        "parameter",
      ),
    ncId,
    omschrijving:
      optioneleTekst(
        formData,
        "omschrijving",
      ),
    vastgesteldDoorCi:
      optioneleTekst(
        formData,
        "vastgesteldDoorCi",
      ),
    verduidelijking:
      optioneleTekst(
        formData,
        "verduidelijking",
      ),
    groteImpact:
      optioneleTekst(
        formData,
        "groteImpact",
      ),
    categorie:
      optioneleTekst(
        formData,
        "categorie",
      ),
    motivatieAanpassing:
      optioneleTekst(
        formData,
        "motivatieAanpassing",
      ),
  };

  await prisma.$transaction(
    async (tx) => {
      const dossier =
        await tx.terreincontroleDossier.findFirst({
          where: {
            id,
            verwijderdOp: null,
          },
          select: {
            id: true,
            attestnummer: true,
          },
        });

      if (!dossier) {
        throw new Error(
          "De terreincontrole bestaat niet of is verwijderd.",
        );
      }

      const laatste =
        await tx.terreincontroleVaststelling.findFirst({
          where: {
            terreincontroleDossierId:
              id,
          },
          orderBy: {
            excelRij: "desc",
          },
          select: {
            excelRij: true,
          },
        });

      const vaststelling =
        await tx.terreincontroleVaststelling.create({
          data: {
            terreincontroleDossierId:
              id,
            excelRij:
              (laatste?.excelRij ??
                15) + 1,
            ...invoer,
          },
          select: {
            id: true,
          },
        });

      await schrijfAuditlog(
        tx,
        gebruiker,
        {
          actie:
            "TERREINCONTROLE_VASTSTELLING_TOEGEVOEGD",
          entiteit:
            "TERREINCONTROLE_VASTSTELLING",
          entiteitId:
            vaststelling.id,
          omschrijving:
            "Vaststelling aan terreincontrole toegevoegd.",
          nieuweWaarde: invoer,
          metadata: {
            terreincontroleId: id,
            attestnummer:
              dossier.attestnummer,
          },
        },
      );
    },
  );

  herlaad(id);
}

export async function verwijderTerreincontroleVaststelling(
  terreincontroleId: number,
  vaststellingId: number,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  controleerId(
    terreincontroleId,
  );
  controleerId(
    vaststellingId,
  );

  await prisma.$transaction(
    async (tx) => {
      const vaststelling =
        await tx.terreincontroleVaststelling.findFirst({
          where: {
            id: vaststellingId,
            terreincontroleDossierId:
              terreincontroleId,
            terreincontroleDossier: {
              verwijderdOp: null,
            },
          },
        });

      if (!vaststelling) {
        throw new Error(
          "De vaststelling bestaat niet.",
        );
      }

      await tx.terreincontroleVaststelling.delete({
        where: {
          id: vaststellingId,
        },
      });

      await schrijfAuditlog(
        tx,
        gebruiker,
        {
          actie:
            "TERREINCONTROLE_VASTSTELLING_VERWIJDERD",
          entiteit:
            "TERREINCONTROLE_VASTSTELLING",
          entiteitId:
            vaststellingId,
          omschrijving:
            "Vaststelling van terreincontrole verwijderd.",
          oudeWaarde: {
            ncId:
              vaststelling.ncId,
            parameter:
              vaststelling.parameter,
            omschrijving:
              vaststelling.omschrijving,
            vastgesteldDoorCi:
              vaststelling.vastgesteldDoorCi,
            verduidelijking:
              vaststelling.verduidelijking,
            groteImpact:
              vaststelling.groteImpact,
            categorie:
              vaststelling.categorie,
            motivatieAanpassing:
              vaststelling.motivatieAanpassing,
          },
          metadata: {
            terreincontroleId,
          },
        },
      );
    },
  );

  herlaad(
    terreincontroleId,
  );
}

export async function verwijderTerreincontrole(
  id: number,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  controleerId(id);

  const verwijderdOp =
    new Date();

  await prisma.$transaction(
    async (tx) => {
      const dossier =
        await tx.terreincontroleDossier.findFirst({
          where: {
            id,
            verwijderdOp: null,
          },
          select: {
            attestnummer: true,
            status: true,
          },
        });

      if (!dossier) {
        throw new Error(
          "De terreincontrole bestaat niet of is al verwijderd.",
        );
      }

      await tx.terreincontroleDossier.update({
        where: {
          id,
        },
        data: {
          verwijderdOp,
        },
      });

      await schrijfAuditlog(
        tx,
        gebruiker,
        {
          actie:
            "TERREINCONTROLE_VERWIJDERD",
          entiteit:
            "TERREINCONTROLE_DOSSIER",
          entiteitId: id,
          omschrijving:
            "Terreincontrole naar verwijderde terreincontroles verplaatst.",
          oudeWaarde: {
            verwijderdOp: null,
          },
          nieuweWaarde: {
            verwijderdOp:
              verwijderdOp.toISOString(),
          },
          metadata: {
            attestnummer:
              dossier.attestnummer,
            status:
              dossier.status,
          },
        },
      );
    },
  );

  herlaad(id);

  redirect(
    "/terreincontroles?verwijderd=1",
  );
}

export async function herstelTerreincontrole(
  id: number,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  controleerId(id);

  await prisma.$transaction(
    async (tx) => {
      const dossier =
        await tx.terreincontroleDossier.findFirst({
          where: {
            id,
            verwijderdOp: {
              not: null,
            },
          },
          select: {
            attestnummer: true,
            status: true,
            verwijderdOp: true,
          },
        });

      if (
        !dossier?.verwijderdOp
      ) {
        throw new Error(
          "De terreincontrole bestaat niet of is al hersteld.",
        );
      }

      await tx.terreincontroleDossier.update({
        where: {
          id,
        },
        data: {
          verwijderdOp: null,
        },
      });

      await schrijfAuditlog(
        tx,
        gebruiker,
        {
          actie:
            "TERREINCONTROLE_HERSTELD",
          entiteit:
            "TERREINCONTROLE_DOSSIER",
          entiteitId: id,
          omschrijving:
            "Verwijderde terreincontrole hersteld.",
          oudeWaarde: {
            verwijderdOp:
              dossier.verwijderdOp.toISOString(),
          },
          nieuweWaarde: {
            verwijderdOp: null,
          },
          metadata: {
            attestnummer:
              dossier.attestnummer,
            status:
              dossier.status,
          },
        },
      );
    },
  );

  herlaad(id);

  redirect(
    "/terreincontroles/verwijderd?hersteld=1",
  );
}

export async function bewerkTerreincontrole(
  id: number,
  formData: FormData,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  controleerId(id);

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

  const status = tekst(
    formData,
    "status",
  );

  const datumControle =
    leesDatum(
      tekst(
        formData,
        "datumControle",
      ),
    );

  const adres =
    optioneleTekst(
      formData,
      "adres",
    );

  const opmerkingen =
    optioneleTekst(
      formData,
      "opmerkingen",
    );

  const attestId =
    haalAttestIdUitLink(
      linkAttest,
    );

  if (
    !auditeurGebruikerId ||
    !lidId ||
    !procescertificaatId ||
    !linkAttest ||
    !attestId ||
    !attestnummer ||
    !geldigeStatus(status) ||
    !datumControle
  ) {
    throw new Error(
      "Niet alle verplichte gegevens zijn geldig.",
    );
  }

  if (
    opmerkingen &&
    opmerkingen.length > 5000
  ) {
    throw new Error(
      "Opmerkingen zijn te lang.",
    );
  }

  if (
    adres &&
    adres.length > 1000
  ) {
    throw new Error(
      "Adres is te lang.",
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

  if (
    !auditeurGebruiker ||
    !lid ||
    !procescertificaat
  ) {
    throw new Error(
      "Een gekozen koppeling bestaat niet meer.",
    );
  }

  const auditeur =
    gebruikersnaam(
      auditeurGebruiker,
    );

  await prisma.$transaction(
    async (tx) => {
      const bestaand =
        await tx.terreincontroleDossier.findFirst({
          where: {
            id,
            verwijderdOp: null,
          },
        });

      if (!bestaand) {
        throw new Error(
          "De terreincontrole bestaat niet of is verwijderd.",
        );
      }

      const nieuweWaarden = {
        auditeur,
        auditeurGebruikerId:
          auditeurGebruiker.id,
        naamAdi:
          lid.naamPersoon,
        linkAttest,
        attestId,
        attestnummer,
        status,
        certificatiePlatform:
          lid.certificatiePlatform,
        opmerkingen,
        datumControle,
        adres,
        persoonsId:
          lid.ovamId,
        lidId:
          lid.id,
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
      };

      await tx.terreincontroleDossier.update({
        where: {
          id,
        },
        data: nieuweWaarden,
      });

      await schrijfAuditlog(
        tx,
        gebruiker,
        {
          actie:
            "TERREINCONTROLE_GEWIJZIGD",
          entiteit:
            "TERREINCONTROLE_DOSSIER",
          entiteitId: id,
          omschrijving:
            "Terreincontrolegegevens gewijzigd.",
          oudeWaarde: {
            auditeur:
              bestaand.auditeur,
            naamAdi:
              bestaand.naamAdi,
            linkAttest:
              bestaand.linkAttest,
            attestnummer:
              bestaand.attestnummer,
            status:
              bestaand.status,
            opmerkingen:
              bestaand.opmerkingen,
            datumControle:
              bestaand.datumControle.toISOString(),
            adres:
              bestaand.adres,
            persoonsId:
              bestaand.persoonsId,
            bedrijfsnaam:
              bestaand.bedrijfsnaam,
            ondernemingsnummer:
              bestaand.ondernemingsnummer,
          },
          nieuweWaarde: {
            auditeur,
            naamAdi:
              lid.naamPersoon,
            linkAttest,
            attestnummer,
            status,
            opmerkingen,
            datumControle:
              datumControle.toISOString(),
            adres,
            persoonsId:
              lid.ovamId,
            bedrijfsnaam:
              procescertificaat
                .naamBedrijf,
            ondernemingsnummer:
              procescertificaat
                .kboNummer,
          },
          metadata: {
            attestnummer,
          },
        },
      );
    },
  );

  herlaad(id);

  redirect(
    `/terreincontroles/${id}?gewijzigd=1`,
  );
}

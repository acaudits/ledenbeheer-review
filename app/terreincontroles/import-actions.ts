"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import {
  isGeldigOndernemingsnummer,
  normaliseerOndernemingsnummer,
} from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export type TerreincontroleImportState = {
  message?: string;
  succes?: boolean;
  errors?: {
    excelBestand?: string;
  };
};

type VaststellingInvoer = {
  excelRij: number;
  parameter: string | null;
  ncId: string;
  omschrijving: string | null;
  vastgesteldDoorCi: string | null;
  verduidelijking: string | null;
  groteImpact: string | null;
  categorie: string | null;
  motivatieAanpassing: string | null;
};

const WERKBLAD_NAAM =
  "Terreincontrole samenvatting";

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

function maakUtcDatum(
  jaar: number,
  maand: number,
  dag: number,
) {
  if (
    !Number.isInteger(jaar) ||
    !Number.isInteger(maand) ||
    !Number.isInteger(dag)
  ) {
    return null;
  }

  const datum = new Date(
    Date.UTC(
      jaar,
      maand - 1,
      dag,
    ),
  );

  if (
    datum.getUTCFullYear() !== jaar ||
    datum.getUTCMonth() !==
      maand - 1 ||
    datum.getUTCDate() !== dag
  ) {
    return null;
  }

  return datum;
}

function normaliseerTekst(
  waarde: unknown,
) {
  const tekst = String(
    waarde ?? "",
  ).trim();

  const klein =
    tekst.toLocaleLowerCase(
      "nl-BE",
    );

  if (
    !tekst ||
    klein === "nan" ||
    klein === "nat" ||
    klein === "null"
  ) {
    return "";
  }

  return tekst;
}

function leesCelTekst(
  cel: ExcelJS.Cell,
) {
  const waarde = cel.value;

  if (
    waarde === null ||
    waarde === undefined
  ) {
    return "";
  }

  if (waarde instanceof Date) {
    return waarde
      .toISOString()
      .slice(0, 10);
  }

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return normaliseerTekst(
      waarde,
    );
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(
      waarde.richText,
    )
  ) {
    return normaliseerTekst(
      waarde.richText
        .map((deel) => {
          if (
            typeof deel ===
              "object" &&
            deel !== null &&
            "text" in deel
          ) {
            return String(
              deel.text,
            );
          }

          return "";
        })
        .join(""),
    );
  }

  if (
    typeof waarde === "object" &&
    "result" in waarde
  ) {
    return normaliseerTekst(
      waarde.result,
    );
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde
  ) {
    return normaliseerTekst(
      waarde.text,
    );
  }

  return normaliseerTekst(
    cel.text,
  );
}

function optioneleCelTekst(
  cel: ExcelJS.Cell,
) {
  return (
    leesCelTekst(cel) ||
    null
  );
}

function leesExcelDatum(
  cel: ExcelJS.Cell,
) {
  const waarde = cel.value;

  if (waarde instanceof Date) {
    return maakUtcDatum(
      waarde.getUTCFullYear(),
      waarde.getUTCMonth() + 1,
      waarde.getUTCDate(),
    );
  }

  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    const tijdstip =
      Date.UTC(1899, 11, 30) +
      Math.floor(waarde) *
        24 *
        60 *
        60 *
        1000;

    const datum =
      new Date(tijdstip);

    return maakUtcDatum(
      datum.getUTCFullYear(),
      datum.getUTCMonth() + 1,
      datum.getUTCDate(),
    );
  }

  const tekst =
    leesCelTekst(cel);

  if (!tekst) {
    return null;
  }

  let gevonden = tekst.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  );

  if (gevonden) {
    return maakUtcDatum(
      Number(gevonden[1]),
      Number(gevonden[2]),
      Number(gevonden[3]),
    );
  }

  gevonden = tekst.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (gevonden) {
    return maakUtcDatum(
      Number(gevonden[3]),
      Number(gevonden[2]),
      Number(gevonden[1]),
    );
  }

  return null;
}

function leesOndernemingsnummer(
  cel: ExcelJS.Cell,
) {
  const waarde = cel.value;

  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    let tekst = String(
      Math.trunc(waarde),
    );

    const aantalNullen =
      typeof cel.numFmt ===
      "string"
        ? (
            cel.numFmt.match(
              /0/g,
            ) ?? []
          ).length
        : 0;

    if (
      aantalNullen === 9 ||
      aantalNullen === 10
    ) {
      tekst = tekst.padStart(
        aantalNullen,
        "0",
      );
    }

    return normaliseerOndernemingsnummer(
      tekst,
    );
  }

  return normaliseerOndernemingsnummer(
    leesCelTekst(cel),
  );
}

function leesHyperlink(
  cel: ExcelJS.Cell,
) {
  if (
    typeof cel.hyperlink ===
      "string" &&
    cel.hyperlink.trim()
  ) {
    return cel.hyperlink.trim();
  }

  const waarde = cel.value;

  if (
    typeof waarde === "object" &&
    waarde !== null &&
    "hyperlink" in waarde &&
    typeof waarde.hyperlink ===
      "string"
  ) {
    return waarde.hyperlink.trim();
  }

  const tekst =
    leesCelTekst(cel);

  if (
    tekst.startsWith(
      "https://",
    ) ||
    tekst.startsWith(
      "http://",
    )
  ) {
    return tekst;
  }

  return "";
}

function haalAttestIdUitLink(
  linkAttest: string,
) {
  try {
    const url = new URL(
      linkAttest,
    );

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

    return patroon.test(
      attestId,
    )
      ? attestId
      : null;
  } catch {
    return null;
  }
}

function heeftLabel(
  cel: ExcelJS.Cell,
  verwacht: string,
) {
  return leesCelTekst(cel)
    .toLocaleLowerCase("nl-BE")
    .includes(
      verwacht.toLocaleLowerCase(
        "nl-BE",
      ),
    );
}

function normaliseerNaam(
  waarde: string,
) {
  return waarde
    .trim()
    .toLocaleLowerCase("nl-BE")
    .replace(/\s+/g, " ");
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

function fout(
  message: string,
  excelBestand?: string,
): TerreincontroleImportState {
  return {
    succes: false,
    message,
    errors: excelBestand
      ? {
          excelBestand,
        }
      : undefined,
  };
}

export async function importeerTerreincontroleUitExcel(
  _vorigeStatus:
    TerreincontroleImportState,
  formData: FormData,
): Promise<TerreincontroleImportState> {
  const ingelogdeGebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  /*
   * Tijdens de bulkimport wordt C7
   * volledig genegeerd. De gewone
   * import behoudt de bestaande
   * procescertificaatcontrole.
   */
  const bulkimport =
    formData.get("bulkimport") ===
    "1";

  const bestandWaarde =
    formData.get(
      "excelBestand",
    );

  const bestand =
    bestandWaarde instanceof File
      ? bestandWaarde
      : null;

  if (
    !bestand ||
    bestand.size === 0
  ) {
    return fout(
      "Kies een Excelbestand.",
      "Excelbestand is verplicht.",
    );
  }

  if (
    !bestand.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return fout(
      "Alleen .xlsx-bestanden worden ondersteund.",
      "Kies een geldig .xlsx-bestand.",
    );
  }

  if (
    bestand.size >
    MAXIMALE_BESTANDSGROOTTE
  ) {
    return fout(
      "Het Excelbestand is te groot.",
      "De maximale bestandsgrootte is 15 MB.",
    );
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    const buffer = Buffer.from(
      await bestand.arrayBuffer(),
    );

    werkboek =
      new ExcelJS.Workbook();

    await werkboek.xlsx.load(
      buffer as unknown as Parameters<
        typeof werkboek.xlsx.load
      >[0],
    );
  } catch (error) {
    console.error(
      "Excelbestand openen mislukt:",
      error,
    );

    return fout(
      "Het Excelbestand kon niet worden geopend.",
      "Controleer of het bestand geldig en niet beschadigd is.",
    );
  }

  const werkblad =
    werkboek.getWorksheet(
      WERKBLAD_NAAM,
    );

  if (!werkblad) {
    return fout(
      `Het werkblad "${WERKBLAD_NAAM}" werd niet gevonden.`,
      `Hernoem het juiste tabblad exact naar "${WERKBLAD_NAAM}".`,
    );
  }

  const indelingGeldig =
    heeftLabel(
      werkblad.getCell("A4"),
      "Attestnummer",
    ) &&
    heeftLabel(
      werkblad.getCell("A6"),
      "Inspectielocatie",
    ) &&
    heeftLabel(
      werkblad.getCell("B6"),
      "PersoonsID",
    ) &&
    heeftLabel(
      werkblad.getCell("C6"),
      "Ondernemingsnummer",
    ) &&
    heeftLabel(
      werkblad.getCell("D13"),
      "Gecontroleerd op",
    );

  if (!indelingGeldig) {
    return fout(
      "Het Excelbestand heeft niet de verwachte indeling.",
      `Controleer of dit een geldige export van "${WERKBLAD_NAAM}" is.`,
    );
  }

  const attestnummer =
    leesCelTekst(
      werkblad.getCell("A5"),
    ).toUpperCase();

  const adres =
    optioneleCelTekst(
      werkblad.getCell("A7"),
    );

  const persoonsId =
    leesCelTekst(
      werkblad.getCell("B7"),
    ).toUpperCase();

  const ondernemingsnummer =
    leesOndernemingsnummer(
      werkblad.getCell("C7"),
    );

  const linkAttest =
    leesHyperlink(
      werkblad.getCell("A8"),
    );

  const attestId =
    haalAttestIdUitLink(
      linkAttest,
    );

  const datumControle =
    leesExcelDatum(
      werkblad.getCell("E13"),
    );

  const auditeur =
    leesCelTekst(
      werkblad.getCell("G13"),
    );

  if (!attestnummer) {
    return fout(
      "Attestnummer ontbreekt.",
      "Cel A5 bevat geen attestnummer.",
    );
  }

  if (
    attestnummer.length > 255
  ) {
    return fout(
      "Attestnummer is te lang.",
      "Cel A5 mag maximaal 255 tekens bevatten.",
    );
  }

  if (!persoonsId) {
    return fout(
      "PersoonsID ontbreekt.",
      "Cel B7 bevat geen PersoonsID.",
    );
  }

  if (
    !bulkimport &&
    !isGeldigOndernemingsnummer(
      ondernemingsnummer,
    )
  ) {
    return fout(
      "Het ondernemingsnummer is niet geldig.",
      "Controleer cel C7.",
    );
  }

  if (!linkAttest || !attestId) {
    return fout(
      "De attestlink is niet geldig.",
      "Cel A8 moet een geldige OVAM-attestlink bevatten.",
    );
  }

  if (!datumControle) {
    return fout(
      "Datum controle ontbreekt of is ongeldig.",
      "Cel E13 bevat geen geldige datum.",
    );
  }

  if (!auditeur) {
    return fout(
      "Auditeur ontbreekt.",
      "Cel G13 bevat geen auditeur.",
    );
  }

  if (
    adres &&
    adres.length > 1000
  ) {
    return fout(
      "Het adres is te lang.",
      "Cel A7 mag maximaal 1000 tekens bevatten.",
    );
  }

  const vaststellingen:
    VaststellingInvoer[] = [];

  for (
    let rij = 16;
    rij <= werkblad.rowCount;
    rij++
  ) {
    const ncId =
      leesCelTekst(
        werkblad.getCell(
          `B${rij}`,
        ),
      );

    if (!ncId) {
      continue;
    }

    vaststellingen.push({
      excelRij: rij,
      parameter:
        optioneleCelTekst(
          werkblad.getCell(
            `A${rij}`,
          ),
        ),
      ncId,
      omschrijving:
        optioneleCelTekst(
          werkblad.getCell(
            `C${rij}`,
          ),
        ),
      vastgesteldDoorCi:
        optioneleCelTekst(
          werkblad.getCell(
            `D${rij}`,
          ),
        ),
      verduidelijking:
        optioneleCelTekst(
          werkblad.getCell(
            `E${rij}`,
          ),
        ),
      groteImpact:
        optioneleCelTekst(
          werkblad.getCell(
            `F${rij}`,
          ),
        ),
      categorie:
        optioneleCelTekst(
          werkblad.getCell(
            `G${rij}`,
          ),
        ),
      motivatieAanpassing:
        optioneleCelTekst(
          werkblad.getCell(
            `H${rij}`,
          ),
        ),
    });
  }

  const [
    lid,
    procescertificaten,
    auditeurs,
    bestaand,
  ] = await Promise.all([
    prisma.lid.findFirst({
      where: {
        ovamId: {
          equals:
            persoonsId,
          mode: "insensitive",
        },
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

    prisma.procescertificaat.findMany({
      where: {
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamBedrijf: true,
        kboNummer: true,
        certificaatnummer: true,
      },
    }),

    prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rol: "AUDITEUR",
      },
      select: {
        id: true,
        naam: true,
        voornaam: true,
        achternaam: true,
        email: true,
      },
    }),

    prisma.terreincontroleDossier.findFirst({
      where: {
        OR: [
          { attestId },
          { linkAttest },
          { attestnummer },
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
    return fout(
      `Geen actief persoonscertificaat gevonden voor PersoonsID ${persoonsId}.`,
      "Controleer cel B7.",
    );
  }

  const genormaliseerdNummer =
    normaliseerOndernemingsnummer(
      ondernemingsnummer,
    );

  const overeenkomendeProcessen =
    procescertificaten.filter(
      (proces) =>
        normaliseerOndernemingsnummer(
          proces.kboNummer,
        ) ===
        genormaliseerdNummer,
    );

  if (
    !bulkimport &&
    overeenkomendeProcessen.length >
    1
  ) {
    return fout(
      `Meerdere procescertificaten gevonden voor ${ondernemingsnummer}.`,
      "Los eerst de dubbele procescertificaten op.",
    );
  }

  /*
   * Bij bulkimport wordt C7 niet
   * gebruikt voor validatie of
   * koppeling.
   */
  const procescertificaat =
    bulkimport
      ? null
      : overeenkomendeProcessen[0] ??
        null;

  if (
    !bulkimport &&
    !procescertificaat
  ) {
    return fout(
      `Geen actief procescertificaat gevonden voor ${ondernemingsnummer}.`,
      "Controleer cel C7.",
    );
  }

  if (bestaand) {
    if (
      bestaand.attestnummer ===
      attestnummer
    ) {
      return fout(
        "Dit attestnummer bestaat al in Terreincontroles.",
        attestnummer,
      );
    }

    return fout(
      "Voor deze attestlink bestaat al een terreincontrole.",
      "Het bestand werd mogelijk al geïmporteerd.",
    );
  }

  const genormaliseerdeAuditeur =
    normaliseerNaam(
      auditeur,
    );

  const gekoppeldeAuditeur =
    auditeurs.find(
      (gebruiker) => {
        const namen = [
          gebruikersnaam(
            gebruiker,
          ),
          gebruiker.naam ?? "",
          [
            gebruiker.voornaam,
            gebruiker.achternaam,
          ]
            .filter(Boolean)
            .join(" "),
          gebruiker.email,
        ]
          .map(normaliseerNaam)
          .filter(Boolean);

        return namen.includes(
          genormaliseerdeAuditeur,
        );
      },
    ) ?? null;

  let nieuwId: number | null =
    null;

  try {
    nieuwId =
      await prisma.$transaction(
        async (tx) => {
          const nieuw =
            await tx.terreincontroleDossier.create({
              data: {
                auditeur,
                auditeurGebruikerId:
                  gekoppeldeAuditeur?.id ??
                  null,

                naamAdi:
                  lid.naamPersoon,

                linkAttest,
                attestId,
                attestnummer,

                status: "GEEN",

                certificatiePlatform:
                  lid.certificatiePlatform,

                opmerkingen: null,
                datumControle,
                adres,

                persoonsId:
                  lid.ovamId,
                lidId:
                  lid.id,

                /*
                 * C7 wordt bij bulkimport
                 * genegeerd. De verplichte
                 * momentopnamevelden krijgen
                 * dan een lege waarde en er
                 * wordt geen procescertificaat
                 * gekoppeld.
                 */
                bedrijfsnaam:
                  procescertificaat
                    ?.naamBedrijf ??
                  "",

                ondernemingsnummer:
                  procescertificaat
                    ?.kboNummer ??
                  "",

                procescertificaatId:
                  procescertificaat
                    ?.id ??
                  null,

                persoonscertificaatNummer:
                  lid.certificaatnummer,

                procescertificaatNummer:
                  procescertificaat
                    ?.certificaatnummer ??
                  "",

                bronBestandsnaam:
                  bestand.name,

                vaststellingen: {
                  create:
                    vaststellingen.map(
                      (
                        vaststelling,
                      ) => ({
                        excelRij:
                          vaststelling.excelRij,
                        parameter:
                          vaststelling.parameter,
                        ncId:
                          vaststelling.ncId,
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
                      }),
                    ),
                },
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
                "TERREINCONTROLE_EXCEL_GEIMPORTEERD",
              entiteit:
                "TERREINCONTROLE_DOSSIER",
              entiteitId:
                nieuw.id,
              omschrijving:
                "Terreincontrole met vaststellingen uit Excel geïmporteerd.",
              nieuweWaarde: {
                auditeur,
                naamAdi:
                  lid.naamPersoon,
                attestnummer,
                status: "GEEN",
                datumControle:
                  datumControle.toISOString(),
                persoonsId:
                  lid.ovamId,
                bedrijfsnaam:
                  procescertificaat
                    ?.naamBedrijf ??
                  null,
                ondernemingsnummer:
                  procescertificaat
                    ?.kboNummer ??
                  null,
                aantalVaststellingen:
                  vaststellingen.length,
              },
              metadata: {
                attestnummer,
                bestandsnaam:
                  bestand.name,
                werkblad:
                  WERKBLAD_NAAM,
                aantalVaststellingen:
                  vaststellingen.length,
              },
            },
          );

          return nieuw.id;
        },
      );
  } catch (error) {
    if (
      isUniekheidsfout(
        error,
      )
    ) {
      return fout(
        "Het attestnummer, de attestlink of het attest-ID bestaat al.",
        "Dit bestand werd mogelijk al geïmporteerd.",
      );
    }

    console.error(
      "Excelimport terreincontrole mislukt:",
      error,
    );

    return fout(
      "Er is een technische fout opgetreden tijdens de Excelimport.",
      "De terreincontrole kon niet worden opgeslagen.",
    );
  }

  if (!nieuwId) {
    return fout(
      "De terreincontrole kon niet worden aangemaakt.",
      "Onbekende fout tijdens de import.",
    );
  }

  revalidatePath(
    "/terreincontroles",
  );

  revalidatePath(
    `/terreincontroles/${nieuwId}`,
  );

  redirect(
    `/terreincontroles/${nieuwId}?geimporteerd=1`,
  );
}

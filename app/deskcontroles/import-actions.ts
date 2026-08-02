"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisMachtiging } from "@/lib/auth";
import {
  isGeldigOndernemingsnummer,
  normaliseerOndernemingsnummer,
} from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export type ExcelImportState = {
  message?: string;
  errors?: {
    finalisatieDatum?: string;
    excelBestand?: string;
  };
};

type DeskcontroleTypeWaarde =
  | "NIEUWE_CONTROLE"
  | "OPVOLGING";

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
  "Deskcontrole samenvatting";

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
    Date.UTC(jaar, maand - 1, dag),
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

function leesIsoDatum(
  waarde: string,
) {
  const gevonden = waarde.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (!gevonden) {
    return null;
  }

  return maakUtcDatum(
    Number(gevonden[1]),
    Number(gevonden[2]),
    Number(gevonden[3]),
  );
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

function normaliseerTekst(
  waarde: unknown,
) {
  const tekst = String(
    waarde ?? "",
  ).trim();

  if (
    !tekst ||
    tekst.toLocaleLowerCase(
      "nl-BE",
    ) === "nan" ||
    tekst.toLocaleLowerCase(
      "nl-BE",
    ) === "nat"
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
    return normaliseerTekst(waarde);
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(waarde.richText)
  ) {
    return normaliseerTekst(
      waarde.richText
        .map((deel) => {
          if (
            typeof deel === "object" &&
            deel !== null &&
            "text" in deel
          ) {
            return String(deel.text);
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
  const waarde = leesCelTekst(cel);

  return waarde || null;
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

  /*
   * Excel bewaart datums soms als
   * serienummer.
   */
  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    const dagen =
      Math.floor(waarde);

    const tijdstip =
      Date.UTC(1899, 11, 30) +
      dagen *
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

function leesOndernemingsnummerUitCel(
  cel: ExcelJS.Cell,
) {
  const waarde = cel.value;

  /*
   * Belgische nummers kunnen in Excel
   * als getal opgeslagen zijn. Daarbij
   * kan een voorloopnul alleen via de
   * Excel-getalnotatie zichtbaar zijn.
   */
  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    let tekst = String(
      Math.trunc(waarde),
    );

    const aantalNullen =
      typeof cel.numFmt === "string"
        ? (
            cel.numFmt.match(/0/g) ??
            []
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

  return "";
}

function haalAttestIdUitLink(
  linkAttest: string,
) {
  try {
    const url = new URL(
      linkAttest,
    );

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

    return uuidPatroon.test(
      attestId,
    )
      ? attestId
      : null;
  } catch {
    return null;
  }
}

function leesTypeControle(
  cel: ExcelJS.Cell,
): DeskcontroleTypeWaarde | null {
  const waarde = leesCelTekst(cel)
    .toLocaleLowerCase("nl-BE")
    .replace(/\s+/g, " ")
    .trim();

  if (
    waarde === "nieuwe controle"
  ) {
    return "NIEUWE_CONTROLE";
  }

  if (waarde === "opvolging") {
    return "OPVOLGING";
  }

  return null;
}

function heeftVerwachtLabel(
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

export async function importeerDeskcontroleUitExcel(
  _vorigeStatus: ExcelImportState,
  formData: FormData,
): Promise<ExcelImportState> {
  await vereisMachtiging("DESKCONTROLES_BEHEREN");

  /*
   * Alleen de bulkimport mag verwijderde
   * persoonscertificaten gebruiken en C7
   * negeren. De gewone import behoudt
   * de bestaande controles.
   */
  const bulkimport =
    formData.get("bulkimport") === "1";

  const errors: NonNullable<
    ExcelImportState["errors"]
  > = {};

  const finalisatieDatumWaarde =
    String(
      formData.get(
        "finalisatieDatum",
      ) ?? "",
    ).trim();

  const finalisatieDatum =
    leesIsoDatum(
      finalisatieDatumWaarde,
    );

  if (!finalisatieDatumWaarde) {
    errors.finalisatieDatum =
      "Finalisatie Datum is verplicht voordat je een Excelbestand kunt uploaden.";
  } else if (!finalisatieDatum) {
    errors.finalisatieDatum =
      "Vul een geldige Finalisatie Datum in.";
  }

  const bestandWaarde =
    formData.get("excelBestand");

  const bestand =
    bestandWaarde instanceof File
      ? bestandWaarde
      : null;

  if (
    !bestand ||
    bestand.size === 0
  ) {
    errors.excelBestand =
      "Kies een Excelbestand.";
  } else {
    const bestandsnaam =
      bestand.name.toLowerCase();

    if (
      !bestandsnaam.endsWith(
        ".xlsx",
      )
    ) {
      errors.excelBestand =
        "Alleen .xlsx-bestanden worden ondersteund.";
    }

    if (
      bestand.size >
      MAXIMALE_BESTANDSGROOTTE
    ) {
      errors.excelBestand =
        "Het Excelbestand mag maximaal 15 MB groot zijn.";
    }
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
    !bestand ||
    !finalisatieDatum
  ) {
    return {
      message:
        "Finalisatie Datum en Excelbestand zijn verplicht.",
      errors,
    };
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    const arrayBuffer =
      await bestand.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    werkboek =
      new ExcelJS.Workbook();

    const excelBuffer =
      buffer as unknown as Parameters<
        typeof werkboek.xlsx.load
      >[0];

    await werkboek.xlsx.load(
      excelBuffer,
    );
  } catch (fout) {
    console.error(
      "Excelbestand openen mislukt:",
      fout,
    );

    return {
      message:
        "Het Excelbestand kon niet worden geopend. Controleer of het een geldig .xlsx-bestand is.",
      errors: {
        excelBestand:
          "Ongeldig of beschadigd Excelbestand.",
      },
    };
  }

  const werkblad =
    werkboek.getWorksheet(
      WERKBLAD_NAAM,
    );

  if (!werkblad) {
    return {
      message:
        `Het werkblad "${WERKBLAD_NAAM}" werd niet gevonden.`,
      errors: {
        excelBestand:
          `Het Excelbestand moet het tabblad "${WERKBLAD_NAAM}" bevatten.`,
      },
    };
  }

  /*
   * Andere werkbladen worden bewust
   * volledig genegeerd.
   */
  const indelingGeldig =
    heeftVerwachtLabel(
      werkblad.getCell("A4"),
      "Attestnummer",
    ) &&
    heeftVerwachtLabel(
      werkblad.getCell("A6"),
      "Inspectielocatie",
    ) &&
    heeftVerwachtLabel(
      werkblad.getCell("B6"),
      "PersoonsID",
    ) &&
    heeftVerwachtLabel(
      werkblad.getCell("C6"),
      "Ondernemingsnummer",
    ) &&
    heeftVerwachtLabel(
      werkblad.getCell("D12"),
      "Controleactie",
    ) &&
    heeftVerwachtLabel(
      werkblad.getCell("D13"),
      "Gecontroleerd op",
    );

  if (!indelingGeldig) {
    return {
      message:
        "Het Excelbestand heeft niet de verwachte indeling.",
      errors: {
        excelBestand:
          `Controleer of dit een geldige export van "${WERKBLAD_NAAM}" is.`,
      },
    };
  }

  const attestnummer =
    leesCelTekst(
      werkblad.getCell("A5"),
    ).toUpperCase();

  const adres =
    optioneleCelTekst(
      werkblad.getCell("A7"),
    );

  const ovamId =
    leesCelTekst(
      werkblad.getCell("B7"),
    ).toUpperCase();

  const ondernemingsnummer =
  normaliseerOndernemingsnummer(
    leesOndernemingsnummerUitCel(
      werkblad.getCell("C7"),
    ),
  );


  const linkAttest =
    leesHyperlink(
      werkblad.getCell("A8"),
    );

  const attestId =
    haalAttestIdUitLink(
      linkAttest,
    );

  const typeControle =
    leesTypeControle(
      werkblad.getCell("E12"),
    );

  /*
   * Datum controle wordt altijd
   * uitsluitend uit E13 gelezen.
   */
  const datumControle =
    leesExcelDatum(
      werkblad.getCell("E13"),
    );

  const auditeur =
    leesCelTekst(
      werkblad.getCell("G13"),
    );

  if (!attestnummer) {
    errors.excelBestand =
      "Cel A5 bevat geen attestnummer.";
  } else if (
    attestnummer.length > 255
  ) {
    errors.excelBestand =
      "Het attestnummer in cel A5 is te lang.";
  }

  if (!ovamId) {
    errors.excelBestand =
      "Cel B7 bevat geen OVAM-ID.";
  }

  if (
    !bulkimport &&
    !isGeldigOndernemingsnummer(
      ondernemingsnummer,
    )
  ) {
    errors.excelBestand =
      "Cel C7 bevat geen geldig Belgisch ondernemingsnummer of EU-btw-nummer.";
  }

  if (!linkAttest) {
    errors.excelBestand =
      "Cel A8 bevat geen hyperlink.";
  } else if (!attestId) {
    errors.excelBestand =
      "De hyperlink in cel A8 is geen geldige OVAM-attestlink.";
  }

  if (!typeControle) {
    errors.excelBestand =
      'Cel E12 moet "Nieuwe controle" of "Opvolging" bevatten.';
  }

  if (!datumControle) {
    errors.excelBestand =
      "Cel E13 bevat geen geldige Datum controle.";
  }

  if (!auditeur) {
    errors.excelBestand =
      "Cel G13 bevat geen auditeur.";
  }

  if (
    adres &&
    adres.length > 1000
  ) {
    errors.excelBestand =
      "Het adres in cel A7 is langer dan 1000 tekens.";
  }

  if (
    datumControle &&
    finalisatieDatum.getTime() >
      datumControle.getTime()
  ) {
    errors.finalisatieDatum =
      "Finalisatie Datum mag niet na de Datum controle uit cel E13 liggen.";
  }

  if (
    Object.keys(errors).length > 0
  ) {
    return {
      message:
        "De gegevens in het Excelbestand zijn niet geldig.",
      errors,
    };
  }

  if (
    !attestId ||
    !typeControle ||
    !datumControle
  ) {
    return {
      message:
        "Niet alle verplichte Excelgegevens zijn geldig.",
      errors: {
        excelBestand:
          "Controleer het Excelbestand.",
      },
    };
  }

  const vaststellingen:
    VaststellingInvoer[] = [];

  /*
   * Rij 15 is de koprij.
   * De gegevens beginnen op rij 16.
   * Alleen rijen met een waarde in
   * kolom B worden verwerkt.
   */
  for (
    let rijnummer = 16;
    rijnummer <=
    werkblad.rowCount;
    rijnummer++
  ) {
    const ncId =
      leesCelTekst(
        werkblad.getCell(
          `B${rijnummer}`,
        ),
      );

    if (!ncId) {
      continue;
    }

    vaststellingen.push({
      excelRij: rijnummer,

      parameter:
        optioneleCelTekst(
          werkblad.getCell(
            `A${rijnummer}`,
          ),
        ),

      ncId,

      omschrijving:
        optioneleCelTekst(
          werkblad.getCell(
            `C${rijnummer}`,
          ),
        ),

      vastgesteldDoorCi:
        optioneleCelTekst(
          werkblad.getCell(
            `D${rijnummer}`,
          ),
        ),

      verduidelijking:
        optioneleCelTekst(
          werkblad.getCell(
            `E${rijnummer}`,
          ),
        ),

      groteImpact:
        optioneleCelTekst(
          werkblad.getCell(
            `F${rijnummer}`,
          ),
        ),

      categorie:
        optioneleCelTekst(
          werkblad.getCell(
            `G${rijnummer}`,
          ),
        ),

      motivatieAanpassing:
        optioneleCelTekst(
          werkblad.getCell(
            `H${rijnummer}`,
          ),
        ),
    });
  }

  const [
    lid,
    procescertificaten,
    bestaandeDeskcontrole,
  ] = await Promise.all([
    /*
     * Persoon wordt uitsluitend
     * gekoppeld via OVAM-ID.
     */
    prisma.lid.findFirst({
      where: {
        ovamId: {
          equals: ovamId,
          mode: "insensitive",
        },
        /*
         * Bij bulkimport mag het OVAM-ID
         * ook bij de verwijderde
         * persoonscertificaten staan.
         */
        ...(bulkimport
          ? {}
          : {
              verwijderdOp: null,
            }),
      },
      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
        certificaatnummer: true,
        certificatiePlatform: true,
      },
    }),

    /*
     * Procescertificaat wordt uitsluitend
     * gekoppeld via het genormaliseerde
     * ondernemingsnummer.
     */
    prisma.procescertificaat.findMany({
      where: {
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamBedrijf: true,
        kboNummer: true,
        certificaatnummer: true,
        oneDrive: true,
      },
    }),

    prisma.deskcontrole.findFirst({
      where: {
        OR: [
          {
            attestId,
          },
          {
            attestnummer,
          },
          {
            linkAttest,
          },
        ],
      },
      select: {
        id: true,
        attestId: true,
        attestnummer: true,
        linkAttest: true,
      },
    }),
  ]);

  if (!lid) {
    return {
      message:
        bulkimport
          ? `Er werd geen actief of verwijderd persoonscertificaat gevonden voor OVAM-ID ${ovamId}.`
          : `Er werd geen actief persoonscertificaat gevonden voor OVAM-ID ${ovamId}.`,
      errors: {
        excelBestand:
          "Controleer de waarde in cel B7.",
      },
    };
  }

  const genormaliseerdOndernemingsnummer =
    normaliseerOndernemingsnummer(
      ondernemingsnummer,
    );

  const overeenkomendeProcessen =
    procescertificaten.filter(
      (procescertificaat) =>
        normaliseerOndernemingsnummer(
          procescertificaat.kboNummer,
        ) ===
        genormaliseerdOndernemingsnummer,
    );

  if (
    !bulkimport &&
    overeenkomendeProcessen.length >
    1
  ) {
    return {
      message:
        `Er werden meerdere actieve procescertificaten gevonden voor ondernemingsnummer ${ondernemingsnummer}.`,
      errors: {
        excelBestand:
          "Los eerst de dubbele procescertificaten op.",
      },
    };
  }

  /*
   * C7 wordt bij bulkimport bewust
   * niet gecontroleerd of gekoppeld.
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
    return {
      message:
        `Er werd geen actief procescertificaat gevonden voor ondernemingsnummer ${ondernemingsnummer}.`,
      errors: {
        excelBestand:
          "Controleer de waarde in cel C7.",
      },
    };
  }

  if (bestaandeDeskcontrole) {
    if (
      bestaandeDeskcontrole.attestnummer ===
      attestnummer
    ) {
      return {
        message:
          "Dit attestnummer bestaat al.",
        errors: {
          excelBestand:
            `Attestnummer ${attestnummer} werd al geïmporteerd.`,
        },
      };
    }

    return {
      message:
        "Voor deze attestlink bestaat al een deskcontrole.",
      errors: {
        excelBestand:
          "Het attest-ID of de hyperlink uit cel A8 bestaat al.",
      },
    };
  }

  const deadlineSanctie =
    telDagenBij(
      datumControle,
      21,
    );

  const deadlineCorrectie =
    telDagenBij(
      finalisatieDatum,
      30,
    );

  let nieuweDeskcontroleId:
    number | null = null;

  try {
    const nieuweDeskcontrole =
      await prisma.$transaction(
        async (transactie) => {
          return transactie.deskcontrole.create(
            {
              data: {
                attestId,
                auditeur,
                lidId: lid.id,
                procescertificaatId:
                  procescertificaat?.id ??
                  null,
                linkAttest,
                attestnummer,
                status: "GEEN",
                deadlineSanctie,
                mailSanctieVerzonden:
                  false,
                typeControle,
                deadlineCorrectie,
                mailCorrectieVerzonden:
                  false,

                /*
                 * OneDrive komt uit het
                 * gekoppelde
                 * procescertificaat.
                 */
                oneDrive:
                  procescertificaat?.oneDrive ??
                  null,

                voorwaardelijkeOpheffing:
                  false,
                opmerkingen: null,
                datumControle,
                adres,
                finalisatieDatum,

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
            },
          );
        },
      );

    nieuweDeskcontroleId =
      nieuweDeskcontrole.id;
  } catch (fout) {
    if (
      isPrismaUniekheidsfout(
        fout,
      )
    ) {
      return {
        message:
          "Het attestnummer, de attestlink of het attest-ID bestaat al.",
        errors: {
          excelBestand:
            "Dit Excelbestand werd mogelijk al geïmporteerd.",
        },
      };
    }

    console.error(
      "Excelimport deskcontrole mislukt:",
      fout,
    );

    return {
      message:
        "Er is een technische fout opgetreden tijdens de Excelimport.",
      errors: {
        excelBestand:
          "De deskcontrole kon niet worden opgeslagen.",
      },
    };
  }

  if (!nieuweDeskcontroleId) {
    return {
      message:
        "De deskcontrole kon niet worden aangemaakt.",
      errors: {
        excelBestand:
          "Onbekende fout tijdens de import.",
      },
    };
  }

  revalidatePath("/");
  revalidatePath(
    "/deskcontroles",
  );
  revalidatePath(
    `/deskcontroles/${nieuweDeskcontroleId}`,
  );

  redirect(
    `/deskcontroles/${nieuweDeskcontroleId}?geimporteerd=1`,
  );
}

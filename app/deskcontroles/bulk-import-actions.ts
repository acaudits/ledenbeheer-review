"use server";

import ExcelJS from "exceljs";

import {
  importeerDeskcontroleUitExcel,
  type ExcelImportState,
} from "@/app/deskcontroles/import-actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WERKBLAD_DATUMREGISTER =
  "OVAM attesten";

const WERKBLAD_DESKCONTROLE =
  "Deskcontrole samenvatting";

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

const MAXIMALE_DATUMREGISTERGROOTTE =
  5 * 1024 * 1024;

const MAXIMALE_BATCHGROOTTE = 20;

export type BulkImportStatus =
  | "GEIMPORTEERD"
  | "OVERGESLAGEN"
  | "MISLUKT";

export type BulkImportBestandResultaat = {
  bestandsnaam: string;
  attestnummer: string;
  finalisatieDatum: string;
  status: BulkImportStatus;
  message: string;
  deskcontroleId?: number;
  aantalVaststellingen: number;
};

export type BulkImportBatchResultaat = {
  succes: boolean;
  message: string;
  resultaten: BulkImportBestandResultaat[];
};

type DatumregisterResultaat =
  | {
      succes: true;
      datums: Map<string, string>;
      dubbeleAttestnummers: Set<string>;
    }
  | {
      succes: false;
      message: string;
    };

function normaliseerTekst(
  waarde: unknown,
) {
  return String(
    waarde ?? "",
  ).trim();
}

function normaliseerAttestnummer(
  waarde: unknown,
) {
  return normaliseerTekst(
    waarde,
  ).toUpperCase();
}

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

function formatteerIsoDatum(
  datum: Date,
) {
  const jaar =
    datum.getUTCFullYear();

  const maand = String(
    datum.getUTCMonth() + 1,
  ).padStart(2, "0");

  const dag = String(
    datum.getUTCDate(),
  ).padStart(2, "0");

  return `${jaar}-${maand}-${dag}`;
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
    return waarde.toISOString();
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
    "text" in waarde
  ) {
    return normaliseerTekst(
      waarde.text,
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
    "richText" in waarde &&
    Array.isArray(
      waarde.richText,
    )
  ) {
    return waarde.richText
      .map((deel) => {
        if (
          typeof deel === "object" &&
          deel !== null &&
          "text" in deel
        ) {
          return String(
            deel.text ?? "",
          );
        }

        return "";
      })
      .join("")
      .trim();
  }

  return normaliseerTekst(
    cel.text,
  );
}

function leesDatumUitCel(
  cel: ExcelJS.Cell,
) {
  const waarde = cel.value;

  if (waarde instanceof Date) {
    const datum = maakUtcDatum(
      waarde.getUTCFullYear(),
      waarde.getUTCMonth() + 1,
      waarde.getUTCDate(),
    );

    return datum
      ? formatteerIsoDatum(
          datum,
        )
      : null;
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

    const excelDatum =
      new Date(tijdstip);

    const datum = maakUtcDatum(
      excelDatum.getUTCFullYear(),
      excelDatum.getUTCMonth() + 1,
      excelDatum.getUTCDate(),
    );

    return datum
      ? formatteerIsoDatum(
          datum,
        )
      : null;
  }

  const tekst =
    leesCelTekst(cel);

  const gevonden = tekst.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  );

  if (!gevonden) {
    return null;
  }

  const datum = maakUtcDatum(
    Number(gevonden[1]),
    Number(gevonden[2]),
    Number(gevonden[3]),
  );

  return datum
    ? formatteerIsoDatum(
        datum,
      )
    : null;
}

async function laadWerkboek(
  bestand: File,
) {
  const buffer = Buffer.from(
    await bestand.arrayBuffer(),
  );

  const werkboek =
    new ExcelJS.Workbook();

  await werkboek.xlsx.load(
    buffer as unknown as Parameters<
      typeof werkboek.xlsx.load
    >[0],
  );

  return werkboek;
}

async function leesDatumregister(
  bestand: File,
): Promise<DatumregisterResultaat> {
  if (
    !bestand.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return {
      succes: false,
      message:
        "Het datumregister moet een .xlsx-bestand zijn.",
    };
  }

  if (
    bestand.size === 0 ||
    bestand.size >
      MAXIMALE_DATUMREGISTERGROOTTE
  ) {
    return {
      succes: false,
      message:
        "Het datumregister is leeg of groter dan 5 MB.",
    };
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    werkboek =
      await laadWerkboek(
        bestand,
      );
  } catch (error) {
    console.error(
      "Datumregister openen mislukt:",
      error,
    );

    return {
      succes: false,
      message:
        "Het datumregister kon niet worden geopend.",
    };
  }

  const werkblad =
    werkboek.getWorksheet(
      WERKBLAD_DATUMREGISTER,
    );

  if (!werkblad) {
    return {
      succes: false,
      message:
        `Het werkblad "${WERKBLAD_DATUMREGISTER}" werd niet gevonden.`,
    };
  }

  const kopA =
    leesCelTekst(
      werkblad.getCell("A1"),
    )
      .toLocaleLowerCase(
        "nl-BE",
      )
      .replace(/\s+/g, "");

  const kopB =
    leesCelTekst(
      werkblad.getCell("B1"),
    )
      .toLocaleLowerCase(
        "nl-BE",
      )
      .replace(/\s+/g, "");

  if (
    kopA !== "attestnummer" ||
    kopB !== "uitgegevenop"
  ) {
    return {
      succes: false,
      message:
        'Kolom A moet "attestNummer" en kolom B moet "uitgegevenOp" bevatten.',
    };
  }

  const datums =
    new Map<string, string>();

  const dubbeleAttestnummers =
    new Set<string>();

  for (
    let rij = 2;
    rij <= werkblad.rowCount;
    rij++
  ) {
    const attestnummer =
      normaliseerAttestnummer(
        leesCelTekst(
          werkblad.getCell(
            `A${rij}`,
          ),
        ),
      );

    const finalisatieDatum =
      leesDatumUitCel(
        werkblad.getCell(
          `B${rij}`,
        ),
      );

    if (
      !attestnummer &&
      !finalisatieDatum
    ) {
      continue;
    }

    if (
      !attestnummer ||
      !finalisatieDatum
    ) {
      continue;
    }

    const bestaandeDatum =
      datums.get(
        attestnummer,
      );

    if (
      bestaandeDatum &&
      bestaandeDatum !==
        finalisatieDatum
    ) {
      dubbeleAttestnummers.add(
        attestnummer,
      );
      continue;
    }

    datums.set(
      attestnummer,
      finalisatieDatum,
    );
  }

  if (datums.size === 0) {
    return {
      succes: false,
      message:
        "Het datumregister bevat geen geldige attestnummers en datums.",
    };
  }

  return {
    succes: true,
    datums,
    dubbeleAttestnummers,
  };
}

type DeskcontroleVoorcontrole =
  | {
      succes: true;
      attestnummer: string;
      aantalVaststellingen: number;
    }
  | {
      succes: false;
      attestnummer: string;
      message: string;
    };

async function controleerDeskcontroleBestand(
  bestand: File,
): Promise<DeskcontroleVoorcontrole> {
  if (
    !bestand.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return {
      succes: false,
      attestnummer: "",
      message:
        "Alleen .xlsx-bestanden worden ondersteund.",
    };
  }

  if (
    bestand.size === 0 ||
    bestand.size >
      MAXIMALE_BESTANDSGROOTTE
  ) {
    return {
      succes: false,
      attestnummer: "",
      message:
        "Het bestand is leeg of groter dan 15 MB.",
    };
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    werkboek =
      await laadWerkboek(
        bestand,
      );
  } catch {
    return {
      succes: false,
      attestnummer: "",
      message:
        "Het Excelbestand kon niet worden geopend.",
    };
  }

  const werkblad =
    werkboek.getWorksheet(
      WERKBLAD_DESKCONTROLE,
    );

  if (!werkblad) {
    return {
      succes: false,
      attestnummer: "",
      message:
        `Het werkblad "${WERKBLAD_DESKCONTROLE}" ontbreekt.`,
    };
  }

  const attestnummer =
    normaliseerAttestnummer(
      leesCelTekst(
        werkblad.getCell(
          "A5",
        ),
      ),
    );

  if (!attestnummer) {
    return {
      succes: false,
      attestnummer: "",
      message:
        "Cel A5 bevat geen attestnummer.",
    };
  }

  let aantalVaststellingen = 0;

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

    if (ncId) {
      aantalVaststellingen++;
    }
  }

  return {
    succes: true,
    attestnummer,
    aantalVaststellingen,
  };
}

function isRedirectFout(
  error: unknown,
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("digest" in error)
  ) {
    return false;
  }

  const digest =
    String(
      error.digest ?? "",
    );

  return digest.startsWith(
    "NEXT_REDIRECT",
  );
}

function geefImportFout(
  status: ExcelImportState,
) {
  return (
    status.errors
      ?.excelBestand ||
    status.errors
      ?.finalisatieDatum ||
    status.message ||
    "Onbekende importfout."
  );
}

function isDuplicaatmelding(
  message: string,
) {
  const klein =
    message.toLocaleLowerCase(
      "nl-BE",
    );

  return (
    klein.includes(
      "bestaat al",
    ) ||
    klein.includes(
      "al gemporteerd",
    ) ||
    klein.includes(
      "al geïmporteerd",
    ) ||
    klein.includes(
      "mogelijk al",
    )
  );
}

export async function importeerDeskcontroleBatch(
  formData: FormData,
): Promise<BulkImportBatchResultaat> {
  await vereisMachtiging(
    "DESKCONTROLES_BEHEREN",
  );

  const datumregisterWaarde =
    formData.get(
      "datumregister",
    );

  const datumregister =
    datumregisterWaarde instanceof
      File
      ? datumregisterWaarde
      : null;

  const bestanden =
    formData
      .getAll(
        "excelBestanden",
      )
      .filter(
        (
          waarde,
        ): waarde is File =>
          waarde instanceof File,
      );

  if (!datumregister) {
    return {
      succes: false,
      message:
        "Selecteer het Excelbestand met attestnummers en finalisatiedatums.",
      resultaten: [],
    };
  }

  if (
    bestanden.length === 0
  ) {
    return {
      succes: false,
      message:
        "Deze batch bevat geen deskcontrolebestanden.",
      resultaten: [],
    };
  }

  if (
    bestanden.length >
    MAXIMALE_BATCHGROOTTE
  ) {
    return {
      succes: false,
      message:
        `Een batch mag maximaal ${MAXIMALE_BATCHGROOTTE} bestanden bevatten.`,
      resultaten: [],
    };
  }

  const registerResultaat =
    await leesDatumregister(
      datumregister,
    );

  if (
    !registerResultaat.succes
  ) {
    return {
      succes: false,
      message:
        registerResultaat.message,
      resultaten: [],
    };
  }

  const resultaten:
    BulkImportBestandResultaat[] =
    [];

  for (
    const bestand of bestanden
  ) {
    const voorcontrole =
      await controleerDeskcontroleBestand(
        bestand,
      );

    if (
      !voorcontrole.succes
    ) {
      resultaten.push({
        bestandsnaam:
          bestand.name,
        attestnummer:
          voorcontrole.attestnummer,
        finalisatieDatum: "",
        status: "MISLUKT",
        message:
          voorcontrole.message,
        aantalVaststellingen: 0,
      });

      continue;
    }

    const {
      attestnummer,
      aantalVaststellingen,
    } = voorcontrole;

    if (
      registerResultaat
        .dubbeleAttestnummers
        .has(attestnummer)
    ) {
      resultaten.push({
        bestandsnaam:
          bestand.name,
        attestnummer,
        finalisatieDatum: "",
        status: "MISLUKT",
        message:
          "Het datumregister bevat voor dit attestnummer meerdere verschillende datums.",
        aantalVaststellingen,
      });

      continue;
    }

    const finalisatieDatum =
      registerResultaat.datums.get(
        attestnummer,
      );

    if (!finalisatieDatum) {
      resultaten.push({
        bestandsnaam:
          bestand.name,
        attestnummer,
        finalisatieDatum: "",
        status: "MISLUKT",
        message:
          "Het attestnummer werd niet gevonden in het datumregister.",
        aantalVaststellingen,
      });

      continue;
    }

    const formulier =
      new FormData();

    formulier.set(
      "finalisatieDatum",
      finalisatieDatum,
    );

    formulier.set(
      "excelBestand",
      bestand,
    );

    let status:
      ExcelImportState | null =
      null;

    let geimporteerd = false;

    try {
      status =
        await importeerDeskcontroleUitExcel(
          {},
          formulier,
        );
    } catch (error) {
      if (
        isRedirectFout(
          error,
        )
      ) {
        geimporteerd = true;
      } else {
        console.error(
          `Bulkimport mislukt voor ${bestand.name}:`,
          error,
        );

        resultaten.push({
          bestandsnaam:
            bestand.name,
          attestnummer,
          finalisatieDatum,
          status: "MISLUKT",
          message:
            "Technische fout tijdens de import.",
          aantalVaststellingen,
        });

        continue;
      }
    }

    if (geimporteerd) {
      const aangemaakt =
        await prisma.deskcontrole.findFirst({
          where: {
            attestnummer,
          },
          select: {
            id: true,
            _count: {
              select: {
                vaststellingen: true,
              },
            },
          },
        });

      resultaten.push({
        bestandsnaam:
          bestand.name,
        attestnummer,
        finalisatieDatum,
        status: "GEIMPORTEERD",
        message:
          "Deskcontrole en vaststellingen geïmporteerd.",
        deskcontroleId:
          aangemaakt?.id,
        aantalVaststellingen:
          aangemaakt?._count
            .vaststellingen ??
          aantalVaststellingen,
      });

      continue;
    }

    const message =
      geefImportFout(
        status ?? {},
      );

    resultaten.push({
      bestandsnaam:
        bestand.name,
      attestnummer,
      finalisatieDatum,
      status:
        isDuplicaatmelding(
          message,
        )
          ? "OVERGESLAGEN"
          : "MISLUKT",
      message,
      aantalVaststellingen,
    });
  }

  const aantalGeimporteerd =
    resultaten.filter(
      (resultaat) =>
        resultaat.status ===
        "GEIMPORTEERD",
    ).length;

  const aantalOvergeslagen =
    resultaten.filter(
      (resultaat) =>
        resultaat.status ===
        "OVERGESLAGEN",
    ).length;

  const aantalMislukt =
    resultaten.filter(
      (resultaat) =>
        resultaat.status ===
        "MISLUKT",
    ).length;

  return {
    succes: true,
    message:
      `${aantalGeimporteerd} geïmporteerd, ` +
      `${aantalOvergeslagen} overgeslagen en ` +
      `${aantalMislukt} mislukt.`,
    resultaten,
  };
}

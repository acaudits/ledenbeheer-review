"use server";

import ExcelJS from "exceljs";

import {
  importeerTerreincontroleUitExcel,
  type TerreincontroleImportState,
} from "@/app/terreincontroles/import-actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WERKBLAD_NAAM =
  "Terreincontrole samenvatting";

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

const MAXIMALE_BATCHGROOTTE = 20;

export type TerreincontroleBulkStatus =
  | "GEIMPORTEERD"
  | "OVERGESLAGEN"
  | "MISLUKT";

export type TerreincontroleBulkResultaat = {
  bestandsnaam: string;
  attestnummer: string;
  status: TerreincontroleBulkStatus;
  message: string;
  terreincontroleId?: number;
  aantalVaststellingen: number;
};

export type TerreincontroleBatchResultaat = {
  succes: boolean;
  message: string;
  resultaten: TerreincontroleBulkResultaat[];
};

type Voorcontrole =
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
    return String(waarde).trim();
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde
  ) {
    return String(
      waarde.text ?? "",
    ).trim();
  }

  if (
    typeof waarde === "object" &&
    "result" in waarde
  ) {
    return String(
      waarde.result ?? "",
    ).trim();
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(waarde.richText)
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

  return String(
    cel.text ?? "",
  ).trim();
}

async function controleerBestand(
  bestand: File,
): Promise<Voorcontrole> {
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
      WERKBLAD_NAAM,
    );

  if (!werkblad) {
    return {
      succes: false,
      attestnummer: "",
      message:
        `Het werkblad "${WERKBLAD_NAAM}" ontbreekt.`,
    };
  }

  const attestnummer =
    leesCelTekst(
      werkblad.getCell("A5"),
    ).toUpperCase();

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
    if (
      leesCelTekst(
        werkblad.getCell(
          `B${rij}`,
        ),
      )
    ) {
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

  return String(
    error.digest ?? "",
  ).startsWith(
    "NEXT_REDIRECT",
  );
}

function geefImportfout(
  status:
    TerreincontroleImportState,
) {
  return (
    status.errors
      ?.excelBestand ||
    status.message ||
    "Onbekende importfout."
  );
}

function isDuplicaatmelding(
  message: string,
) {
  const waarde =
    message.toLocaleLowerCase(
      "nl-BE",
    );

  return (
    waarde.includes(
      "bestaat al",
    ) ||
    waarde.includes(
      "al gemporteerd",
    ) ||
    waarde.includes(
      "mogelijk al",
    )
  );
}

export async function importeerTerreincontroleBatch(
  formData: FormData,
): Promise<TerreincontroleBatchResultaat> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

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

  if (bestanden.length === 0) {
    return {
      succes: false,
      message:
        "Deze batch bevat geen terreincontrolebestanden.",
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

  const resultaten:
    TerreincontroleBulkResultaat[] =
    [];

  for (
    const bestand of bestanden
  ) {
    const voorcontrole =
      await controleerBestand(
        bestand,
      );

    if (!voorcontrole.succes) {
      resultaten.push({
        bestandsnaam:
          bestand.name,
        attestnummer:
          voorcontrole.attestnummer,
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

    const formulier =
      new FormData();

    formulier.set(
      "excelBestand",
      bestand,
    );

    /*
     * Gebruik de speciale bulkregel:
     * cel C7 wordt niet gevalideerd
     * en niet gekoppeld.
     */
    formulier.set(
      "bulkimport",
      "1",
    );

    let status:
      TerreincontroleImportState | null =
      null;

    let geimporteerd = false;

    try {
      status =
        await importeerTerreincontroleUitExcel(
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
          `Bulkimport terreincontrole mislukt voor ${bestand.name}:`,
          error,
        );

        resultaten.push({
          bestandsnaam:
            bestand.name,
          attestnummer,
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
        await prisma.terreincontroleDossier.findFirst({
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
        status: "GEIMPORTEERD",
        message:
          "Terreincontrole en vaststellingen geïmporteerd.",
        terreincontroleId:
          aangemaakt?.id,
        aantalVaststellingen:
          aangemaakt?._count
            .vaststellingen ??
          aantalVaststellingen,
      });

      continue;
    }

    const message =
      geefImportfout(
        status ?? {},
      );

    resultaten.push({
      bestandsnaam:
        bestand.name,
      attestnummer,
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

  const geimporteerd =
    resultaten.filter(
      (resultaat) =>
        resultaat.status ===
        "GEIMPORTEERD",
    ).length;

  const overgeslagen =
    resultaten.filter(
      (resultaat) =>
        resultaat.status ===
        "OVERGESLAGEN",
    ).length;

  const mislukt =
    resultaten.filter(
      (resultaat) =>
        resultaat.status ===
        "MISLUKT",
    ).length;

  return {
    succes: true,
    message:
      `${geimporteerd} geïmporteerd, ` +
      `${overgeslagen} overgeslagen en ` +
      `${mislukt} mislukt.`,
    resultaten,
  };
}

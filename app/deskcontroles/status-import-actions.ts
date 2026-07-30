"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type StatusExcelImportState = {
  succes?: boolean;
  message?: string;
  errors?: {
    excelBestand?: string;
  };
  resultaat?: {
    totaalExcel: number;
    aangepast: number;
    ongewijzigd: number;
    nietGevonden: number;
    ongeldigeRijen: number;
  };
};

type NieuweStatus =
  | "GEEN"
  | "IN_OPMAAK"
  | "GEACTUALISEERD";

type StatusImportRij = {
  excelRij: number;
  attestId: string;
  status: NieuweStatus;
};

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

const MAXIMAAL_AANTAL_RIJEN =
  10_000;

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return String(
      waarde,
    ).trim();
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde &&
    typeof waarde.text ===
      "string"
  ) {
    return waarde.text.trim();
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
    Array.isArray(
      waarde.richText,
    )
  ) {
    return waarde.richText
      .map((deel) => {
        if (
          typeof deel ===
            "object" &&
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

function normaliseerStatus(
  waarde: string,
): NieuweStatus | null {
  const genormaliseerd =
    waarde
      .trim()
      .toLocaleLowerCase(
        "nl-BE",
      )
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  if (
    genormaliseerd === "geen"
  ) {
    return "GEEN";
  }

  if (
    genormaliseerd ===
    "in opmaak"
  ) {
    return "IN_OPMAAK";
  }

  if (
    genormaliseerd ===
    "geactualiseerd"
  ) {
    return "GEACTUALISEERD";
  }

  return null;
}

export async function importeerDeskcontroleStatussen(
  _vorigeStatus:
    StatusExcelImportState,
  formData: FormData,
): Promise<StatusExcelImportState> {
  await vereisMachtiging("DESKCONTROLES_STATUS_IMPORTEREN");

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
    return {
      succes: false,
      message:
        "Kies een Excelbestand.",
      errors: {
        excelBestand:
          "Kies een Excelbestand.",
      },
    };
  }

  if (
    !bestand.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return {
      succes: false,
      message:
        "Alleen .xlsx-bestanden worden ondersteund.",
      errors: {
        excelBestand:
          "Kies een geldig .xlsx-bestand.",
      },
    };
  }

  if (
    bestand.size >
    MAXIMALE_BESTANDSGROOTTE
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand is te groot.",
      errors: {
        excelBestand:
          "Het Excelbestand mag maximaal 15 MB groot zijn.",
      },
    };
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    const arrayBuffer =
      await bestand.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer,
      );

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
      "Status-Excel openen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "Het Excelbestand kon niet worden geopend.",
      errors: {
        excelBestand:
          "Controleer of dit een geldig .xlsx-bestand is.",
      },
    };
  }

  const werkblad =
    werkboek.getWorksheet(
      "Resultaten",
    );

  if (!werkblad) {
    return {
      succes: false,
      message:
        'Het werkblad "Resultaten" werd niet gevonden.',
      errors: {
        excelBestand:
          'Het Excelbestand moet een werkblad "Resultaten" bevatten.',
      },
    };
  }

  const kolomAKop =
    leesCelTekst(
      werkblad.getCell("A1"),
    )
      .trim()
      .toLocaleLowerCase(
        "nl-BE",
      );

  const kolomEKop =
    leesCelTekst(
      werkblad.getCell("E1"),
    )
      .trim()
      .toLocaleLowerCase(
        "nl-BE",
      );

  if (
    kolomAKop !== "inputid" ||
    kolomEKop !== "status"
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand heeft niet de verwachte indeling.",
      errors: {
        excelBestand:
          'Kolom A moet "inputId" bevatten en kolom E moet "status" bevatten.',
      },
    };
  }

  if (
    werkblad.rowCount >
    MAXIMAAL_AANTAL_RIJEN +
      1
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand bevat te veel rijen.",
      errors: {
        excelBestand:
          `Maximaal ${MAXIMAAL_AANTAL_RIJEN} statusrijen zijn toegestaan.`,
      },
    };
  }

  const geldigeRijen:
    StatusImportRij[] = [];

  let ongeldigeRijen = 0;

  for (
    let rijnummer = 2;
    rijnummer <=
    werkblad.rowCount;
    rijnummer++
  ) {
    const attestId =
      leesCelTekst(
        werkblad.getCell(
          `A${rijnummer}`,
        ),
      )
        .trim()
        .toLowerCase();

    const statusTekst =
      leesCelTekst(
        werkblad.getCell(
          `E${rijnummer}`,
        ),
      );

    if (
      !attestId &&
      !statusTekst
    ) {
      continue;
    }

    const status =
      normaliseerStatus(
        statusTekst,
      );

    if (
      !UUID_PATROON.test(
        attestId,
      ) ||
      !status
    ) {
      ongeldigeRijen++;
      continue;
    }

    geldigeRijen.push({
      excelRij: rijnummer,
      attestId,
      status,
    });
  }

  if (
    geldigeRijen.length === 0
  ) {
    return {
      succes: false,
      message:
        "Er werden geen geldige statusrijen gevonden.",
      errors: {
        excelBestand:
          "Controleer kolom A en kolom E.",
      },
      resultaat: {
        totaalExcel: 0,
        aangepast: 0,
        ongewijzigd: 0,
        nietGevonden: 0,
        ongeldigeRijen,
      },
    };
  }

  /*
   * Verwijder dubbele Attest-ID's.
   * De laatste Excelrij is bepalend.
   */
  const uniekeRijen =
    new Map<
      string,
      StatusImportRij
    >();

  for (
    const rij of geldigeRijen
  ) {
    uniekeRijen.set(
      rij.attestId,
      rij,
    );
  }

  const statusRijen =
    Array.from(
      uniekeRijen.values(),
    );

  const attestIds =
    statusRijen.map(
      (rij) => rij.attestId,
    );

  const bestaandeDeskcontroles =
    await prisma.deskcontrole.findMany(
      {
        where: {
          verwijderdOp: null,
          attestId: {
            in: attestIds,
          },
        },
        select: {
          id: true,
          attestId: true,
          status: true,
        },
      },
    );

  const deskcontrolePerAttestId =
    new Map(
      bestaandeDeskcontroles.flatMap(
        (deskcontrole) => {
          const attestId =
            deskcontrole.attestId;
  
          if (!attestId) {
            return [];
          }
  
          return [
            [
              attestId.toLowerCase(),
              deskcontrole,
            ] as const,
          ];
        },
      ),
    );
  

  let aangepast = 0;
  let ongewijzigd = 0;
  let nietGevonden = 0;

  const wijzigingen: {
    id: number;
    status: NieuweStatus;
  }[] = [];

  for (
    const statusRij of
    statusRijen
  ) {
    const deskcontrole =
      deskcontrolePerAttestId.get(
        statusRij.attestId,
      );

    if (!deskcontrole) {
      nietGevonden++;
      continue;
    }

    if (
      deskcontrole.status ===
      statusRij.status
    ) {
      ongewijzigd++;
      continue;
    }

    wijzigingen.push({
      id: deskcontrole.id,
      status:
        statusRij.status,
    });

    aangepast++;
  }

  if (
    wijzigingen.length > 0
  ) {
    await prisma.$transaction(
      wijzigingen.map(
        (wijziging) =>
          prisma.deskcontrole.update({
            where: {
              id: wijziging.id,
            },
            data: {
              status:
                wijziging.status,
            },
          }),
      ),
    );
  }


  revalidatePath("/");
  revalidatePath(
    "/deskcontroles",
  );
  revalidatePath(
    "/deskcontroles/verwijderd",
  );

  return {
    succes: true,
    message:
      `${aangepast} status(sen) aangepast, ` +
      `${ongewijzigd} ongewijzigd, ` +
      `${nietGevonden} niet gevonden en ` +
      `${ongeldigeRijen} ongeldig.`,

    resultaat: {
      totaalExcel:
        statusRijen.length,
      aangepast,
      ongewijzigd,
      nietGevonden,
      ongeldigeRijen,
    },
  };
}


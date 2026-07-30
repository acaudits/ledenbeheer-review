"use server";

import ExcelJS from "exceljs";
import {
  revalidatePath,
} from "next/cache";

import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export type ImportStatus = {
  succes?: boolean;
  message?: string;
  aantalPersonen?: number;
  aantalBedrijven?: number;
  aantalExcelRijen?: number;
};

export type CorrectieStatus = {
  succes?: boolean;
  message?: string;
};

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

const MAXIMAAL_AANTAL_RIJEN =
  100_000;

function normaliseerTekst(
  waarde: unknown,
) {
  if (
    waarde === null ||
    waarde === undefined
  ) {
    return "";
  }

  return String(waarde)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseerPersoonsId(
  waarde: unknown,
) {
  return normaliseerTekst(
    waarde,
  ).toUpperCase();
}

function normaliseerBedrijfsnaamSleutel(
  waarde: unknown,
) {
  return normaliseerTekst(
    waarde,
  ).toLocaleLowerCase(
    "nl-BE",
  );
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

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return normaliseerTekst(
      waarde,
    );
  }

  if (waarde instanceof Date) {
    return waarde.toISOString();
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde &&
    typeof waarde.text ===
      "string"
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
    return normaliseerTekst(
      waarde.richText
        .map((deel) => {
          if (
            typeof deel ===
              "object" &&
            deel !== null &&
            "text" in deel
          ) {
            return normaliseerTekst(
              deel.text,
            );
          }

          return "";
        })
        .join(""),
    );
  }

  return normaliseerTekst(
    cel.text,
  );
}

function maakHeaderSleutel(
  waarde: string,
) {
  return waarde
    .toLocaleLowerCase(
      "nl-BE",
    )
    .replace(/[\s_\-]+/g, "");
}

function vernieuwPaden() {
  revalidatePath(
    "/atteststatistieken",
  );
}

export async function importeerAtteststatistieken(
  _vorigeStatus: ImportStatus,
  formData: FormData,
): Promise<ImportStatus> {
  await vereisIngelogdeGebruiker();

  const bestandWaarde =
    formData.get(
      "excelBestand",
    );

  if (
    !(bestandWaarde instanceof File)
  ) {
    return {
      succes: false,
      message:
        "Selecteer een Excelbestand.",
    };
  }

  if (
    bestandWaarde.size === 0
  ) {
    return {
      succes: false,
      message:
        "Het geselecteerde bestand is leeg.",
    };
  }

  if (
    bestandWaarde.size >
    MAXIMALE_BESTANDSGROOTTE
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand mag maximaal 15 MB groot zijn.",
    };
  }

  if (
    !bestandWaarde.name
      .toLocaleLowerCase()
      .endsWith(".xlsx")
  ) {
    return {
      succes: false,
      message:
        "Alleen .xlsx-bestanden worden ondersteund.",
    };
  }

  const werkmap =
    new ExcelJS.Workbook();

  try {
    const arrayBuffer =
      await bestandWaarde.arrayBuffer();

    await werkmap.xlsx.load(
      Buffer.from(arrayBuffer) as unknown as Parameters<typeof werkmap.xlsx.load>[0],
    );
  } catch (fout) {
    console.error(
      "Excelbestand openen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "Het Excelbestand kon niet worden geopend.",
    };
  }

  const werkblad =
    werkmap.getWorksheet(
      "Export",
    );

  if (!werkblad) {
    return {
      succes: false,
      message:
        'Het werkblad "Export" werd niet gevonden.',
    };
  }

  const aantalExcelRijen =
    Math.max(
      0,
      werkblad.actualRowCount -
        1,
    );

  if (
    aantalExcelRijen >
    MAXIMAAL_AANTAL_RIJEN
  ) {
    return {
      succes: false,
      message:
        `Het bestand bevat meer dan ${MAXIMAAL_AANTAL_RIJEN.toLocaleString(
          "nl-BE",
        )} gegevensrijen.`,
    };
  }

  const verwachteHeaders = [
    {
      kolom: 1,
      toegelaten: [
        "persoonsid",
      ],
      label:
        "Persoons ID (kolom A)",
    },
    {
      kolom: 2,
      toegelaten: [
        "naam",
      ],
      label: "Naam (kolom B)",
    },
    {
      kolom: 5,
      toegelaten: [
        "bedrijfsnaam",
      ],
      label:
        "Bedrijfsnaam (kolom E)",
    },
    {
      kolom: 7,
      toegelaten: [
        "attestnummer",
      ],
      label:
        "Attestnummer (kolom G)",
    },
  ];

  for (
    const verwachteHeader
    of verwachteHeaders
  ) {
    const header =
      maakHeaderSleutel(
        leesCelTekst(
          werkblad.getCell(
            1,
            verwachteHeader.kolom,
          ),
        ),
      );

    if (
      !verwachteHeader
        .toegelaten
        .includes(header)
    ) {
      return {
        succes: false,
        message:
          `De verwachte kolom ontbreekt: ${verwachteHeader.label}.`,
      };
    }
  }

  const personen = new Map<
    string,
    {
      naam: string;
      attestnummers:
        Set<string>;
    }
  >();

  const bedrijven = new Map<
    string,
    {
      bedrijfsnaam: string;
      attestnummers:
        Set<string>;
    }
  >();

  let verwerkteRijen = 0;

  for (
    let rijNummer = 2;
    rijNummer <=
    werkblad.actualRowCount;
    rijNummer += 1
  ) {
    const rij =
      werkblad.getRow(
        rijNummer,
      );

    const persoonsId =
      normaliseerPersoonsId(
        leesCelTekst(
          rij.getCell(1),
        ),
      );

    const naam =
      normaliseerTekst(
        leesCelTekst(
          rij.getCell(2),
        ),
      );

    const bedrijfsnaam =
      normaliseerTekst(
        leesCelTekst(
          rij.getCell(5),
        ),
      );

    const attestnummer =
      normaliseerTekst(
        leesCelTekst(
          rij.getCell(7),
        ),
      );

    if (!attestnummer) {
      continue;
    }

    verwerkteRijen += 1;

    if (persoonsId) {
      const bestaandPersoon =
        personen.get(
          persoonsId,
        );

      if (bestaandPersoon) {
        bestaandPersoon
          .attestnummers
          .add(
            attestnummer,
          );

        if (
          !bestaandPersoon
            .naam &&
          naam
        ) {
          bestaandPersoon.naam =
            naam;
        }
      } else {
        personen.set(
          persoonsId,
          {
            naam,
            attestnummers:
              new Set([
                attestnummer,
              ]),
          },
        );
      }
    }

    if (bedrijfsnaam) {
      const sleutel =
        normaliseerBedrijfsnaamSleutel(
          bedrijfsnaam,
        );

      const bestaandBedrijf =
        bedrijven.get(
          sleutel,
        );

      if (bestaandBedrijf) {
        bestaandBedrijf
          .attestnummers
          .add(
            attestnummer,
          );
      } else {
        bedrijven.set(
          sleutel,
          {
            bedrijfsnaam,
            attestnummers:
              new Set([
                attestnummer,
              ]),
          },
        );
      }
    }
  }

  if (
    verwerkteRijen === 0
  ) {
    return {
      succes: false,
      message:
        "Er werden geen rijen met een attestnummer gevonden.",
    };
  }

  if (
    personen.size === 0
  ) {
    return {
      succes: false,
      message:
        "Er werden geen geldige Persoons ID's gevonden.",
    };
  }

  if (
    bedrijven.size === 0
  ) {
    return {
      succes: false,
      message:
        "Er werden geen geldige bedrijfsnamen gevonden.",
    };
  }

  const persoonGegevens =
    Array.from(
      personen.entries(),
    ).map(
      ([
        persoonsId,
        gegevens,
      ]) => ({
        persoonsId,
        naam:
          gegevens.naam ||
          "Onbekend",
        aantalAttesten:
          gegevens
            .attestnummers
            .size,
        bronBestandsnaam:
          bestandWaarde.name,
      }),
    );

  const bedrijfGegevens =
    Array.from(
      bedrijven.entries(),
    ).map(
      ([
        bedrijfsnaamSleutel,
        gegevens,
      ]) => ({
        bedrijfsnaam:
          gegevens
            .bedrijfsnaam,
        bedrijfsnaamSleutel,
        aantalAttesten:
          gegevens
            .attestnummers
            .size,
        bronBestandsnaam:
          bestandWaarde.name,
      }),
    );

  try {
    await prisma.$transaction(
      async (transactie) => {
        await transactie
          .attestPersoonStatistiek
          .deleteMany();

        await transactie
          .attestBedrijfStatistiek
          .deleteMany();

        await transactie
          .attestPersoonStatistiek
          .createMany({
            data:
              persoonGegevens,
          });

        await transactie
          .attestBedrijfStatistiek
          .createMany({
            data:
              bedrijfGegevens,
          });

        await transactie
          .attestStatistiekImport
          .upsert({
            where: {
              id: 1,
            },

            create: {
              id: 1,
              bronBestandsnaam:
                bestandWaarde.name,
              geimporteerdOp:
                new Date(),
              aantalExcelRijen:
                verwerkteRijen,
              aantalPersonen:
                persoonGegevens.length,
              aantalBedrijven:
                bedrijfGegevens.length,
              correctiesToegepastOp:
                null,
            },

            update: {
              bronBestandsnaam:
                bestandWaarde.name,
              geimporteerdOp:
                new Date(),
              aantalExcelRijen:
                verwerkteRijen,
              aantalPersonen:
                persoonGegevens.length,
              aantalBedrijven:
                bedrijfGegevens.length,
              correctiesToegepastOp:
                null,
            },
          });
      },
      {
        timeout: 120_000,
      },
    );
  } catch (fout) {
    console.error(
      "Atteststatistieken importeren mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De import kon niet worden opgeslagen. De bestaande lijsten zijn niet gewijzigd.",
    };
  }

  vernieuwPaden();

  return {
    succes: true,
    message:
      "De personen- en bedrijvenlijsten zijn volledig vervangen.",
    aantalPersonen:
      persoonGegevens.length,
    aantalBedrijven:
      bedrijfGegevens.length,
    aantalExcelRijen:
      verwerkteRijen,
  };
}

export async function voegAttestCorrectieToe(
  _vorigeStatus: CorrectieStatus,
  formData: FormData,
): Promise<CorrectieStatus> {
  await vereisIngelogdeGebruiker();

  const persoonsId =
    normaliseerPersoonsId(
      formData.get(
        "persoonsId",
      ),
    );

  const bedrijfsnaam =
    normaliseerTekst(
      formData.get(
        "bedrijfsnaam",
      ),
    );

  const naam =
    normaliseerTekst(
      formData.get(
        "naam",
      ),
    );

  const aantalTekst =
    normaliseerTekst(
      formData.get(
        "aantalAttesten",
      ),
    );

  const aantalAttesten =
    Number(aantalTekst);

  if (!persoonsId) {
    return {
      succes: false,
      message:
        "PersoonsID is verplicht.",
    };
  }

  if (
    persoonsId.length > 100
  ) {
    return {
      succes: false,
      message:
        "PersoonsID is te lang.",
    };
  }

  if (!bedrijfsnaam) {
    return {
      succes: false,
      message:
        "Bedrijfsnaam is verplicht.",
    };
  }

  if (
    bedrijfsnaam.length >
    500
  ) {
    return {
      succes: false,
      message:
        "Bedrijfsnaam is te lang.",
    };
  }

  if (!naam) {
    return {
      succes: false,
      message:
        "Naam is verplicht.",
    };
  }

  if (
    naam.length > 255
  ) {
    return {
      succes: false,
      message:
        "Naam is te lang.",
    };
  }

  if (
    !Number.isInteger(
      aantalAttesten,
    ) ||
    aantalAttesten <= 0
  ) {
    return {
      succes: false,
      message:
        "Aantal attesten moet een positief geheel getal zijn.",
    };
  }

  try {
    await prisma
      .attestCorrectie
      .create({
        data: {
          persoonsId,
          bedrijfsnaam,
          naam,
          aantalAttesten,
        },
      });
  } catch (fout) {
    console.error(
      "Attestcorrectie toevoegen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De correctie kon niet worden toegevoegd.",
    };
  }

  vernieuwPaden();

  return {
    succes: true,
    message:
      "De correctie is toegevoegd.",
  };
}

export async function verwijderAttestCorrectie(
  id: number,
): Promise<CorrectieStatus> {
  await vereisIngelogdeGebruiker();

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return {
      succes: false,
      message:
        "Ongeldige correctie.",
    };
  }

  try {
    const resultaat =
      await prisma
        .attestCorrectie
        .deleteMany({
          where: {
            id,
          },
        });

    if (
      resultaat.count === 0
    ) {
      return {
        succes: false,
        message:
          "De correctie bestaat niet.",
      };
    }
  } catch (fout) {
    console.error(
      "Attestcorrectie verwijderen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De correctie kon niet worden verwijderd.",
    };
  }

  vernieuwPaden();

  return {
    succes: true,
    message:
      "De correctie is definitief verwijderd.",
  };
}

export async function pasAttestCorrectiesToe(): Promise<CorrectieStatus> {
  await vereisIngelogdeGebruiker();

  const correcties =
    await prisma
      .attestCorrectie
      .findMany({
        orderBy: {
          id: "asc",
        },
      });

  if (
    correcties.length === 0
  ) {
    return {
      succes: false,
      message:
        "Lijst 3 bevat geen correcties.",
    };
  }

  const persoonCorrecties =
    new Map<
      string,
      {
        naam: string;
        aantal: number;
      }
    >();

  const bedrijfCorrecties =
    new Map<
      string,
      {
        bedrijfsnaam: string;
        aantal: number;
      }
    >();

  for (
    const correctie
    of correcties
  ) {
    const persoonsId =
      normaliseerPersoonsId(
        correctie.persoonsId,
      );

    const bestaandePersoon =
      persoonCorrecties.get(
        persoonsId,
      );

    if (bestaandePersoon) {
      bestaandePersoon.aantal +=
        correctie.aantalAttesten;
    } else {
      persoonCorrecties.set(
        persoonsId,
        {
          naam:
            correctie.naam,
          aantal:
            correctie
              .aantalAttesten,
        },
      );
    }

    const bedrijfSleutel =
      normaliseerBedrijfsnaamSleutel(
        correctie.bedrijfsnaam,
      );

    const bestaandBedrijf =
      bedrijfCorrecties.get(
        bedrijfSleutel,
      );

    if (bestaandBedrijf) {
      bestaandBedrijf.aantal +=
        correctie.aantalAttesten;
    } else {
      bedrijfCorrecties.set(
        bedrijfSleutel,
        {
          bedrijfsnaam:
            correctie
              .bedrijfsnaam,
          aantal:
            correctie
              .aantalAttesten,
        },
      );
    }
  }

  try {
    await prisma.$transaction(
      async (transactie) => {
        const blokkering =
          await transactie
            .attestStatistiekImport
            .updateMany({
              where: {
                id: 1,
                correctiesToegepastOp:
                  null,
              },
              data: {
                correctiesToegepastOp:
                  new Date(),
              },
            });

        if (
          blokkering.count === 0
        ) {
          throw new Error(
            "CORRECTIES_AL_TOEGEPAST_OF_GEEN_IMPORT",
          );
        }

        for (
          const [
            persoonsId,
            gegevens,
          ] of persoonCorrecties
        ) {
          await transactie
            .attestPersoonStatistiek
            .upsert({
              where: {
                persoonsId,
              },

              create: {
                persoonsId,
                naam:
                  gegevens.naam,
                aantalAttesten:
                  gegevens.aantal,
                bronBestandsnaam:
                  "Handmatige correctie",
              },

              update: {
                aantalAttesten: {
                  increment:
                    gegevens.aantal,
                },
              },
            });
        }

        for (
          const [
            bedrijfsnaamSleutel,
            gegevens,
          ] of bedrijfCorrecties
        ) {
          await transactie
            .attestBedrijfStatistiek
            .upsert({
              where: {
                bedrijfsnaamSleutel,
              },

              create: {
                bedrijfsnaam:
                  gegevens
                    .bedrijfsnaam,
                bedrijfsnaamSleutel,
                aantalAttesten:
                  gegevens.aantal,
                bronBestandsnaam:
                  "Handmatige correctie",
              },

              update: {
                aantalAttesten: {
                  increment:
                    gegevens.aantal,
                },
              },
            });
        }
      },
      {
        timeout: 120_000,
      },
    );
  } catch (fout) {
    if (
      fout instanceof Error &&
      fout.message ===
        "CORRECTIES_AL_TOEGEPAST_OF_GEEN_IMPORT"
    ) {
      return {
        succes: false,
        message:
          "De correcties werden al toegepast of er is nog geen Excelimport uitgevoerd.",
      };
    }

    console.error(
      "Attestcorrecties toepassen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De correcties konden niet worden toegepast.",
    };
  }

  vernieuwPaden();

  return {
    succes: true,
    message:
      "De correcties uit lijst 3 zijn bij lijst 1 en lijst 2 opgeteld.",
  };
}

import ExcelJS from "exceljs";

import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type ExportRij = {
  id: number;
  naamPersoonscertificatie: string;
  ovamId: string;
  aantalAttesten: number;
  aantalIngeplandeTerreincontroles: number;
  aantalTerreincontroles: number;
  aantalDeskcontroles: number;
  aantalNonConformiteiten: number;
};

function geefCelRand():
  Partial<ExcelJS.Borders> {
  const rand: ExcelJS.Border = {
    style: "thin",
    color: {
      argb: "FFE2E8F0",
    },
  };

  return {
    top: rand,
    right: rand,
    bottom: rand,
    left: rand,
  };
}

function formatteerWerkblad(
  werkblad: ExcelJS.Worksheet,
) {
  werkblad.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  const koprij =
    werkblad.getRow(1);

  koprij.height = 30;
  koprij.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };
  koprij.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };
  koprij.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF047857",
    },
  };

  koprij.eachCell(
    {
      includeEmpty: true,
    },
    (cel) => {
      cel.border =
        geefCelRand();
    },
  );

  for (
    let rijnummer = 2;
    rijnummer <=
    werkblad.rowCount;
    rijnummer += 1
  ) {
    const rij =
      werkblad.getRow(
        rijnummer,
      );

    rij.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    rij.eachCell(
      {
        includeEmpty: true,
      },
      (cel) => {
        cel.border =
          geefCelRand();

        if (
          rijnummer % 2 === 0
        ) {
          cel.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFF8FAFC",
            },
          };
        }
      },
    );

    for (
      let kolom = 3;
      kolom <= 7;
      kolom += 1
    ) {
      const cel =
        rij.getCell(kolom);

      cel.numFmt = "0";
      cel.alignment = {
        vertical: "middle",
        horizontal: "right",
      };
    }
  }

  werkblad.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },
    to: {
      row: Math.max(
        werkblad.rowCount,
        1,
      ),
      column:
        werkblad.columnCount,
    },
  };
}

type TargetStatus =
  | "GRIJS"
  | "ROOD"
  | "GEEL"
  | "GROEN";

function berekenTargetStatus(
  rij: ExportRij,
): TargetStatus {
  if (rij.aantalAttesten === 0) {
    return "GRIJS";
  }

  if (
    rij.aantalDeskcontroles === 0 ||
    rij.aantalIngeplandeTerreincontroles === 0
  ) {
    return "ROOD";
  }

  const targetDeskcontroles =
    Math.ceil(
      rij.aantalAttesten * 0.05,
    );

  const targetTerreincontroles =
    Math.min(
      4,
      Math.ceil(
        rij.aantalAttesten / 100,
      ),
    );

  if (
    rij.aantalDeskcontroles >=
      targetDeskcontroles &&
    rij.aantalIngeplandeTerreincontroles >=
      targetTerreincontroles
  ) {
    return "GROEN";
  }

  return "GEEL";
}

function geefTargetRijkleur(
  status: TargetStatus,
) {
  switch (status) {
    case "GROEN":
      return "FFECFDF5";

    case "GEEL":
      return "FFFFFBEB";

    case "ROOD":
      return "FFFEF2F2";

    case "GRIJS":
      return "FFF8FAFC";
  }
}

export async function GET() {
  await vereisMachtiging(
    "ATTESTSTATISTIEKEN_BEHEREN",
  );

  const [
    leden,
    ingeplandeTerreincontroles,
  ] = await Promise.all([
    prisma.lid.findMany({
      where: {
        verwijderdOp: null,
      },
      orderBy: [
        {
          naamPersoon: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
        deskcontroles: {
          where: {
            verwijderdOp: null,
          },
          select: {
            _count: {
              select: {
                vaststellingen: true,
              },
            },
          },
        },
        terreincontroleDossiers: {
          where: {
            verwijderdOp: null,
          },
          select: {
            _count: {
              select: {
                vaststellingen: true,
              },
            },
          },
        },
      },
    }),

    prisma.terreincontrole.groupBy({
      by: [
        "ovamId",
      ],
      where: {
        verwijderdOp: null,
        afwezigOp: null,
        ovamId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const atteststatistieken =
    await prisma
      .attestPersoonStatistiek
      .findMany({
        select: {
          persoonsId: true,
          aantalAttesten: true,
        },
      });

  const attestenPerPersoonsId =
    new Map<string, number>();

  for (
    const statistiek
    of atteststatistieken
  ) {
    const persoonsId =
      statistiek.persoonsId
        .trim()
        .toUpperCase();

    if (persoonsId) {
      attestenPerPersoonsId.set(
        persoonsId,
        statistiek.aantalAttesten,
      );
    }
  }

  const ingeplandePerOvamId =
    new Map<string, number>();

  for (
    const telling
    of ingeplandeTerreincontroles
  ) {
    const ovamId =
      telling.ovamId?.trim();

    if (ovamId) {
      ingeplandePerOvamId.set(
        ovamId,
        telling._count._all,
      );
    }
  }

  const rijen: ExportRij[] =
    leden.map((lid) => {
      const aantalDeskcontroles =
        lid.deskcontroles.length;

      const aantalTerreincontroles =
        lid.terreincontroleDossiers.length;

      const deskcontroleNc =
        lid.deskcontroles.reduce(
          (
            totaal,
            deskcontrole,
          ) =>
            totaal +
            deskcontrole._count
              .vaststellingen,
          0,
        );

      const terreincontroleNc =
        lid.terreincontroleDossiers.reduce(
          (
            totaal,
            terreincontrole,
          ) =>
            totaal +
            terreincontrole._count
              .vaststellingen,
          0,
        );

      return {
        id: lid.id,
        naamPersoonscertificatie:
          lid.naamPersoon,
        ovamId: lid.ovamId,
        aantalAttesten:
          attestenPerPersoonsId.get(
            lid.ovamId
              .trim()
              .toUpperCase(),
          ) ?? 0,
        aantalIngeplandeTerreincontroles:
          ingeplandePerOvamId.get(
            lid.ovamId.trim(),
          ) ?? 0,
        aantalTerreincontroles,
        aantalDeskcontroles,
        aantalNonConformiteiten:
          deskcontroleNc +
          terreincontroleNc,
      };
    });

  const werkboek =
    new ExcelJS.Workbook();

  werkboek.creator =
    "Asbest CRM";
  werkboek.created =
    new Date();

  const werkblad =
    werkboek.addWorksheet(
      "Atteststatistieken",
    );

  werkblad.columns = [
    {
      header:
        "Naam persoonscertificatie",
      key:
        "naamPersoonscertificatie",
      width: 36,
    },
    {
      header: "OVAM-ID",
      key: "ovamId",
      width: 20,
    },
    {
      header:
        "Totaal aantal attesten",
      key: "aantalAttesten",
      width: 24,
    },
    {
      header:
        "Totaal aantal ingeplande terreincontroles",
      key:
        "aantalIngeplandeTerreincontroles",
      width: 28,
    },
    {
      header:
        "Totaal aantal terreincontroles",
      key:
        "aantalTerreincontroles",
      width: 25,
    },
    {
      header:
        "Totaal aantal deskcontroles",
      key:
        "aantalDeskcontroles",
      width: 24,
    },
    {
      header:
        "Totaal aantal non-conformiteiten",
      key:
        "aantalNonConformiteiten",
      width: 28,
    },
  ];

  for (const rij of rijen) {
    werkblad.addRow({
      naamPersoonscertificatie:
        rij.naamPersoonscertificatie,
      ovamId:
        rij.ovamId,
      aantalAttesten:
        rij.aantalAttesten,
      aantalIngeplandeTerreincontroles:
        rij.aantalIngeplandeTerreincontroles,
      aantalTerreincontroles:
        rij.aantalTerreincontroles,
      aantalDeskcontroles:
        rij.aantalDeskcontroles,
      aantalNonConformiteiten:
        rij.aantalNonConformiteiten,
    });
  }

  formatteerWerkblad(
    werkblad,
  );

  // Gebruik dezelfde targetkleuren als
  // de pagina Persoonscertificaten.
  for (
    let index = 0;
    index < rijen.length;
    index += 1
  ) {
    const status =
      berekenTargetStatus(
        rijen[index],
      );

    const kleur =
      geefTargetRijkleur(
        status,
      );

    const excelRij =
      werkblad.getRow(
        index + 2,
      );

    excelRij.eachCell(
      {
        includeEmpty: true,
      },
      (cel) => {
        cel.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: kleur,
          },
        };
      },
    );
  }

  const legendaWerkblad =
    werkboek.addWorksheet(
      "Legende",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

  legendaWerkblad.columns = [
    {
      header: "Kleur",
      key: "kleur",
      width: 16,
    },
    {
      header: "Betekenis",
      key: "betekenis",
      width: 38,
    },
    {
      header: "Gedetailleerde berekening",
      key: "berekening",
      width: 100,
    },
  ];

  const legendaRijen: Array<{
    status: TargetStatus;
    betekenis: string;
    berekening: string;
  }> = [
    {
      status: "GRIJS",
      betekenis:
        "Geen attesten",
      berekening:
        "Totaal aantal attesten staat op 0. De targets voor deskcontroles en ingeplande terreincontroles worden daarom niet beoordeeld.",
    },
    {
      status: "ROOD",
      betekenis:
        "Een controlesoort ontbreekt",
      berekening:
        "Totaal aantal attesten is groter dan 0, maar Totaal aantal deskcontroles staat op 0 of Totaal aantal ingeplande terreincontroles staat op 0.",
    },
    {
      status: "GEEL",
      betekenis:
        "Targets gedeeltelijk behaald",
      berekening:
        "Totaal aantal attesten, deskcontroles en ingeplande terreincontroles zijn groter dan 0, maar minstens één target is nog niet behaald. Het target voor deskcontroles is 5% van het aantal attesten, naar boven afgerond. Het target voor ingeplande terreincontroles is het kleinste getal van 4 en het aantal attesten gedeeld door 100, naar boven afgerond.",
    },
    {
      status: "GROEN",
      betekenis:
        "Alle targets behaald",
      berekening:
        "Totaal aantal deskcontroles is minstens 5% van het aantal attesten, naar boven afgerond, én Totaal aantal ingeplande terreincontroles is minstens het kleinste getal van 4 en het aantal attesten gedeeld door 100, naar boven afgerond.",
    },
  ];

  for (
    const legenda
    of legendaRijen
  ) {
    const rij =
      legendaWerkblad.addRow({
        kleur: legenda.status,
        betekenis:
          legenda.betekenis,
        berekening:
          legenda.berekening,
      });

    rij.height = 58;

    rij.eachCell(
      {
        includeEmpty: true,
      },
      (cel) => {
        cel.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb:
              geefTargetRijkleur(
                legenda.status,
              ),
          },
        };

        cel.border =
          geefCelRand();

        cel.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      },
    );
  }

  const legendaHeader =
    legendaWerkblad.getRow(1);

  legendaHeader.height = 30;

  legendaHeader.eachCell(
    {
      includeEmpty: true,
    },
    (cel) => {
      cel.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      cel.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF047857",
        },
      };

      cel.border =
        geefCelRand();

      cel.alignment = {
        vertical: "middle",
        wrapText: true,
      };
    },
  );

  const excelBuffer =
    await werkboek.xlsx.writeBuffer();

  const blob = new Blob(
    [
      excelBuffer as unknown as BlobPart,
    ],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );

  const onderdelen =
    Object.fromEntries(
      new Intl.DateTimeFormat(
        "nl-BE",
        {
          timeZone:
            "Europe/Brussels",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        },
      )
        .formatToParts(
          new Date(),
        )
        .map(
          (onderdeel) => [
            onderdeel.type,
            onderdeel.value,
          ],
        ),
    );

  const datum =
    [
      onderdelen.year,
      onderdelen.month,
      onderdelen.day,
    ].join("-");

  const tijdstip =
    [
      onderdelen.hour,
      onderdelen.minute,
      onderdelen.second,
    ].join("-");

  return new Response(
    blob,
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="Targets_${datum}_${tijdstip}.xlsx"`,
        "Cache-Control":
          "no-store",
      },
    },
  );
}

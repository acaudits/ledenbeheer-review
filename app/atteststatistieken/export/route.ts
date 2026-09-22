import ExcelJS from "exceljs";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type TargetStatus } from "@/lib/persoonscertificaat-targetselectie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExportRij = {
  id: number;
  naamPersoonscertificatie: string;
  ovamId: string;
  aantalAttesten: number;
  aantalIngeplandeTerreincontroles: number;
  aantalTerreincontroles: number;
  aantalNaFinalisaties: number;
  aantalDeskcontroles: number;
  aantalNonConformiteiten: number;
  inOpvolging: boolean;
};

type DeskcontroleTargetRij = {
  naamPersoonscertificatie: string;
  ovamId: string;
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalDeskcontrolesNogNodig: number;
  bron: ExportRij;
};

type TerreincontroleTargetRij = {
  naamPersoonscertificatie: string;
  ovamId: string;
  aantalAttesten: number;
  aantalIngeplandeTerreincontroles: number;
  aantalNaFinalisaties: number;
  aantalTerreincontrolesNogNodig: number;
  bron: ExportRij;
};

function normaliseerOvamId(waarde: string | null | undefined) {
  return waarde?.trim().toUpperCase() ?? "";
}

function geefCelRand(): Partial<ExcelJS.Borders> {
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
  numeriekeKolommen: number[],
) {
  werkblad.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  const koprij = werkblad.getRow(1);

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
      cel.border = geefCelRand();
    },
  );

  for (let rijnummer = 2; rijnummer <= werkblad.rowCount; rijnummer += 1) {
    const rij = werkblad.getRow(rijnummer);

    rij.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    rij.eachCell(
      {
        includeEmpty: true,
      },
      (cel) => {
        cel.border = geefCelRand();

        if (rijnummer % 2 === 0) {
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

    for (const kolom of numeriekeKolommen) {
      const cel = rij.getCell(kolom);

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
      row: Math.max(werkblad.rowCount, 1),
      column: werkblad.columnCount,
    },
  };
}

function berekenDeskcontroleTarget(aantalAttesten: number) {
  return Math.ceil(aantalAttesten * 0.05);
}

function berekenTerreincontroleTarget(aantalAttesten: number) {
  return Math.min(4, Math.ceil(aantalAttesten / 100));
}

function berekenTargetStatus(rij: ExportRij): TargetStatus {
  if (rij.aantalAttesten === 0) {
    return "GRIJS";
  }

  if (rij.inOpvolging) {
    return "FEL_ROOD";
  }

  const aantalTerreinactiviteiten =
    rij.aantalIngeplandeTerreincontroles + rij.aantalNaFinalisaties;

  if (aantalTerreinactiviteiten === 0) {
    return "ROOD";
  }

  if (rij.aantalDeskcontroles === 0) {
    return "ORANJE";
  }

  const targetDeskcontroles = berekenDeskcontroleTarget(rij.aantalAttesten);
  const targetTerreincontroles = berekenTerreincontroleTarget(
    rij.aantalAttesten,
  );

  if (
    rij.aantalDeskcontroles >= targetDeskcontroles &&
    aantalTerreinactiviteiten >= targetTerreincontroles
  ) {
    if (
      rij.aantalIngeplandeTerreincontroles < targetTerreincontroles &&
      rij.aantalNaFinalisaties > 0
    ) {
      return "PAARS";
    }

    return "GROEN";
  }

  return "GEEL";
}

function geefTargetRijkleur(status: TargetStatus) {
  switch (status) {
    case "FEL_ROOD":
      return "FFF5E6D3";

    case "ROOD":
      return "FFFEF2F2";

    case "ORANJE":
      return "FFFFF7ED";

    case "GEEL":
      return "FFFEFCE8";

    case "PAARS":
      return "FFF5F3FF";

    case "GROEN":
      return "FFECFDF5";

    case "GRIJS":
      return "FFF8FAFC";
  }
}

function pasTargetkleurenToe(werkblad: ExcelJS.Worksheet, rijen: ExportRij[]) {
  for (let index = 0; index < rijen.length; index += 1) {
    const status = berekenTargetStatus(rijen[index]);
    const kleur = geefTargetRijkleur(status);
    const excelRij = werkblad.getRow(index + 2);

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
}

function voegLegendaToe(werkboek: ExcelJS.Workbook) {
  const werkblad = werkboek.addWorksheet("Legende", {
    views: [
      {
        state: "frozen",
        ySplit: 1,
      },
    ],
  });

  werkblad.columns = [
    {
      header: "Kleur",
      key: "kleur",
      width: 20,
    },
    {
      header: "Betekenis",
      key: "betekenis",
      width: 42,
    },
    {
      header: "Gedetailleerde berekening",
      key: "berekening",
      width: 105,
    },
  ];

  const legendaRijen: Array<{
    status: TargetStatus;
    kleur: string;
    betekenis: string;
    berekening: string;
  }> = [
    {
      status: "FEL_ROOD",
      kleur: "Donkerrood",
      betekenis: "In opvolging",
      berekening:
        "Er bestaat minstens één niet-verwijderde sanctie-opvolging die nog niet is afgerond. Deze status krijgt voorrang op de targets.",
    },
    {
      status: "ROOD",
      kleur: "Rood",
      betekenis: "Geen terreincontrole of na-finalisatie",
      berekening:
        "Er zijn attesten, maar het totaal van ingeplande terreincontroles en na-finalisaties is 0.",
    },
    {
      status: "ORANJE",
      kleur: "Oranje",
      betekenis: "Geen deskcontrole",
      berekening:
        "Er is minstens één terreinactiviteit, maar het aantal deskcontroles is 0.",
    },
    {
      status: "GEEL",
      kleur: "Geel",
      betekenis: "Targets gedeeltelijk behaald",
      berekening:
        "Er zijn controles, maar het desk- of terreintarget is nog niet volledig behaald.",
    },
    {
      status: "PAARS",
      kleur: "Paars",
      betekenis: "Terreintarget behaald via na-finalisatie",
      berekening:
        "Beide targets zijn behaald, maar het terreintarget is alleen bereikt door ingeplande terreincontroles en na-finalisaties samen te tellen.",
    },
    {
      status: "GROEN",
      kleur: "Groen",
      betekenis: "Alle targets behaald",
      berekening:
        "Het deskcontroletarget en het terreintarget zijn behaald. Het terreintarget is ook zonder na-finalisatie behaald.",
    },
    {
      status: "GRIJS",
      kleur: "Grijs",
      betekenis: "Geen attesten",
      berekening:
        "Het totale aantal attesten is 0. De controletargets worden daarom niet beoordeeld.",
    },
  ];

  for (const item of legendaRijen) {
    const rij = werkblad.addRow({
      kleur: item.kleur,
      betekenis: item.betekenis,
      berekening: item.berekening,
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
            argb: geefTargetRijkleur(item.status),
          },
        };

        cel.border = geefCelRand();
        cel.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      },
    );
  }

  formatteerWerkblad(werkblad, []);
}

export async function GET() {
  await vereisMachtiging("ATTESTSTATISTIEKEN_BEHEREN");

  const [
    leden,
    ingeplandeTerreincontroles,
    naFinalisaties,
    actieveOpvolgingen,
    atteststatistieken,
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
      by: ["ovamId"],
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

    prisma.naFinalisatie.groupBy({
      by: ["persoonsId"],
      where: {
        verwijderdOp: null,
        persoonsId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),

    prisma.opvolgingSanctie.groupBy({
      by: ["ovamId"],
      where: {
        verwijderdOp: null,
        opvolgingAfgerond: false,
        ovamId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),

    prisma.attestPersoonStatistiek.findMany({
      select: {
        persoonsId: true,
        aantalAttesten: true,
      },
    }),
  ]);

  const attestenPerPersoonsId = new Map<string, number>();

  for (const statistiek of atteststatistieken) {
    const persoonsId = normaliseerOvamId(statistiek.persoonsId);

    if (persoonsId) {
      attestenPerPersoonsId.set(
        persoonsId,
        (attestenPerPersoonsId.get(persoonsId) ?? 0) +
          statistiek.aantalAttesten,
      );
    }
  }

  const ingeplandePerOvamId = new Map<string, number>();

  for (const telling of ingeplandeTerreincontroles) {
    const ovamId = normaliseerOvamId(telling.ovamId);

    if (ovamId) {
      ingeplandePerOvamId.set(
        ovamId,
        (ingeplandePerOvamId.get(ovamId) ?? 0) + telling._count._all,
      );
    }
  }

  const naFinalisatiesPerOvamId = new Map<string, number>();

  for (const telling of naFinalisaties) {
    const ovamId = normaliseerOvamId(telling.persoonsId);

    if (ovamId) {
      naFinalisatiesPerOvamId.set(
        ovamId,
        (naFinalisatiesPerOvamId.get(ovamId) ?? 0) + telling._count._all,
      );
    }
  }

  const actieveOpvolgingPerOvamId = new Set<string>();

  for (const telling of actieveOpvolgingen) {
    const ovamId = normaliseerOvamId(telling.ovamId);

    if (ovamId && telling._count._all > 0) {
      actieveOpvolgingPerOvamId.add(ovamId);
    }
  }

  const rijen: ExportRij[] = leden.map((lid) => {
    const ovamIdSleutel = normaliseerOvamId(lid.ovamId);

    const aantalDeskcontroles = lid.deskcontroles.length;
    const aantalTerreincontroles = lid.terreincontroleDossiers.length;

    const deskcontroleNc = lid.deskcontroles.reduce(
      (totaal, deskcontrole) => totaal + deskcontrole._count.vaststellingen,
      0,
    );

    const terreincontroleNc = lid.terreincontroleDossiers.reduce(
      (totaal, terreincontrole) =>
        totaal + terreincontrole._count.vaststellingen,
      0,
    );

    return {
      id: lid.id,
      naamPersoonscertificatie: lid.naamPersoon,
      ovamId: lid.ovamId,
      aantalAttesten: attestenPerPersoonsId.get(ovamIdSleutel) ?? 0,
      aantalIngeplandeTerreincontroles:
        ingeplandePerOvamId.get(ovamIdSleutel) ?? 0,
      aantalTerreincontroles,
      aantalNaFinalisaties: naFinalisatiesPerOvamId.get(ovamIdSleutel) ?? 0,
      aantalDeskcontroles,
      aantalNonConformiteiten: deskcontroleNc + terreincontroleNc,
      inOpvolging: actieveOpvolgingPerOvamId.has(ovamIdSleutel),
    };
  });

  const werkboek = new ExcelJS.Workbook();

  werkboek.creator = "Asbest CRM";
  werkboek.created = new Date();

  const hoofdWerkblad = werkboek.addWorksheet("Atteststatistieken");

  hoofdWerkblad.columns = [
    {
      header: "Naam persoonscertificatie",
      key: "naamPersoonscertificatie",
      width: 36,
    },
    {
      header: "OVAM-ID",
      key: "ovamId",
      width: 20,
    },
    {
      header: "Totaal aantal attesten",
      key: "aantalAttesten",
      width: 24,
    },
    {
      header: "Totaal aantal ingeplande terreincontroles",
      key: "aantalIngeplandeTerreincontroles",
      width: 30,
    },
    {
      header: "Totaal aantal terreincontroles",
      key: "aantalTerreincontroles",
      width: 27,
    },
    {
      header: "Totaal aantal na finalisatie",
      key: "aantalNaFinalisaties",
      width: 26,
    },
    {
      header: "Totaal aantal deskcontroles",
      key: "aantalDeskcontroles",
      width: 26,
    },
    {
      header: "Totaal aantal non-conformiteiten",
      key: "aantalNonConformiteiten",
      width: 30,
    },
    {
      header: "In opvolging",
      key: "inOpvolging",
      width: 17,
    },
  ];

  for (const rij of rijen) {
    hoofdWerkblad.addRow({
      naamPersoonscertificatie: rij.naamPersoonscertificatie,
      ovamId: rij.ovamId,
      aantalAttesten: rij.aantalAttesten,
      aantalIngeplandeTerreincontroles: rij.aantalIngeplandeTerreincontroles,
      aantalTerreincontroles: rij.aantalTerreincontroles,
      aantalNaFinalisaties: rij.aantalNaFinalisaties,
      aantalDeskcontroles: rij.aantalDeskcontroles,
      aantalNonConformiteiten: rij.aantalNonConformiteiten,
      inOpvolging: rij.inOpvolging ? "Ja" : "Nee",
    });
  }

  formatteerWerkblad(hoofdWerkblad, [3, 4, 5, 6, 7, 8]);
  pasTargetkleurenToe(hoofdWerkblad, rijen);

  const deskcontroleRijen: DeskcontroleTargetRij[] = rijen
    .map((rij) => {
      const target = berekenDeskcontroleTarget(rij.aantalAttesten);

      return {
        naamPersoonscertificatie: rij.naamPersoonscertificatie,
        ovamId: rij.ovamId,
        aantalAttesten: rij.aantalAttesten,
        aantalDeskcontroles: rij.aantalDeskcontroles,
        aantalDeskcontrolesNogNodig: Math.max(
          0,
          target - rij.aantalDeskcontroles,
        ),
        bron: rij,
      };
    })
    .filter((rij) => rij.aantalDeskcontrolesNogNodig > 0)
    .sort(
      (eerste, tweede) =>
        tweede.aantalDeskcontrolesNogNodig -
          eerste.aantalDeskcontrolesNogNodig ||
        eerste.naamPersoonscertificatie.localeCompare(
          tweede.naamPersoonscertificatie,
          "nl-BE",
        ),
    );

  const deskcontroleWerkblad = werkboek.addWorksheet("Deskcontroles");

  deskcontroleWerkblad.columns = [
    {
      header: "Naam persoonscertificatie",
      key: "naamPersoonscertificatie",
      width: 36,
    },
    {
      header: "OVAM-ID",
      key: "ovamId",
      width: 20,
    },
    {
      header: "Totaal aantal attesten",
      key: "aantalAttesten",
      width: 24,
    },
    {
      header: "Totaal aantal deskcontroles",
      key: "aantalDeskcontroles",
      width: 27,
    },
    {
      header: "Aantal deskcontroles nog nodig",
      key: "aantalDeskcontrolesNogNodig",
      width: 31,
    },
  ];

  for (const rij of deskcontroleRijen) {
    deskcontroleWerkblad.addRow({
      naamPersoonscertificatie: rij.naamPersoonscertificatie,
      ovamId: rij.ovamId,
      aantalAttesten: rij.aantalAttesten,
      aantalDeskcontroles: rij.aantalDeskcontroles,
      aantalDeskcontrolesNogNodig: rij.aantalDeskcontrolesNogNodig,
    });
  }

  formatteerWerkblad(deskcontroleWerkblad, [3, 4, 5]);
  pasTargetkleurenToe(
    deskcontroleWerkblad,
    deskcontroleRijen.map((rij) => rij.bron),
  );

  const terreincontroleRijen: TerreincontroleTargetRij[] = rijen
    .map((rij) => {
      const target = berekenTerreincontroleTarget(rij.aantalAttesten);
      const uitgevoerd =
        rij.aantalIngeplandeTerreincontroles + rij.aantalNaFinalisaties;

      return {
        naamPersoonscertificatie: rij.naamPersoonscertificatie,
        ovamId: rij.ovamId,
        aantalAttesten: rij.aantalAttesten,
        aantalIngeplandeTerreincontroles: rij.aantalIngeplandeTerreincontroles,
        aantalNaFinalisaties: rij.aantalNaFinalisaties,
        aantalTerreincontrolesNogNodig: Math.max(0, target - uitgevoerd),
        bron: rij,
      };
    })
    .filter((rij) => rij.aantalTerreincontrolesNogNodig > 0)
    .sort(
      (eerste, tweede) =>
        tweede.aantalTerreincontrolesNogNodig -
          eerste.aantalTerreincontrolesNogNodig ||
        eerste.naamPersoonscertificatie.localeCompare(
          tweede.naamPersoonscertificatie,
          "nl-BE",
        ),
    );

  const terreincontroleWerkblad = werkboek.addWorksheet("Terreincontroles");

  terreincontroleWerkblad.columns = [
    {
      header: "Naam persoonscertificatie",
      key: "naamPersoonscertificatie",
      width: 36,
    },
    {
      header: "OVAM-ID",
      key: "ovamId",
      width: 20,
    },
    {
      header: "Totaal aantal attesten",
      key: "aantalAttesten",
      width: 24,
    },
    {
      header: "Totaal aantal ingeplande terreincontroles",
      key: "aantalIngeplandeTerreincontroles",
      width: 32,
    },
    {
      header: "Totaal aantal na finalisatie",
      key: "aantalNaFinalisaties",
      width: 27,
    },
    {
      header: "Aantal terreincontroles nog nodig",
      key: "aantalTerreincontrolesNogNodig",
      width: 32,
    },
  ];

  for (const rij of terreincontroleRijen) {
    terreincontroleWerkblad.addRow({
      naamPersoonscertificatie: rij.naamPersoonscertificatie,
      ovamId: rij.ovamId,
      aantalAttesten: rij.aantalAttesten,
      aantalIngeplandeTerreincontroles: rij.aantalIngeplandeTerreincontroles,
      aantalNaFinalisaties: rij.aantalNaFinalisaties,
      aantalTerreincontrolesNogNodig: rij.aantalTerreincontrolesNogNodig,
    });
  }

  formatteerWerkblad(terreincontroleWerkblad, [3, 4, 5, 6]);
  pasTargetkleurenToe(
    terreincontroleWerkblad,
    terreincontroleRijen.map((rij) => rij.bron),
  );

  voegLegendaToe(werkboek);

  const excelBuffer = await werkboek.xlsx.writeBuffer();

  const blob = new Blob([excelBuffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const onderdelen = Object.fromEntries(
    new Intl.DateTimeFormat("nl-BE", {
      timeZone: "Europe/Brussels",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((onderdeel) => [onderdeel.type, onderdeel.value]),
  );

  const datum = [onderdelen.year, onderdelen.month, onderdelen.day].join("-");

  const tijdstip = [onderdelen.hour, onderdelen.minute, onderdelen.second].join(
    "-",
  );

  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Targets_${datum}_${tijdstip}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

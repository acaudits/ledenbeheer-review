import "server-only";

import { prisma } from "@/lib/prisma";

export type DeskcontroleTargetRij = {
  naamPersoonscertificaat: string;
  ovamId: string;
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalNogNodig: number;
};

export type TerreincontroleTargetRij = {
  naamPersoonscertificaat: string;
  ovamId: string;
  aantalAttesten: number;
  aantalIngeplandeTerreincontroles: number;
  aantalNaFinalisaties: number;
  aantalNogNodig: number;
};

export type KalenderDagTelling = {
  datum: string;
  aantal: number;
};

export type TotaalOverzicht = {
  totaalDeskcontrolesNogNodig: number;
  totaalTerreincontrolesNogNodig: number;
  totaalAantalAttesten: number;
  resterendeWerkdagen: number;
  deskcontrolesPerWerkdag: number;
  terreincontrolesPerWerkdag: number;
  vandaag: string;
  deskcontrolesPerDatum: KalenderDagTelling[];
  terreincontrolesPerDatum: KalenderDagTelling[];
  topDeskcontroles: DeskcontroleTargetRij[];
  topTerreincontroles: TerreincontroleTargetRij[];
};

function normaliseerOvamId(waarde: string | null | undefined) {
  return waarde?.trim().toUpperCase() ?? "";
}

function dateNaarSleutel(datum: Date) {
  return datumSleutel(
    datum.getUTCFullYear(),
    datum.getUTCMonth() + 1,
    datum.getUTCDate(),
  );
}

function telPerDatum(datums: readonly Date[]): KalenderDagTelling[] {
  const tellingen = new Map<string, number>();

  for (const datum of datums) {
    const sleutel = dateNaarSleutel(datum);
    tellingen.set(sleutel, (tellingen.get(sleutel) ?? 0) + 1);
  }

  return Array.from(tellingen, ([datum, aantal]) => ({
    datum,
    aantal,
  })).sort((eerste, tweede) => eerste.datum.localeCompare(tweede.datum));
}

function berekenDeskcontroleTarget(aantalAttesten: number) {
  return Math.ceil(aantalAttesten * 0.05);
}

function berekenTerreincontroleTarget(aantalAttesten: number) {
  return Math.min(4, Math.ceil(aantalAttesten / 100));
}

function datumSleutel(jaar: number, maand: number, dag: number) {
  return [
    jaar.toString().padStart(4, "0"),
    maand.toString().padStart(2, "0"),
    dag.toString().padStart(2, "0"),
  ].join("-");
}

function voegDagenToe(datum: Date, aantalDagen: number) {
  const resultaat = new Date(datum);

  resultaat.setUTCDate(resultaat.getUTCDate() + aantalDagen);

  return resultaat;
}

function berekenPaaszondag(jaar: number) {
  const a = jaar % 19;
  const b = Math.floor(jaar / 100);
  const c = jaar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(jaar, maand - 1, dag));
}

function belgischeFeestdagen(jaar: number) {
  const paasZondag = berekenPaaszondag(jaar);
  const paasMaandag = voegDagenToe(paasZondag, 1);
  const hemelvaart = voegDagenToe(paasZondag, 39);
  const pinksterMaandag = voegDagenToe(paasZondag, 50);

  return new Set([
    datumSleutel(jaar, 1, 1),
    datumSleutel(
      paasMaandag.getUTCFullYear(),
      paasMaandag.getUTCMonth() + 1,
      paasMaandag.getUTCDate(),
    ),
    datumSleutel(jaar, 5, 1),
    datumSleutel(
      hemelvaart.getUTCFullYear(),
      hemelvaart.getUTCMonth() + 1,
      hemelvaart.getUTCDate(),
    ),
    datumSleutel(
      pinksterMaandag.getUTCFullYear(),
      pinksterMaandag.getUTCMonth() + 1,
      pinksterMaandag.getUTCDate(),
    ),
    datumSleutel(jaar, 7, 21),
    datumSleutel(jaar, 8, 15),
    datumSleutel(jaar, 11, 1),
    datumSleutel(jaar, 11, 11),
    datumSleutel(jaar, 12, 25),
  ]);
}

function huidigeBelgischeDatum() {
  const onderdelen = Object.fromEntries(
    new Intl.DateTimeFormat("nl-BE", {
      timeZone: "Europe/Brussels",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((onderdeel) => onderdeel.type !== "literal")
      .map((onderdeel) => [onderdeel.type, onderdeel.value]),
  );

  return {
    jaar: Number(onderdelen.year),
    maand: Number(onderdelen.month),
    dag: Number(onderdelen.day),
  };
}

function berekenResterendeWerkdagen() {
  const vandaag = huidigeBelgischeDatum();
  const feestdagen = belgischeFeestdagen(vandaag.jaar);
  const einddatum = new Date(Date.UTC(vandaag.jaar, 11, 31));
  const huidigeDatum = new Date(
    Date.UTC(vandaag.jaar, vandaag.maand - 1, vandaag.dag),
  );

  let aantalWerkdagen = 0;

  while (huidigeDatum <= einddatum) {
    const weekdag = huidigeDatum.getUTCDay();
    const sleutel = datumSleutel(
      huidigeDatum.getUTCFullYear(),
      huidigeDatum.getUTCMonth() + 1,
      huidigeDatum.getUTCDate(),
    );

    if (weekdag !== 0 && weekdag !== 6 && !feestdagen.has(sleutel)) {
      aantalWerkdagen += 1;
    }

    huidigeDatum.setUTCDate(huidigeDatum.getUTCDate() + 1);
  }

  return aantalWerkdagen;
}

export async function laadTotaalOverzicht(): Promise<TotaalOverzicht> {
  const [
    leden,
    ingeplandeTerreincontroles,
    naFinalisaties,
    atteststatistieken,
    terreincontroleDatums,
    deskcontroleDatums,
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
            id: true,
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

    prisma.attestPersoonStatistiek.findMany({
      select: {
        persoonsId: true,
        aantalAttesten: true,
      },
    }),

    prisma.terreincontrole.findMany({
      where: {
        verwijderdOp: null,
        afwezigOp: null,
        datumPlaatsbezoek: {
          not: null,
        },
      },
      select: {
        datumPlaatsbezoek: true,
      },
    }),

    prisma.deskcontrole.findMany({
      where: {
        verwijderdOp: null,
      },
      select: {
        datumControle: true,
      },
    }),
  ]);

  const terreincontrolesPerDatum = telPerDatum(
    terreincontroleDatums.flatMap((rij) =>
      rij.datumPlaatsbezoek ? [rij.datumPlaatsbezoek] : [],
    ),
  );

  const deskcontrolesPerDatum = telPerDatum(
    deskcontroleDatums.map((rij) => rij.datumControle),
  );

  const attestenPerOvamId = new Map<string, number>();

  for (const statistiek of atteststatistieken) {
    const ovamId = normaliseerOvamId(statistiek.persoonsId);

    if (ovamId) {
      attestenPerOvamId.set(
        ovamId,
        (attestenPerOvamId.get(ovamId) ?? 0) + statistiek.aantalAttesten,
      );
    }
  }

  const ingeplandeTerreincontrolesPerOvamId = new Map<string, number>();

  for (const telling of ingeplandeTerreincontroles) {
    const ovamId = normaliseerOvamId(telling.ovamId);

    if (ovamId) {
      ingeplandeTerreincontrolesPerOvamId.set(
        ovamId,
        (ingeplandeTerreincontrolesPerOvamId.get(ovamId) ?? 0) +
          telling._count._all,
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

  const rijen = leden.map((lid) => {
    const ovamIdSleutel = normaliseerOvamId(lid.ovamId);
    const aantalAttesten = attestenPerOvamId.get(ovamIdSleutel) ?? 0;
    const aantalDeskcontroles = lid.deskcontroles.length;
    const aantalIngeplandeTerreincontroles =
      ingeplandeTerreincontrolesPerOvamId.get(ovamIdSleutel) ?? 0;
    const aantalNaFinalisaties =
      naFinalisatiesPerOvamId.get(ovamIdSleutel) ?? 0;

    const aantalDeskcontrolesNogNodig = Math.max(
      0,
      berekenDeskcontroleTarget(aantalAttesten) - aantalDeskcontroles,
    );

    const aantalTerreincontrolesNogNodig = Math.max(
      0,
      berekenTerreincontroleTarget(aantalAttesten) -
        aantalIngeplandeTerreincontroles -
        aantalNaFinalisaties,
    );

    return {
      id: lid.id,
      naamPersoonscertificaat: lid.naamPersoon,
      ovamId: lid.ovamId,
      aantalAttesten,
      aantalDeskcontroles,
      aantalIngeplandeTerreincontroles,
      aantalNaFinalisaties,
      aantalDeskcontrolesNogNodig,
      aantalTerreincontrolesNogNodig,
    };
  });

  const sorteerOpPrioriteit = <
    T extends {
      aantalNogNodig: number;
      aantalAttesten: number;
      naamPersoonscertificaat: string;
    },
  >(
    eerste: T,
    tweede: T,
  ) =>
    tweede.aantalNogNodig - eerste.aantalNogNodig ||
    tweede.aantalAttesten - eerste.aantalAttesten ||
    eerste.naamPersoonscertificaat.localeCompare(
      tweede.naamPersoonscertificaat,
      "nl-BE",
    );

  const topDeskcontroles: DeskcontroleTargetRij[] = rijen
    .map((rij) => ({
      naamPersoonscertificaat: rij.naamPersoonscertificaat,
      ovamId: rij.ovamId,
      aantalAttesten: rij.aantalAttesten,
      aantalDeskcontroles: rij.aantalDeskcontroles,
      aantalNogNodig: rij.aantalDeskcontrolesNogNodig,
    }))
    .filter((rij) => rij.aantalNogNodig > 0)
    .sort(sorteerOpPrioriteit)
    .slice(0, 20);

  const topTerreincontroles: TerreincontroleTargetRij[] = rijen
    .map((rij) => ({
      naamPersoonscertificaat: rij.naamPersoonscertificaat,
      ovamId: rij.ovamId,
      aantalAttesten: rij.aantalAttesten,
      aantalIngeplandeTerreincontroles: rij.aantalIngeplandeTerreincontroles,
      aantalNaFinalisaties: rij.aantalNaFinalisaties,
      aantalNogNodig: rij.aantalTerreincontrolesNogNodig,
    }))
    .filter((rij) => rij.aantalNogNodig > 0)
    .sort(sorteerOpPrioriteit)
    .slice(0, 20);

  const totaalDeskcontrolesNogNodig = rijen.reduce(
    (totaal, rij) => totaal + rij.aantalDeskcontrolesNogNodig,
    0,
  );

  const totaalTerreincontrolesNogNodig = rijen.reduce(
    (totaal, rij) => totaal + rij.aantalTerreincontrolesNogNodig,
    0,
  );

  const totaalAantalAttesten = rijen.reduce(
    (totaal, rij) => totaal + rij.aantalAttesten,
    0,
  );

  const resterendeWerkdagen = berekenResterendeWerkdagen();
  const belgischeDatum = huidigeBelgischeDatum();
  const vandaag = datumSleutel(
    belgischeDatum.jaar,
    belgischeDatum.maand,
    belgischeDatum.dag,
  );

  return {
    totaalDeskcontrolesNogNodig,
    totaalTerreincontrolesNogNodig,
    totaalAantalAttesten,
    resterendeWerkdagen,
    deskcontrolesPerWerkdag:
      resterendeWerkdagen > 0
        ? totaalDeskcontrolesNogNodig / resterendeWerkdagen
        : 0,
    terreincontrolesPerWerkdag:
      resterendeWerkdagen > 0
        ? totaalTerreincontrolesNogNodig / resterendeWerkdagen
        : 0,
    vandaag,
    deskcontrolesPerDatum,
    terreincontrolesPerDatum,
    topDeskcontroles,
    topTerreincontroles,
  };
}

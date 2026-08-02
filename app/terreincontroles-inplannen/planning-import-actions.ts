"use server";

import {
  bevestigTerreincontrolesUitExcel as basisBevestigTerreincontrolesUitExcel,
  leesTerreincontrolesUitExcel as basisLeesTerreincontrolesUitExcel,
  type TerreincontroleExcelRij as BasisTerreincontroleExcelRij,
  type TerreincontroleExcelState as BasisTerreincontroleExcelState,
} from "./import-actions";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PlanningStatus =
  | "GRIJS"
  | "ROOD"
  | "GEEL"
  | "GROEN";

export type TerreincontroleExcelRij =
  BasisTerreincontroleExcelRij & {
    aantalAttesten: number;
    terreincontroleTarget: number;
    aantalTerreincontroles: number;
    aantalTerreincontrolesNodig: number;
    laatsteTerreincontrole: string | null;
    planningStatus: PlanningStatus;
    planningStatusTekst: string;
  };

export type TerreincontroleExcelState =
  Omit<BasisTerreincontroleExcelState, "rijen"> & {
    rijen?: TerreincontroleExcelRij[];
    standaardAuditeur?: string;
  };

export type TerreincontroleBevestigState = {
  succes?: boolean;
  message?: string;
  aantalOpgeslagen?: number;
  fouten?: string[];
};

const AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

function normaliseerNaam(waarde: string) {
  return waarde
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("nl-BE")
    .replace(/\s+/g, " ");
}

function bepaalAuditeur(gebruiker: {
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
  email: string;
}) {
  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const emailNaam =
    gebruiker.email.split("@")[0] ?? "";

  const herkenningswaarden = [
    gebruiker.naam ?? "",
    gebruiker.voornaam ?? "",
    volledigeNaam,
    emailNaam.replace(/[._-]+/g, " "),
  ]
    .map(normaliseerNaam)
    .filter(Boolean);

  const gevonden = AUDITEURS.find((auditeur) => {
    const normaleAuditeur =
      normaliseerNaam(auditeur);

    return herkenningswaarden.some(
      (waarde) =>
        waarde === normaleAuditeur ||
        normaleAuditeur.startsWith(
          `${waarde} `,
        ),
    );
  });

  return (
    gevonden ??
    volledigeNaam ??
    gebruiker.naam ??
    gebruiker.email
  );
}

function bepaalPlanningStatus({
  aantalAttesten,
  target,
  uitgevoerd,
  laatsteTerreincontrole,
}: {
  aantalAttesten: number;
  target: number;
  uitgevoerd: number;
  laatsteTerreincontrole: Date | null;
}): PlanningStatus {
  if (
    aantalAttesten <= 0 ||
    target <= 0
  ) {
    return "GRIJS";
  }

  if (laatsteTerreincontrole) {
    const grens = new Date();
    grens.setUTCHours(0, 0, 0, 0);
    grens.setUTCDate(
      grens.getUTCDate() - 14,
    );

    if (
      laatsteTerreincontrole.getTime() >=
      grens.getTime()
    ) {
      return "GEEL";
    }
  }

  if (uitgevoerd < target) {
    return "ROOD";
  }

  return "GROEN";
}

function planningStatusTekst({
  status,
  aantalAttesten,
  target,
  uitgevoerd,
  laatsteTerreincontrole,
}: {
  status: PlanningStatus;
  aantalAttesten: number;
  target: number;
  uitgevoerd: number;
  laatsteTerreincontrole: Date | null;
}) {
  const laatste = laatsteTerreincontrole
    ? new Intl.DateTimeFormat("nl-BE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(laatsteTerreincontrole)
    : "nooit";

  if (status === "GRIJS") {
    return "Geen attesten of geen gekoppeld persoonscertificaat.";
  }

  if (status === "GEEL") {
    return `Laatste terreincontrole: ${laatste}, minder dan 14 dagen geleden.`;
  }

  if (status === "ROOD") {
    return `${Math.max(
      0,
      target - uitgevoerd,
    )} terreincontrole(s) nog nodig.`;
  }

  return "Terreincontroletarget behaald.";
}

export async function leesTerreincontrolesUitExcel(
  vorigeStatus: TerreincontroleExcelState,
  formData: FormData,
): Promise<TerreincontroleExcelState> {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const basisResultaat =
    await basisLeesTerreincontrolesUitExcel(
      vorigeStatus,
      formData,
    );

  const basisRijen =
    basisResultaat.rijen ?? [];

  const standaardAuditeur =
    bepaalAuditeur(gebruiker);

  if (basisRijen.length === 0) {
    return {
      ...basisResultaat,
      standaardAuditeur,
      rijen: [],
    };
  }

  const ovamIds = [
    ...new Set(
      basisRijen
        .map((rij) =>
          rij.ovamId.trim(),
        )
        .filter(Boolean),
    ),
  ];

  const leden =
    ovamIds.length === 0
      ? []
      : await prisma.lid.findMany({
          where: {
            ovamId: {
              in: ovamIds,
            },
            verwijderdOp: null,
          },
          select: {
            id: true,
            ovamId: true,
          },
        });

  const lidIds =
    leden.map((lid) => lid.id);

  const [
    atteststatistieken,
    terreincontroletellingen,
  ] = await Promise.all([
    ovamIds.length === 0
      ? Promise.resolve([])
      : prisma.attestPersoonStatistiek.findMany({
          where: {
            persoonsId: {
              in: ovamIds,
            },
          },
          select: {
            persoonsId: true,
            aantalAttesten: true,
          },
        }),

    lidIds.length === 0
      ? Promise.resolve([])
      : prisma.terreincontroleDossier.groupBy({
          by: ["lidId"],
          where: {
            verwijderdOp: null,
            lidId: {
              in: lidIds,
            },
          },
          _count: {
            _all: true,
          },
          _max: {
            datumControle: true,
          },
        }),
  ]);

  const lidPerOvamId = new Map(
    leden.map((lid) => [
      normaliseerNaam(lid.ovamId),
      lid,
    ]),
  );

  const attestenPerOvamId = new Map(
    atteststatistieken.map(
      (statistiek) => [
        normaliseerNaam(
          statistiek.persoonsId,
        ),
        statistiek.aantalAttesten,
      ],
    ),
  );

  const controlesPerLid = new Map(
    terreincontroletellingen.map(
      (telling) => [
        telling.lidId,
        {
          aantal: telling._count._all,
          laatste:
            telling._max.datumControle,
        },
      ],
    ),
  );

  const rijen: TerreincontroleExcelRij[] =
    basisRijen.map((basisRij) => {
      const ovamSleutel =
        normaliseerNaam(
          basisRij.ovamId,
        );

      const lid =
        lidPerOvamId.get(ovamSleutel);

      const aantalAttesten =
        attestenPerOvamId.get(
          ovamSleutel,
        ) ?? 0;

      const terreincontroleTarget =
        aantalAttesten > 0
          ? Math.min(
              4,
              Math.ceil(
                aantalAttesten / 100,
              ),
            )
          : 0;

      const controlegegevens = lid
        ? controlesPerLid.get(lid.id)
        : undefined;

      const aantalTerreincontroles =
        controlegegevens?.aantal ?? 0;

      const laatsteTerreincontrole =
        controlegegevens?.laatste ??
        null;

      const planningStatus =
        bepaalPlanningStatus({
          aantalAttesten,
          target:
            terreincontroleTarget,
          uitgevoerd:
            aantalTerreincontroles,
          laatsteTerreincontrole,
        });

      return {
        ...basisRij,
        auditeur:
          standaardAuditeur,
        aantalAttesten,
        terreincontroleTarget,
        aantalTerreincontroles,
        aantalTerreincontrolesNodig:
          Math.max(
            0,
            terreincontroleTarget -
              aantalTerreincontroles,
          ),
        laatsteTerreincontrole:
          laatsteTerreincontrole
            ?.toISOString() ?? null,
        planningStatus,
        planningStatusTekst:
          planningStatusTekst({
            status: planningStatus,
            aantalAttesten,
            target:
              terreincontroleTarget,
            uitgevoerd:
              aantalTerreincontroles,
            laatsteTerreincontrole,
          }),
      };
    });

  return {
    ...basisResultaat,
    standaardAuditeur,
    rijen,
  };
}

export async function bevestigTerreincontrolesUitExcel(
  vorigeStatus: TerreincontroleBevestigState,
  formData: FormData,
) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  return basisBevestigTerreincontrolesUitExcel(
    vorigeStatus,
    formData,
  );
}

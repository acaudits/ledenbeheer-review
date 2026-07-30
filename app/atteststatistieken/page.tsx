import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

import AtteststatistiekenClient from "./AtteststatistiekenClient";

export const dynamic =
  "force-dynamic";

export default async function AtteststatistiekenPage() {
  await vereisIngelogdeGebruiker();

  const [
    personen,
    bedrijven,
    correcties,
    laatsteImport,
  ] = await Promise.all([
    prisma.attestPersoonStatistiek.findMany({
      orderBy: [
        {
          aantalAttesten: "desc",
        },
        {
          naam: "asc",
        },
      ],
      select: {
        id: true,
        persoonsId: true,
        naam: true,
        aantalAttesten: true,
      },
    }),

    prisma.attestBedrijfStatistiek.findMany({
      orderBy: [
        {
          aantalAttesten: "desc",
        },
        {
          bedrijfsnaam: "asc",
        },
      ],
      select: {
        id: true,
        bedrijfsnaam: true,
        aantalAttesten: true,
      },
    }),

    prisma.attestCorrectie.findMany({
      orderBy: [
        {
          aangemaaktOp: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        persoonsId: true,
        bedrijfsnaam: true,
        naam: true,
        aantalAttesten: true,
      },
    }),

    prisma.attestStatistiekImport.findUnique({
      where: {
        id: 1,
      },
      select: {
        bronBestandsnaam: true,
        geimporteerdOp: true,
        aantalExcelRijen: true,
        aantalPersonen: true,
        aantalBedrijven: true,
        correctiesToegepastOp: true,
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">
          Attestbeheer
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Atteststatistieken
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Unieke attesten per persoon en bedrijf,
          aangevuld met handmatige correcties.
        </p>
      </header>

      <AtteststatistiekenClient
        personen={personen}
        bedrijven={bedrijven}
        correcties={correcties}
        laatsteImport={
          laatsteImport
            ? {
                bronBestandsnaam:
                  laatsteImport.bronBestandsnaam,
                geimporteerdOp:
                  laatsteImport.geimporteerdOp.toISOString(),
                aantalExcelRijen:
                  laatsteImport.aantalExcelRijen,
                aantalPersonen:
                  laatsteImport.aantalPersonen,
                aantalBedrijven:
                  laatsteImport.aantalBedrijven,
                correctiesToegepastOp:
                  laatsteImport.correctiesToegepastOp
                    ?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}

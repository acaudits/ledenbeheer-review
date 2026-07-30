import Link from "next/link";

import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import HandmatigeTerreincontroleForm from "./HandmatigeTerreincontroleForm";
import TerreincontroleExcelImport from "./TerreincontroleExcelImport";

export const dynamic =
  "force-dynamic";

export default async function NieuweTerreincontrolePage() {
  await vereisIngelogdeGebruiker();

  const [
    leden,
    procescertificaten,
  ] = await Promise.all([
    prisma.lid.findMany({
      where: {
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
        certificaatnummer: true,
      },
      orderBy: [
        {
          naamPersoon: "asc",
        },
        {
          ovamId: "asc",
        },
      ],
    }),

    prisma.procescertificaat.findMany({
      where: {
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamBedrijf: true,
        kboNummer: true,
        certificaatnummer: true,
      },
      orderBy: [
        {
          naamBedrijf: "asc",
        },
        {
          certificaatnummer:
            "asc",
        },
      ],
    }),
  ]);

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Terreincontroles
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Nieuwe terreincontrole
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Voer een terreincontrole
              handmatig in.
            </p>
          </div>

          <Link
            href="/terreincontroles"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Terug naar overzicht
          </Link>
        </div>
      </header>

      


      <TerreincontroleExcelImport />

<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Handmatig invoeren
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Vul de gegevens van de terreincontrole handmatig in.
        </p>

        <div className="mt-6">
          <HandmatigeTerreincontroleForm />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Of handmatig invoeren
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

    </div>
  );
}


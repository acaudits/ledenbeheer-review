import Link from "next/link";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeskcontroleFormulier from "./DeskcontroleFormulier";
import ExcelDeskcontroleImport from "./ExcelDeskcontroleImport";
import BulkDeskcontroleImport from "./BulkDeskcontroleImport";


export const dynamic = "force-dynamic";

export default async function NieuweDeskcontrolePage() {
  await vereisMachtiging("DESKCONTROLES_BEHEREN");

  const [leden, procescertificaten] =
    await Promise.all([
      prisma.lid.findMany({
        where: {
          verwijderdOp: null,
        },
        orderBy: {
          naamPersoon: "asc",
        },
        select: {
          id: true,
          naamPersoon: true,
          ovamId: true,
          certificaatnummer: true,
          certificatiePlatform: true,
        },
      }),

      prisma.procescertificaat.findMany({
        where: {
          verwijderdOp: null,
        },
        orderBy: {
          naamBedrijf: "asc",
        },
        select: {
          id: true,
          naamBedrijf: true,
          kboNummer: true,
          certificaatnummer: true,
        },
      }),
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/deskcontroles"
        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
      >
        ← Terug naar deskcontroles
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            Deskcontrole opvolging
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Nieuwe deskcontrole
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100">
            Koppel de deskcontrole aan een bestaand
            persoonscertificaat en procescertificaat. De
            deadlines en het attest-ID worden automatisch
            berekend.
          </p>
        </header>

        <BulkDeskcontroleImport />

        <div className="border-b border-slate-200 bg-white px-6 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Of één bestand importeren
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        <ExcelDeskcontroleImport />
        <div className="border-b border-slate-200 bg-white px-6 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Of handmatig invoeren
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        <DeskcontroleFormulier
          leden={leden}
          procescertificaten={
            procescertificaten
          }
        />

        
      </section>
    </div>
  );
}


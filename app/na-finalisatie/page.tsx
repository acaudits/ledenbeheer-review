import Link from "next/link";

import {
  NaFinalisatieAantalTekst,
  NaFinalisatieDashboard,
} from "@/components/NaFinalisatieDashboard";
import {
  NaFinalisatieTabel,
} from "@/components/NaFinalisatieTabel";
import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";

export const dynamic =
  "force-dynamic";

export default async function NaFinalisatiePage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Controlebeheer
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Na finalisatie
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              <NaFinalisatieAantalTekst />
            </p>
          </div>

          {magBeheren ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/na-finalisatie/nieuw"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
              >
                Nieuwe registratie
              </Link>

              <Link
                href="/na-finalisatie/verwijderd"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Verwijderde
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <NaFinalisatieDashboard />

      <NaFinalisatieTabel
        rijen={[]}
        magBeheren={magBeheren}
        serverModus
      />
    </div>
  );
}

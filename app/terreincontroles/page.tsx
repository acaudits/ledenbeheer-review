import Link from "next/link";

import {
  TerreincontroleAantalTekst,
  TerreincontroleDashboard,
} from "@/components/TerreincontroleDashboard";
import {
  TerreincontroleDossiersTabel,
} from "@/components/TerreincontroleDossiersTabel";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisMachtiging,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function TerreincontrolesPage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  const magExporteren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_EXPORTEREN",
    );

  return (
    <div className="space-y-4">
      <header className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Controlebeheer
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Terreincontroles
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              <TerreincontroleAantalTekst />
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {magBeheren ? (
              <Link
                href="/terreincontroles/nieuw"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              >
                Nieuwe terreincontrole
              </Link>
            ) : null}

            {magExporteren ? (
              <Link
                href="/terreincontroles/export"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
              >
                Exporteren naar Excel
              </Link>
            ) : null}

            {magBeheren ? (
              <Link
                href="/terreincontroles/verwijderd"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Verwijderde
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <TerreincontroleDashboard />

      <TerreincontroleDossiersTabel
        rijen={[]}
        magBeheren={magBeheren}
        serverModus
      />
    </div>
  );
}

import Link from "next/link";

import {
  AfwezigeTerreincontroleAantalTekst,
  AfwezigeTerreincontroleDashboard,
} from "@/components/AfwezigeTerreincontroleDashboard";
import {
  AfwezigeTerreincontrolesTabel,
} from "@/components/AfwezigeTerreincontrolesTabel";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisMachtiging,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function AfwezigeTerreincontrolesPage() {
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              Controlebeheer
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Afwezigen
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              <AfwezigeTerreincontroleAantalTekst />
            </p>
          </div>

          <Link
            href="/terreincontroles-inplannen"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Terug naar planning
          </Link>
        </div>
      </header>

      <AfwezigeTerreincontroleDashboard />

      <AfwezigeTerreincontrolesTabel
        magBeheren={magBeheren}
      />
    </div>
  );
}

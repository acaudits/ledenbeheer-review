import Link from "next/link";

import { FormuliergebruikKaarten } from "@/components/FormuliergebruikKaarten";
import { vereisBeheerder } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function duur(seconden: number) {
  const veilig = Math.max(0, seconden);
  const uren = Math.floor(veilig / 3600);
  const minuten = Math.floor((veilig % 3600) / 60);
  const rest = veilig % 60;

  return [
    uren ? `${uren} u` : "",
    minuten ? `${minuten} min` : "",
    `${rest} sec`,
  ]
    .filter(Boolean)
    .join(" ");
}

function bepaalOnvolledigGrens() {
  return new Date(Date.now() - 2 * 60_000);
}

export default async function FormuliergebruikPage() {
  await vereisBeheerder();

  await prisma.laattijdigeFormulierSessie.updateMany({
    where: {
      status: {
        in: ["GESTART", "BEZIG"],
      },
      laatsteActiviteitOp: {
        lt: bepaalOnvolledigGrens(),
      },
    },
    data: {
      status: "ONVOLLEDIG",
    },
  });

  const [aantal, perStatus, duurGemiddeld, linkKlikken] = await Promise.all([
    prisma.laattijdigeFormulierSessie.count(),
    prisma.laattijdigeFormulierSessie.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.laattijdigeFormulierSessie.aggregate({
      _avg: {
        actieveDuurSeconden: true,
      },
    }),
    prisma.laattijdigeFormulierSessie.count({
      where: {
        ovamLinkGeklikt: true,
      },
    }),
  ]);

  const statusAantal = new Map(
    perStatus.map((rij) => [rij.status, rij._count._all]),
  );

  const statistieken = [
    ["Totaal", aantal],
    ["Geslaagd", statusAantal.get("GESLAAGD") ?? 0],
    ["Mislukt", statusAantal.get("MISLUKT") ?? 0],
    ["Onvolledig", statusAantal.get("ONVOLLEDIG") ?? 0],
    [
      "Gemiddelde duur",
      duur(Math.round(duurGemiddeld._avg.actieveDuurSeconden ?? 0)),
    ],
    ["OVAM-link geklikt", linkKlikken],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href="/laattijdige-plaatsbezoeken"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Terug naar laattijdige plaatsbezoeken
        </Link>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Alleen beheerders
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Formuliergebruik
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Gebruik, resultaten en onvolledige sessies van het publieke formulier.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {statistieken.map(([titel, waarde]) => (
          <article
            key={titel}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <p className="break-words text-[10px] font-black uppercase tracking-wide text-slate-500">
              {titel}
            </p>
            <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
              {waarde}
            </p>
          </article>
        ))}
      </section>

      <FormuliergebruikKaarten totaalSessies={aantal} />
    </div>
  );
}

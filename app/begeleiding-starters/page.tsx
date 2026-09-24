import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function jaNee(waarde: boolean | null) {
  if (waarde === null) {
    return "—";
  }

  return waarde ? "Ja" : "Nee";
}

function waarde(invoer: string | number | null) {
  if (invoer === null || String(invoer).trim() === "") {
    return "—";
  }

  return String(invoer);
}

function datum(invoer: Date | null) {
  if (!invoer) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(invoer);
}

export default async function BegeleidingStartersPage() {
  await vereisMachtiging("CERTIFICATEN_BEKIJKEN");

  const leden = await prisma.lid.findMany({
    where: {
      verwijderdOp: null,
      begeleidingstraject: true,
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
      lidSoort: true,
      bedrijf: true,
      telefoonnummer: true,
      mailadres: true,
      aansluiting: true,
      verzekeringVerlooptOp: true,
      praktijkBijscholingGevolgd: true,
      bijscholing2026Gevolgd: true,
      overgekomenVan: true,
      aantalAttestenAndereCi2026: true,
      controleverslagenOvergenomen: true,
      officieleKlachten: true,
      officieleKlachtenToelichting: true,
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        titel="Begeleiding starters"
        beschrijving="Leden waarvoor een begeleidingstraject is aangeduid."
      />

      {leden.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="font-bold text-slate-950">
            Geen begeleidingstrajecten
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Leden met begeleidingstraject Ja verschijnen automatisch in deze
            lijst.
          </p>
        </div>
      ) : (
        <ol className="grid gap-4 xl:grid-cols-2">
          {leden.map((lid) => (
            <li
              key={lid.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-950">
                    {lid.naamPersoon}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {lid.ovamId}
                  </p>
                </div>

                <Link
                  href={`/persoonscertificaten/${lid.id}`}
                  className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Persoonscertificaat bekijken
                </Link>
              </div>

              <dl className="mt-4 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="font-semibold text-slate-500">Type</dt>
                  <dd className="mt-1 text-slate-900">
                    {lid.lidSoort === "NIEUW_LID"
                      ? "Nieuw lid"
                      : lid.lidSoort === "OVERNAME"
                        ? "Overname"
                        : "—"}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">Bedrijf</dt>
                  <dd className="mt-1 text-slate-900">{waarde(lid.bedrijf)}</dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">Aansluiting</dt>
                  <dd className="mt-1 text-slate-900">
                    {waarde(lid.aansluiting)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Telefoonnummer
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {waarde(lid.telefoonnummer)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">E-mailadres</dt>
                  <dd className="mt-1 break-words text-slate-900">
                    {waarde(lid.mailadres)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Verzekering verloopt op
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {datum(lid.verzekeringVerlooptOp)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Praktijkbijscholing gevolgd
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {jaNee(lid.praktijkBijscholingGevolgd)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Bijscholing 2026 gevolgd
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {jaNee(lid.bijscholing2026Gevolgd)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Overgekomen van
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {lid.overgekomenVan === "COPRO"
                      ? "Copro"
                      : lid.overgekomenVan === "DNV"
                        ? "DNV"
                        : "—"}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Attesten andere CI in 2026
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {waarde(lid.aantalAttestenAndereCi2026)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Controleverslagen overgenomen
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {jaNee(lid.controleverslagenOvergenomen)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-slate-500">
                    Officiële klachten
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {jaNee(lid.officieleKlachten)}
                  </dd>
                </div>

                {lid.officieleKlachten ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="font-semibold text-slate-500">
                      Welke officiële klachten?
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                      {waarde(lid.officieleKlachtenToelichting)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

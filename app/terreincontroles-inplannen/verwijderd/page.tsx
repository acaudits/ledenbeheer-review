import Link from "next/link";

import TerreincontroleHerstelKnop from "@/components/TerreincontroleHerstelKnop";
import { vereisMachtiging } from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";
import {
  maakGoogleMapsUrl,
} from "@/lib/terreincontrole";

export const dynamic =
  "force-dynamic";

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

function formatteerDatumTijd(
  datum: Date | null,
) {
  if (!datum) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(datum);
}

export default async function VerwijderdeTerreincontrolesPage() {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

  const terreincontroles =
    await prisma.terreincontrole.findMany(
      {
        where: {
          verwijderdOp: {
            not: null,
          },
        },

        orderBy: [
          {
            verwijderdOp:
              "desc",
          },
          {
            id: "desc",
          },
        ],

        select: {
          id: true,
          auditeur: true,
          status: true,
          factuurVerzonden: true,
          inspectielocatie: true,
          adres: true,
          datumPlaatsbezoek: true,
          uurPlaatsbezoek: true,
          attestId: true,
          verwijderdOp: true,
        },
      },
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/terreincontroles-inplannen"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            >
              ← Terug naar terreincontroles
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Verwijderde terreincontroles
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {terreincontroles.length}{" "}
              verwijderde{" "}
              {terreincontroles.length ===
              1
                ? "terreincontrole"
                : "terreincontroles"}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {terreincontroles.length ===
          0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                Er zijn geen verwijderde terreincontroles.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Acties
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Google Maps
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Auditeur
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Status
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Factuur verzonden
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Inspectielocatie
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Datum plaatsbezoek
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Uur
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Attest-ID
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Verwijderd op
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {terreincontroles.map(
                    (
                      terreincontrole,
                    ) => {
                      const googleMapsUrl =
                        maakGoogleMapsUrl(
                          terreincontrole
                            .inspectielocatie ??
                            terreincontrole
                              .adres,
                        );

                      return (
                        <tr
                          key={
                            terreincontrole.id
                          }
                          className="align-top hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <TerreincontroleHerstelKnop
                              id={
                                terreincontrole.id
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            {googleMapsUrl ? (
                              <a
                                href={
                                  googleMapsUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-700 underline"
                              >
                                Openen
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {terreincontrole
                              .auditeur ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            {terreincontrole
                              .status ??
                              "NULL"}
                          </td>

                          <td className="px-4 py-3">
                            {terreincontrole
                              .factuurVerzonden
                              ? "Ja"
                              : "Nee"}
                          </td>

                          <td className="max-w-sm px-4 py-3">
                            {terreincontrole
                              .inspectielocatie ??
                              terreincontrole
                                .adres ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatteerDatum(
                              terreincontrole
                                .datumPlaatsbezoek,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {terreincontrole
                              .uurPlaatsbezoek ??
                              "—"}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            {terreincontrole
                              .attestId ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatteerDatumTijd(
                              terreincontrole
                                .verwijderdOp,
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


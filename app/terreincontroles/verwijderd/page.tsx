import Link from "next/link";

import { herstelTerreincontrole } from "@/app/terreincontroles/dossier-actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    hersteld?: string;
  }>;
};

function datum(
  waarde: Date | null,
) {
  if (!waarde) {
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
  ).format(waarde);
}

export default async function VerwijderdeTerreincontrolesPage({
  searchParams,
}: Props) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const { hersteld } =
    await searchParams;

  const dossiers =
    await prisma.terreincontroleDossier.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      orderBy: {
        verwijderdOp: "desc",
      },
    });

  return (
    <div className="space-y-5">
      <Link
        href="/terreincontroles"
        className="text-sm font-bold text-emerald-700"
      >
        ← Terug naar terreincontroles
      </Link>

      {hersteld === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          De terreincontrole is hersteld.
        </div>
      ) : null}

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">
          Verwijderde terreincontroles
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {dossiers.length} verwijderd
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {dossiers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Er zijn geen verwijderde terreincontroles.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    Attestnummer
                  </th>
                  <th className="px-4 py-3">
                    Naam ADI
                  </th>
                  <th className="px-4 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="px-4 py-3">
                    Verwijderd op
                  </th>
                  <th className="px-4 py-3">
                    Actie
                  </th>
                </tr>
              </thead>

              <tbody>
                {dossiers.map(
                  (dossier) => {
                    const actie =
                      herstelTerreincontrole.bind(
                        null,
                        dossier.id,
                      );

                    return (
                      <tr
                        key={
                          dossier.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-bold">
                          {
                            dossier.attestnummer
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            dossier.naamAdi
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            dossier.bedrijfsnaam
                          }
                        </td>
                        <td className="px-4 py-3">
                          {datum(
                            dossier.verwijderdOp,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={
                              actie
                            }
                          >
                            <button
                              type="submit"
                              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
                            >
                              Herstellen
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

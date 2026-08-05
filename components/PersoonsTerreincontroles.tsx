import Link from "next/link";

import { prisma } from "@/lib/prisma";

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

function toonWaarde(
  waarde:
    | string
    | number
    | null
    | undefined,
) {
  if (
    waarde === null ||
    waarde === undefined ||
    String(waarde).trim() === ""
  ) {
    return "—";
  }

  return String(waarde);
}

function statusLabel(
  status: string,
) {
  switch (status) {
    case "IN_OPMAAK":
      return "In opmaak";

    case "GEACTUALISEERD":
      return "Geactualiseerd";

    case "AFGEROND":
      return "Afgerond";

    default:
      return "Geen";
  }
}

function statusStijl(
  status: string,
) {
  switch (status) {
    case "AFGEROND":
      return "border-green-200 bg-green-100 text-green-900";

    case "GEACTUALISEERD":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";

    case "IN_OPMAAK":
      return "border-amber-200 bg-amber-100 text-amber-900";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export async function PersoonsTerreincontroles({
  lidId,
}: {
  lidId: number;
}) {
  const terreincontroles =
    await prisma.terreincontroleDossier.findMany({
      where: {
        lidId,
        verwijderdOp: null,
      },
      orderBy: [
        {
          datumControle: "desc",
        },
        {
          id: "desc",
        },
      ],
      include: {
        vaststellingen: {
          orderBy: [
            {
              excelRij: "asc",
            },
            {
              id: "asc",
            },
          ],
        },
      },
    });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-950">

          Terreincontroles en non-conformiteiten
        </h2>

        <p className="mt-1 text-sm text-slate-600">

          Alle actieve terreincontroles uit de nieuwe lijst,
          met de non-conformiteiten per controle.
        </p>
      </div>

      {terreincontroles.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-bold text-slate-900">
            Geen terreincontroles
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Aan dit persoonscertificaat zijn geen actieve
            terreincontroles gekoppeld.
          </p>
        </div>
      ) : (
        terreincontroles.map(
          (terreincontrole) => (
            <article
              key={terreincontrole.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-950">
                      {terreincontrole.attestnummer ||
                        `Terreincontrole #${terreincontrole.id}`}
                    </h3>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStijl(
                        terreincontrole.status,
                      )}`}
                    >
                      {statusLabel(
                        terreincontrole.status,
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Controle op{" "}
                    {formatteerDatum(
                      terreincontrole.datumControle,
                    )}{" "}
                    · {terreincontrole.bedrijfsnaam}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {terreincontrole.vaststellingen.length}{" "}
                    {terreincontrole.vaststellingen.length === 1
                      ? "vaststelling"
                      : "non-conformiteiten"}
                  </p>
                </div>

                <Link
                  href={`/terreincontroles/${terreincontrole.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Terreincontrole bekijken
                </Link>
              </header>

              <dl className="grid gap-4 border-b border-slate-200 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Auditeur
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole.auditeur,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Attest-ID
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole.attestId,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Adres
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole.adres,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Bedrijfsnaam
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole.bedrijfsnaam,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Ondernemingsnummer
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole.ondernemingsnummer,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Persoonscertificaat
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole
                        .persoonscertificaatNummer,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Procescertificaat
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole
                        .procescertificaatNummer,
                    )}
                  </dd>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Opmerkingen
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">
                    {toonWaarde(
                      terreincontrole.opmerkingen,
                    )}
                  </dd>
                </div>
              </dl>

              <div className="px-5 py-5">
                <h4 className="text-sm font-bold text-slate-950">

                  Non-conformiteiten
                </h4>

                {terreincontrole.vaststellingen.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">

                    Aan deze terreincontrole zijn nog geen
                    non-conformiteiten gekoppeld.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-[1800px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">
                            NC-ID
                          </th>
                          <th className="px-4 py-3">
                            Parameter
                          </th>
                          <th className="px-4 py-3">
                            Omschrijving
                          </th>
                          <th className="px-4 py-3">
                            Vastgesteld door CI
                          </th>
                          <th className="px-4 py-3">
                            Verduidelijking
                          </th>
                          <th className="px-4 py-3">
                            Grote impact
                          </th>
                          <th className="px-4 py-3">
                            Categorie
                          </th>
                          <th className="px-4 py-3">
                            Motivatie aanpassing
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {terreincontrole.vaststellingen.map(
                          (vaststelling) => (
                            <tr
                              key={vaststelling.id}
                              className="border-t border-slate-100 align-top"
                            >
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {toonWaarde(
                                  vaststelling.ncId,
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {toonWaarde(
                                  vaststelling.parameter,
                                )}
                              </td>

                              <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                                {toonWaarde(
                                  vaststelling.omschrijving,
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {toonWaarde(
                                  vaststelling.vastgesteldDoorCi,
                                )}
                              </td>

                              <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                                {toonWaarde(
                                  vaststelling.verduidelijking,
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {toonWaarde(
                                  vaststelling.groteImpact,
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {toonWaarde(
                                  vaststelling.categorie,
                                )}
                              </td>

                              <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                                {toonWaarde(
                                  vaststelling.motivatieAanpassing,
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </article>
          ),
        )
      )}
    </section>
  );
}

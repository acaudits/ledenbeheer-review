import Link from "next/link";

import {
  Prisma,
} from "@/generated/prisma/client";
import {
  vereisBeheerder,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type Props = {
  searchParams: Promise<{
    pagina?: string;
    status?: string;
    zoeken?: string;
  }>;
};

const STATUSSEN = [
  "ALLE",
  "GESTART",
  "BEZIG",
  "MISLUKT",
  "GESLAAGD",
  "ONVOLLEDIG",
] as const;

function datumTijd(
  waarde: Date | null,
) {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      timeZone:
        "Europe/Brussels",
      dateStyle: "short",
      timeStyle: "medium",
    },
  ).format(waarde);
}

function duur(
  seconden: number,
) {
  const veilig =
    Math.max(
      0,
      seconden,
    );

  const uren =
    Math.floor(
      veilig / 3600,
    );

  const minuten =
    Math.floor(
      (
        veilig % 3600
      ) / 60,
    );

  const rest =
    veilig % 60;

  return [
    uren > 0
      ? `${uren} u`
      : "",
    minuten > 0
      ? `${minuten} min`
      : "",
    `${rest} sec`,
  ]
    .filter(Boolean)
    .join(" ");
}

function label(
  waarde: string,
) {
  return waarde
    .toLocaleLowerCase(
      "nl-BE",
    )
    .replaceAll("_", " ")
    .replace(
      /^./,
      (teken) =>
        teken.toLocaleUpperCase(
          "nl-BE",
        ),
    );
}

function statusStijl(
  status: string,
) {
  switch (status) {
    case "GESLAAGD":
      return "bg-emerald-100 text-emerald-900";
    case "MISLUKT":
      return "bg-red-100 text-red-900";
    case "ONVOLLEDIG":
      return "bg-amber-100 text-amber-950";
    case "BEZIG":
      return "bg-blue-100 text-blue-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function tekstUitMomentopname(
  momentopname: Prisma.JsonValue | null,
  sleutel: string,
) {
  if (
    typeof momentopname !==
      "object" ||
    momentopname === null ||
    Array.isArray(momentopname)
  ) {
    return "—";
  }

  const waarde =
    momentopname[
      sleutel
    ];

  return typeof waarde ===
    "string" &&
    waarde.trim()
      ? waarde
      : "—";
}

function bepaalOnvolledigGrens() {
  return new Date(
    Date.now() - 2 * 60_000,
  );
}

export default async function FormuliergebruikPage({
  searchParams,
}: Props) {
  await vereisBeheerder();

  /*
   * Oude actieve sessies waarvan geen heartbeat
   * meer aankwam als onvolledig markeren.
   */
  await prisma
    .laattijdigeFormulierSessie
    .updateMany({
      where: {
        status: {
          in: [
            "GESTART",
            "BEZIG",
          ],
        },
        laatsteActiviteitOp: {
          lt: bepaalOnvolledigGrens(),
        },
      },
      data: {
        status:
          "ONVOLLEDIG",
      },
    });

  const parameters =
    await searchParams;

  const pagina =
    Math.max(
      1,
      Number.parseInt(
        parameters.pagina ??
          "1",
        10,
      ) || 1,
    );

  const zoeken =
    (
      parameters.zoeken ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);

  const status =
    STATUSSEN.includes(
      parameters.status as
        typeof STATUSSEN[number],
    )
      ? parameters.status ??
        "ALLE"
      : "ALLE";

  const voorwaarden:
    Prisma.LaattijdigeFormulierSessieWhereInput[] =
      [];

  if (
    status !== "ALLE"
  ) {
    voorwaarden.push({
      status:
        status as
          | "GESTART"
          | "BEZIG"
          | "MISLUKT"
          | "GESLAAGD"
          | "ONVOLLEDIG",
    });
  }

  if (zoeken) {
    voorwaarden.push({
      OR: [
        {
          foutmelding: {
            contains: zoeken,
            mode:
              "insensitive",
          },
        },
        {
          foutcode: {
            contains: zoeken,
            mode:
              "insensitive",
          },
        },
        {
          melding: {
            referentie: {
              contains:
                zoeken,
              mode:
                "insensitive",
            },
          },
        },
      ],
    });
  }

  const where:
    Prisma.LaattijdigeFormulierSessieWhereInput =
      voorwaarden.length
        ? {
            AND:
              voorwaarden,
          }
        : {};

  const limiet = 50;
  const overslaan =
    (
      pagina - 1
    ) * limiet;

  const [
    sessies,
    aantal,
    perStatus,
    duurGemiddeld,
    linkKlikken,
  ] = await Promise.all([
    prisma
      .laattijdigeFormulierSessie
      .findMany({
        where,
        orderBy: [
          {
            gestartOp:
              "desc",
          },
          {
            id: "desc",
          },
        ],
        skip: overslaan,
        take: limiet,
        include: {
          melding: {
            select: {
              id: true,
              referentie:
                true,
            },
          },
        },
      }),

    prisma
      .laattijdigeFormulierSessie
      .count(),

    prisma
      .laattijdigeFormulierSessie
      .groupBy({
        by: [
          "status",
        ],
        _count: {
          _all: true,
        },
      }),

    prisma
      .laattijdigeFormulierSessie
      .aggregate({
        _avg: {
          actieveDuurSeconden:
            true,
        },
      }),

    prisma
      .laattijdigeFormulierSessie
      .count({
        where: {
          ovamLinkGeklikt:
            true,
        },
      }),
  ]);

  const statusAantal =
    new Map(
      perStatus.map(
        (rij) => [
          rij.status,
          rij._count._all,
        ],
      ),
    );

  const totaalPaginas =
    Math.max(
      1,
      Math.ceil(
        (
          await prisma
            .laattijdigeFormulierSessie
            .count({
              where,
            })
        ) / limiet,
      ),
    );

  function paginaHref(
    volgendePagina: number,
  ) {
    const query =
      new URLSearchParams();

    if (zoeken) {
      query.set(
        "zoeken",
        zoeken,
      );
    }

    if (
      status !== "ALLE"
    ) {
      query.set(
        "status",
        status,
      );
    }

    query.set(
      "pagina",
      String(
        volgendePagina,
      ),
    );

    return `/laattijdige-plaatsbezoeken/formuliergebruik?${query.toString()}`;
  }

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href="/laattijdige-plaatsbezoeken"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          [
            "Totaal",
            aantal,
          ],
          [
            "Geslaagd",
            statusAantal.get(
              "GESLAAGD",
            ) ?? 0,
          ],
          [
            "Mislukt",
            statusAantal.get(
              "MISLUKT",
            ) ?? 0,
          ],
          [
            "Onvolledig",
            statusAantal.get(
              "ONVOLLEDIG",
            ) ?? 0,
          ],
          [
            "Gemiddelde duur",
            duur(
              Math.round(
                duurGemiddeld
                  ._avg
                  .actieveDuurSeconden ??
                  0,
              ),
            ),
          ],
          [
            "OVAM-link geklikt",
            linkKlikken,
          ],
        ].map(
          ([titel, waarde]) => (
            <article
              key={titel}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {titel}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {waarde}
              </p>
            </article>
          ),
        )}
      </section>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
        <input
          name="zoeken"
          type="search"
          defaultValue={
            zoeken
          }
          placeholder="Zoeken op fout of referentie"
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
        />

        <select
          name="status"
          defaultValue={
            status
          }
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
        >
          {STATUSSEN.map(
            (waarde) => (
              <option
                key={waarde}
                value={waarde}
              >
                {label(
                  waarde,
                )}
              </option>
            ),
          )}
        </select>

        <button
          type="submit"
          className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Filteren
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">
                  Gestart
                </th>
                <th className="px-4 py-3">
                  Laatste activiteit
                </th>
                <th className="px-4 py-3">
                  Duur
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Stopstap
                </th>
                <th className="px-4 py-3">
                  Apparaat
                </th>
                <th className="px-4 py-3">
                  Naam ADI
                </th>
                <th className="px-4 py-3">
                  PersoonsID
                </th>
                <th className="px-4 py-3">
                  Fout
                </th>
                <th className="px-4 py-3">
                  OVAM-link
                </th>
                <th className="px-4 py-3">
                  Referentie
                </th>
                <th className="px-4 py-3">
                  Invoer
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sessies.map(
                (sessie) => (
                  <tr
                    key={
                      sessie.id
                    }
                    className="align-top"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {datumTijd(
                        sessie.gestartOp,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {datumTijd(
                        sessie.laatsteActiviteitOp,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {duur(
                        sessie.actieveDuurSeconden,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStijl(
                          sessie.status,
                        )}`}
                      >
                        {label(
                          sessie.status,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {label(
                        sessie.stap,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {label(
                        sessie.apparaat,
                      )}
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      {tekstUitMomentopname(
                        sessie.momentopname,
                        "naamAdi",
                      )}
                    </td>
                    <td className="max-w-48 px-4 py-3 font-mono text-xs">
                      {tekstUitMomentopname(
                        sessie.momentopname,
                        "persoonsId",
                      )}
                    </td>
                    <td className="max-w-80 px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {sessie.foutcode ??
                          "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {sessie.foutmelding ??
                          ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {sessie.ovamLinkGeklikt
                        ? `Ja (${sessie.ovamLinkKlikken})`
                        : "Nee"}
                    </td>
                    <td className="px-4 py-3">
                      {sessie.melding
                        ?.referentie ??
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {sessie.momentopname ? (
                        <details>
                          <summary className="cursor-pointer font-bold text-emerald-800">
                            Bekijken
                          </summary>
                          <pre className="mt-2 max-h-96 w-[500px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                            {JSON.stringify(
                              sessie.momentopname,
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ),
              )}

              {sessies.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Geen formulierlogs gevonden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-600">
            Pagina {pagina} van{" "}
            {totaalPaginas}
          </p>

          <div className="flex gap-2">
            {pagina > 1 ? (
              <Link
                href={paginaHref(
                  pagina - 1,
                )}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              >
                Vorige
              </Link>
            ) : null}

            {pagina <
            totaalPaginas ? (
              <Link
                href={paginaHref(
                  pagina + 1,
                )}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
              >
                Volgende
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

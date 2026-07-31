import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

function deskstatusLabel(
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

function terreinstatusLabel(
  status: string | null,
) {
  switch (status) {
    case "ACTUEEL_ATTEST":
      return "Actueel attest";

    case "IN_OPMAAK":
      return "In opmaak";

    case "GEARCHIVEERD_ATTEST":
      return "Gearchiveerd attest";

    default:
      return "Geen status";
  }
}

function StatistiekKaart({
  label,
  waarde,
  accent = false,
  waarschuwing = false,
}: {
  label: string;
  waarde: number;
  accent?: boolean;
  waarschuwing?: boolean;
}) {
  const stijl = waarschuwing
    ? "border-amber-200 bg-amber-50"
    : accent
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-white";

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${stijl}`}
    >
      <p className="text-sm font-medium text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {waarde}
      </p>
    </article>
  );
}

type MijnOverzichtPageProps = {
  searchParams: Promise<{
    gebruiker?: string;
    periode?: string;
  }>;
};

export default async function MijnOverzichtPage({
  searchParams,
}: MijnOverzichtPageProps) {
  const ingelogdeGebruiker =
    await vereisIngelogdeGebruiker();

  const parameters =
    await searchParams;

  const magGebruikerKiezen =
    ingelogdeGebruiker.rol ===
    "BEHEERDER";

  const gebruikers =
    magGebruikerKiezen
      ? await prisma.toegestaneGebruiker.findMany({
          where: {
            actief: true,
            rol: {
              in: [
                "AUDITEUR",
                "BEHEERDER",
              ],
            },
          },
          select: {
            id: true,
            naam: true,
            email: true,
            rol: true,
          },
          orderBy: [
            {
              naam: "asc",
            },
            {
              email: "asc",
            },
          ],
        })
      : [];

  let gebruiker =
    ingelogdeGebruiker;

  if (
    magGebruikerKiezen &&
    parameters.gebruiker
  ) {
    const gekozenId =
      Number(
        parameters.gebruiker,
      );

    if (
      Number.isInteger(
        gekozenId,
      ) &&
      gekozenId > 0
    ) {
      const gekozenGebruiker =
        await prisma.toegestaneGebruiker.findFirst({
          where: {
            id: gekozenId,
            actief: true,
            rol: {
              in: [
                "AUDITEUR",
                "BEHEERDER",
              ],
            },
          },
        });

      if (gekozenGebruiker) {
        gebruiker =
          gekozenGebruiker;
      }
    }
  }

  const vandaag = new Date();

  vandaag.setUTCHours(
    0,
    0,
    0,
    0,
  );

  const periode =
    parameters.periode === "30" ||
    parameters.periode === "90" ||
    parameters.periode === "365"
      ? parameters.periode
      : "alles";

  const datumVanaf =
    periode === "alles"
      ? null
      : new Date(vandaag);

  if (datumVanaf) {
    datumVanaf.setUTCDate(
      datumVanaf.getUTCDate() -
        Number(periode),
    );
  }

  const deskFilter = {
    auditeurGebruikerId:
      gebruiker.id,
    verwijderdOp: null,
    ...(datumVanaf
      ? {
          datumControle: {
            gte: datumVanaf,
          },
        }
      : {}),
  };

  const terreinFilter = {
    auditeurGebruikerId:
      gebruiker.id,
    verwijderdOp: null,
    ...(datumVanaf
      ? {
          datumPlaatsbezoek: {
            gte: datumVanaf,
          },
        }
      : {}),
  };

  const [
    deskTotaal,
    deskOpen,
    deskAfgerond,
    deskDeadlineVerlopen,
    terreinTotaal,
    terreinInOpmaak,
    terreinGepland,
    deskcontroles,
    terreincontroles,
  ] = await Promise.all([
    prisma.deskcontrole.count({
      where: {
        ...deskFilter,
      },
    }),

    prisma.deskcontrole.count({
      where: {
        ...deskFilter,
        status: {
          not: "AFGEROND",
        },
      },
    }),

    prisma.deskcontrole.count({
      where: {
        ...deskFilter,
        status: "AFGEROND",
      },
    }),

    prisma.deskcontrole.count({
      where: {
        ...deskFilter,
        status: {
          not: "AFGEROND",
        },
        OR: [
          {
            deadlineSanctie: {
              lt: vandaag,
            },
          },
          {
            deadlineCorrectie: {
              lt: vandaag,
            },
          },
        ],
      },
    }),

    prisma.terreincontrole.count({
      where: {
        ...terreinFilter,
      },
    }),

    prisma.terreincontrole.count({
      where: {
        ...terreinFilter,
        status: "IN_OPMAAK",
      },
    }),

    prisma.terreincontrole.count({
      where: {
        ...terreinFilter,
        datumPlaatsbezoek: {
          gte: vandaag,
        },
      },
    }),

    prisma.deskcontrole.findMany({
      where: {
        ...deskFilter,
      },
      select: {
        id: true,
        attestnummer: true,
        status: true,
        datumControle: true,
        deadlineSanctie: true,
        deadlineCorrectie: true,
        lid: {
          select: {
            naamPersoon: true,
          },
        },
      },
      orderBy: [
        {
          datumControle: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: 8,
    }),

    prisma.terreincontrole.findMany({
      where: {
        ...terreinFilter,
      },
      select: {
        id: true,
        status: true,
        datumPlaatsbezoek: true,
        uurPlaatsbezoek: true,
        inspectielocatie: true,
        gemeente: true,
        naamAdi: true,
      },
      orderBy: [
        {
          datumPlaatsbezoek: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        bovenTitel="Persoonlijk"
        titel={
          gebruiker.id ===
          ingelogdeGebruiker.id
            ? `Welkom, ${gebruiker.voornaam ?? gebruiker.naam ?? "gebruiker"}`
            : `Overzicht van ${gebruiker.naam ?? gebruiker.email}`
        }
        beschrijving={
          gebruiker.id ===
          ingelogdeGebruiker.id
            ? "Bekijk je persoonlijke statistieken en de controles die via je gebruikersprofiel aan jou gekoppeld zijn."
            : "Beheerderweergave van de controles die aan deze gebruiker gekoppeld zijn."
        }
      />

      {magGebruikerKiezen ? (
        <form
          method="get"
          action="/mijn-overzicht"
          className="-mt-3 mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
        >
          <input
            type="hidden"
            name="periode"
            value={periode}
          />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="gebruiker"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Overzicht van gebruiker
            </label>

            <select
              id="gebruiker"
              name="gebruiker"
              defaultValue={
                gebruiker.id
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              {gebruikers.map(
                (optie) => (
                  <option
                    key={optie.id}
                    value={optie.id}
                  >
                    {optie.naam ??
                      optie.email}
                    {optie.rol ===
                    "BEHEERDER"
                      ? " (beheerder)"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Overzicht tonen
          </button>
        </form>
      ) : null}

      <form
        method="get"
        action="/mijn-overzicht"
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
      >
        {magGebruikerKiezen ? (
          <input
            type="hidden"
            name="gebruiker"
            value={gebruiker.id}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <label
            htmlFor="periode"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Periode
          </label>

          <select
            id="periode"
            name="periode"
            defaultValue={periode}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="30">
              Laatste 30 dagen
            </option>

            <option value="90">
              Laatste 90 dagen
            </option>

            <option value="365">
              Laatste 365 dagen
            </option>

            <option value="alles">
              Alle gegevens
            </option>
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Periode toepassen
        </button>
      </form>

      <div className="-mt-3 mb-7">
        <Link
          href="/mijn-profiel"
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
        >
          Profiel wijzigen
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatistiekKaart
          label="Mijn deskcontroles"
          waarde={deskTotaal}
        />

        <StatistiekKaart
          label="Open deskcontroles"
          waarde={deskOpen}
          accent
        />

        <StatistiekKaart
          label="Afgeronde deskcontroles"
          waarde={deskAfgerond}
        />

        <StatistiekKaart
          label="Verlopen deadlines"
          waarde={deskDeadlineVerlopen}
          waarschuwing={
            deskDeadlineVerlopen > 0
          }
        />

        <StatistiekKaart
          label="Mijn terreincontroles"
          waarde={terreinTotaal}
        />

        <StatistiekKaart
          label="Terrein in opmaak"
          waarde={terreinInOpmaak}
          accent
        />

        <StatistiekKaart
          label="Geplande plaatsbezoeken"
          waarde={terreinGepland}
        />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Mijn deskcontroles
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              De acht meest recente controles.
            </p>
          </div>

          <Link
            href="/deskcontroles"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Alle deskcontroles →
          </Link>
        </header>

        {deskcontroles.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Er zijn nog geen deskcontroles aan je profiel gekoppeld.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Controle
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    ADI
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Datum
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Deadline
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {deskcontroles.map(
                  (controle) => {
                    const deadline =
                      controle.deadlineCorrectie ??
                      controle.deadlineSanctie;

                    return (
                      <tr
                        key={controle.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/deskcontroles/${controle.id}`}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {controle.attestnummer ??
                              `Deskcontrole #${controle.id}`}
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {controle.lid.naamPersoon}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {formatteerDatum(
                            controle.datumControle,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {deskstatusLabel(
                            controle.status,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {formatteerDatum(
                            deadline,
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
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Mijn terreincontroles
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              De acht meest recente plaatsbezoeken.
            </p>
          </div>

          <Link
            href="/terreincontroles"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Alle terreincontroles →
          </Link>
        </header>

        {terreincontroles.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Er zijn nog geen terreincontroles aan je profiel gekoppeld.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Controle
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Locatie
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Datum
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {terreincontroles.map(
                  (controle) => (
                    <tr
                      key={controle.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/terreincontroles/${controle.id}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {controle.naamAdi ??
                            `Terreincontrole #${controle.id}`}
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {controle.inspectielocatie ??
                          controle.gemeente ??
                          "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {formatteerDatum(
                          controle.datumPlaatsbezoek,
                        )}
                        {controle.uurPlaatsbezoek
                          ? ` · ${controle.uurPlaatsbezoek}`
                          : ""}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {terreinstatusLabel(
                          controle.status,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

function formatteerDatum(
  datum: Date,
) {
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

function plaatsbezoekLabel(
  waarde: string,
) {
  switch (waarde) {
    case "SPONTAAN":
      return "Spontaan";

    case "TELEFONISCHE_AFSPRAAK":
      return "Telefonische afspraak";

    case "EMAILAFSPRAAK":
      return "E-mailafspraak";

    case "KLACHT":
      return "Klacht";

    default:
      return waarde;
  }
}

function typeLabel(
  waarde: string,
) {
  switch (waarde) {
    case "GEHEEL":
      return "Geheel";

    case "DEELS":
      return "Deels";

    case "ENKEL_OPENBARE_WEG":
      return "Enkel van openbare weg";

    default:
      return waarde;
  }
}

function toonWaarde(
  waarde:
    | string
    | null
    | undefined,
) {
  return waarde?.trim() ||
    "—";
}

export async function PersoonsNaFinalisatie({
  lidId,
}: {
  lidId: number;
}) {
  const lid =
    await prisma.lid.findFirst({
      where: {
        id: lidId,
        verwijderdOp: null,
      },
      select: {
        ovamId: true,
      },
    });

  if (!lid) {
    return null;
  }

  const registraties =
    await prisma.naFinalisatie.findMany({
      where: {
        verwijderdOp: null,
        geregistreerd: true,
        persoonsId: {
          equals:
            lid.ovamId,
          mode: "insensitive",
        },
      },
      orderBy: [
        {
          datumNaFinalisatie:
            "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        auditeur: true,
        attestnummer: true,
        linkAttest: true,
        datumNaFinalisatie:
          true,
        plaatsbezoek: true,
        typeControle: true,
        inspectielocatie:
          true,
        naamBedrijf: true,
        reden: true,
        opmerking: true,
      },
    });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Na finalisatie
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Geregistreerde controles na
          finalisatie die via PersoonsID
          aan dit persoonscertificaat
          gekoppeld zijn.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Na finalisatie
          </p>

          <p className="mt-2 text-3xl font-black">
            {registraties.length}
          </p>
        </article>

        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Geheel
          </p>

          <p className="mt-2 text-3xl font-black">
            {
              registraties.filter(
                (registratie) =>
                  registratie.typeControle ===
                  "GEHEEL",
              ).length
            }
          </p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Deels / openbare weg
          </p>

          <p className="mt-2 text-3xl font-black">
            {
              registraties.filter(
                (registratie) =>
                  registratie.typeControle !==
                  "GEHEEL",
              ).length
            }
          </p>
        </article>
      </div>

      {registraties.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-bold text-slate-900">
            Geen registraties na
            finalisatie
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Er zijn nog geen
            geregistreerde controles na
            finalisatie voor dit
            persoonscertificaat.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Datum
                  </th>

                  <th className="px-4 py-3">
                    Auditeur
                  </th>

                  <th className="px-4 py-3">
                    Plaatsbezoek
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3">
                    Attestnummer
                  </th>

                  <th className="px-4 py-3">
                    Inspectielocatie
                  </th>

                  <th className="px-4 py-3">
                    Naam bedrijf
                  </th>

                  <th className="px-4 py-3">
                    Reden
                  </th>

                  <th className="px-4 py-3">
                    Opmerking
                  </th>

                  <th className="px-4 py-3">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {registraties.map(
                  (registratie) => (
                    <tr
                      key={
                        registratie.id
                      }
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatteerDatum(
                          registratie.datumNaFinalisatie,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {
                          registratie.auditeur
                        }
                      </td>

                      <td className="px-4 py-3">
                        {plaatsbezoekLabel(
                          registratie.plaatsbezoek,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {typeLabel(
                          registratie.typeControle,
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {
                          registratie.attestnummer
                        }
                      </td>

                      <td className="max-w-72 whitespace-pre-wrap px-4 py-3">
                        {toonWaarde(
                          registratie.inspectielocatie,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {toonWaarde(
                          registratie.naamBedrijf,
                        )}
                      </td>

                      <td className="max-w-72 whitespace-pre-wrap px-4 py-3">
                        {toonWaarde(
                          registratie.reden,
                        )}
                      </td>

                      <td className="max-w-72 whitespace-pre-wrap px-4 py-3">
                        {toonWaarde(
                          registratie.opmerking,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-2">
                          <Link
                            href={`/na-finalisatie/${registratie.id}`}
                            className="font-bold text-emerald-700 hover:text-emerald-900"
                          >
                            Open registratie
                          </Link>

                          <a
                            href={
                              registratie.linkAttest
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-600 underline hover:text-slate-900"
                          >
                            Open attest
                          </a>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-xs font-medium text-slate-500">
            {registraties.length}{" "}
            {registraties.length === 1
              ? "geregistreerde controle"
              : "geregistreerde controles"}
          </div>
        </div>
      )}
    </section>
  );
}

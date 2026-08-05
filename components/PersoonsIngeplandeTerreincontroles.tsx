import Link from "next/link";

import {
  formatteerDatabaseTijd,
} from "@/lib/terreincontrole";

export type PersoonsIngeplandeTerreincontrole = {
  id: number;
  auditeur: string | null;
  factuurVerzonden:
    | boolean
    | null;
  status:
    | "GEARCHIVEERD_ATTEST"
    | "ACTUEEL_ATTEST"
    | "IN_OPMAAK"
    | null;
  attestUrl: string | null;
  opmerkingen: string | null;
  adres: string | null;
  inspectielocatie:
    | string
    | null;
  datumPlaatsbezoek:
    | Date
    | null;
  uurPlaatsbezoek:
    | Date
    | null;
  naamAdi: string | null;
  bedrijfsnaam: string | null;
  attestId: string;
};

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
  status:
    PersoonsIngeplandeTerreincontrole["status"],
) {
  switch (status) {
    case "GEARCHIVEERD_ATTEST":
      return "Gearchiveerd attest";

    case "ACTUEEL_ATTEST":
      return "Actueel attest";

    case "IN_OPMAAK":
      return "In opmaak";

    default:
      return "Geen status";
  }
}

function statusStijl(
  status:
    PersoonsIngeplandeTerreincontrole["status"],
) {
  switch (status) {
    case "ACTUEEL_ATTEST":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";

    case "IN_OPMAAK":
      return "border-amber-200 bg-amber-100 text-amber-900";

    case "GEARCHIVEERD_ATTEST":
      return "border-slate-300 bg-slate-200 text-slate-800";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function PersoonsIngeplandeTerreincontroles({
  terreincontroles,
}: {
  terreincontroles:
    PersoonsIngeplandeTerreincontrole[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Ingeplande terreincontroles
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Alle actieve plaatsbezoeken uit
          Inplannen terreincontrole die via
          het OVAM-ID aan dit
          persoonscertificaat gekoppeld zijn.
        </p>
      </div>

      {terreincontroles.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-bold text-slate-900">
            Geen ingeplande terreincontroles
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Voor dit persoonscertificaat
            zijn nog geen actieve
            plaatsbezoeken geregistreerd.
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
                    Uur
                  </th>
                  <th className="px-4 py-3">
                    Auditeur
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">
                    Inspectielocatie
                  </th>
                  <th className="px-4 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="px-4 py-3">
                    Attest-ID
                  </th>
                  <th className="px-4 py-3">
                    Factuur
                  </th>
                  <th className="px-4 py-3">
                    Opmerkingen
                  </th>
                  <th className="px-4 py-3">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {terreincontroles.map(
                  (terreincontrole) => (
                    <tr
                      key={
                        terreincontrole.id
                      }
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {formatteerDatum(
                          terreincontrole
                            .datumPlaatsbezoek,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          formatteerDatabaseTijd(
                            terreincontrole
                              .uurPlaatsbezoek,
                          ),
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {toonWaarde(
                          terreincontrole
                            .auditeur,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStijl(
                            terreincontrole.status,
                          )}`}
                        >
                          {statusLabel(
                            terreincontrole.status,
                          )}
                        </span>
                      </td>

                      <td className="max-w-80 whitespace-pre-wrap px-4 py-3">
                        {toonWaarde(
                          terreincontrole
                            .inspectielocatie ||
                            terreincontrole
                              .adres,
                        )}
                      </td>

                      <td className="max-w-72 px-4 py-3">
                        {toonWaarde(
                          terreincontrole
                            .bedrijfsnaam,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {
                          terreincontrole
                            .attestId
                        }
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {terreincontrole
                          .factuurVerzonden
                          ? "Verzonden"
                          : "Niet verzonden"}
                      </td>

                      <td className="max-w-80 whitespace-pre-wrap px-4 py-3">
                        {toonWaarde(
                          terreincontrole
                            .opmerkingen,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-2">
                          <Link
                            href={`/terreincontroles-inplannen/${terreincontrole.id}`}
                            className="font-bold text-emerald-700 hover:text-emerald-900"
                          >
                            Bekijken
                          </Link>

                          {terreincontrole
                            .attestUrl ? (
                            <a
                              href={
                                terreincontrole
                                  .attestUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-slate-600 underline hover:text-slate-900"
                            >
                              Open attest
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-xs font-medium text-slate-500">
            {terreincontroles.length}{" "}
            {terreincontroles.length === 1
              ? "ingeplande terreincontrole"
              : "ingeplande terreincontroles"}
          </div>
        </div>
      )}
    </section>
  );
}

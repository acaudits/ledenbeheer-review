import Link from "next/link";
import {
  maakBugRapport,
  wijzigBugStatus,
} from "./actions";
import {
  BugRapportActies,
} from "@/components/BugRapportActies";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    aangemaakt?: string;
    gewijzigd?: string;
    fout?: string;
    verwijderd?: string;
    zoek?: string;
    status?: string;
    prioriteit?: string;
    sorteer?: string;
    richting?: string;
  }>;
};

const datumFormatter =
  new Intl.DateTimeFormat(
    "nl-BE",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Brussels",
    },
  );

function prioriteitLabel(
  prioriteit: number,
) {
  if (prioriteit === 1) {
    return "1 — Noodzakelijk: webapp onbruikbaar";
  }

  if (prioriteit === 2) {
    return "2 — Aanpassing dringend";
  }

  return "3 — Aanpassing nodig";
}

function prioriteitTekstStijl(
  prioriteit: number,
) {
  if (prioriteit === 1) {
    return "border-red-400 bg-red-100 text-red-950";
  }

  if (prioriteit === 2) {
    return "border-orange-400 bg-orange-100 text-orange-950";
  }

  return "border-amber-400 bg-amber-100 text-amber-950";
}

function statusLabel(
  status: string,
) {
  if (status === "IN_BEHANDELING") {
    return "In behandeling";
  }

  if (status === "BEHANDELD") {
    return "Behandeld";
  }

  if (status === "AFGEWEZEN") {
    return "Afgewezen";
  }

  return "Open";
}

function rijStijl(status: string) {
  if (status === "BEHANDELD") {
    return "bg-emerald-100";
  }

  if (status === "IN_BEHANDELING") {
    return "bg-amber-100";
  }

  if (status === "AFGEWEZEN") {
    return "bg-red-100";
  }

  return "bg-white";
}

export default async function BugRapporterenPage({
  searchParams,
}: Props) {
  const gebruiker =
    await vereisMachtiging(
      "CERTIFICATEN_BEKIJKEN",
    );

  const isBeheerder =
    gebruiker.rollen.includes("BEHEERDER");

  const parameters =
    await searchParams;

  const zoek =
    parameters.zoek?.trim() ?? "";

  const statusFilter = [
    "OPEN",
    "IN_BEHANDELING",
    "BEHANDELD",
    "AFGEWEZEN",
  ].find(
    (status) =>
      status === parameters.status,
  ) as
    | "OPEN"
    | "IN_BEHANDELING"
    | "BEHANDELD"
    | "AFGEWEZEN"
    | undefined;

  const prioriteitFilter =
    ["1", "2", "3"].includes(
      parameters.prioriteit ?? "",
    )
      ? Number(parameters.prioriteit)
      : undefined;

  const richting:
    | "asc"
    | "desc" =
    parameters.richting === "asc"
      ? "asc"
      : "desc";

  const sorteer =
    parameters.sorteer ?? "datum";

  const orderBy =
    sorteer === "prioriteit"
      ? [
          { prioriteit: richting },
          { id: "desc" as const },
        ]
      : sorteer === "webpagina"
        ? [
            { webpagina: richting },
            { id: "desc" as const },
          ]
        : sorteer === "status"
          ? [
              { status: richting },
              { id: "desc" as const },
            ]
          : sorteer === "gebruiker"
            ? [
                {
                  gebruikerNaam:
                    richting,
                },
                {
                  id:
                    "desc" as const,
                },
              ]
            : [
                {
                  aangemaaktOp:
                    richting,
                },
                {
                  id:
                    "desc" as const,
                },
              ];

  const rapporten =
    await prisma.bugRapport.findMany({
      where: {
        ...(statusFilter
          ? { status: statusFilter }
          : {}),
        ...(prioriteitFilter
          ? {
              prioriteit:
                prioriteitFilter,
            }
          : {}),
        ...(zoek
          ? {
              OR: [
                {
                  webpagina: {
                    contains: zoek,
                    mode:
                      "insensitive" as const,
                  },
                },
                {
                  uitleg: {
                    contains: zoek,
                    mode:
                      "insensitive" as const,
                  },
                },
                {
                  opmerkingen: {
                    contains: zoek,
                    mode:
                      "insensitive" as const,
                  },
                },
                {
                  gebruikerNaam: {
                    contains: zoek,
                    mode:
                      "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy,
    });

  const foutmeldingen: Record<
    string,
    string
  > = {
    prioriteit:
      "Kies een geldige prioriteit.",
    webpagina:
      "Vul een geldige http- of https-URL in.",
    uitleg:
      "De uitleg moet tussen 5 en 10.000 tekens bevatten.",
    status:
      "De status kon niet worden aangepast.",
    "geen-toegang":
      "Alleen een beheerder mag de status aanpassen of een bugrapport verwijderen.",
  };

  return (
    <main className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-700">
          Ondersteuning
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Bug rapporteren
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Meld problemen en volg de behandeling ervan op.
        </p>
      </header>

      {parameters.aangemaakt === "1" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          Het bugrapport is toegevoegd.
        </p>
      ) : null}

      {parameters.gewijzigd === "1" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          De status is aangepast.
        </p>
      ) : null}

      {parameters.fout ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          {foutmeldingen[
            parameters.fout
          ] ||
            "De bewerking is mislukt."}
        </p>
      ) : null}


      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Nieuwe bug melden
        </h2>

        <form
          action={maakBugRapport}
          className="mt-5 grid gap-4 lg:grid-cols-2"
        >
          <label className="text-sm font-bold text-slate-700">
            Webpagina
            <input
              type="url"
              name="webpagina"
              required
              maxLength={2048}
              placeholder="https://asbestcrm.be/..."
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>

          <label className="text-sm font-bold text-slate-700">
            Prioriteit
            <select
              name="prioriteit"
              defaultValue="3"
              required
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
            >
              <option value="1">
                1 — Noodzakelijk: webapp is onbruikbaar
              </option>
              <option value="2">
                2 — Aanpassing dringend
              </option>
              <option value="3">
                3 — Aanpassing nodig
              </option>
            </select>
          </label>

          <label className="text-sm font-bold text-slate-700 lg:col-span-2">
            Uitleg bug
            <textarea
              name="uitleg"
              required
              minLength={5}
              maxLength={10_000}
              rows={5}
              placeholder="Beschrijf wat er fout gaat en welke stappen het probleem veroorzaken."
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
            >
              Bugrapport toevoegen
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-7">
          <h2 className="text-xl font-black text-slate-950">
            Bugrapporten
          </h2>

<form
          method="get"
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6"
        >
          <input
            type="search"
            name="zoek"
            defaultValue={zoek}
            placeholder="Zoeken..."
            className="rounded-xl border border-slate-300 px-3 py-2.5"
          />

          <select
            name="status"
            defaultValue={
              parameters.status ?? ""
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="">
              Alle statussen
            </option>
            <option value="OPEN">
              Open
            </option>
            <option value="IN_BEHANDELING">
              In behandeling
            </option>
            <option value="BEHANDELD">
              Behandeld
            </option>
            <option value="AFGEWEZEN">
              Afgewezen
            </option>
          </select>

          <select
            name="prioriteit"
            defaultValue={
              parameters.prioriteit ?? ""
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="">
              Alle prioriteiten
            </option>
            <option value="1">
              Prioriteit 1
            </option>
            <option value="2">
              Prioriteit 2
            </option>
            <option value="3">
              Prioriteit 3
            </option>
          </select>

          <select
            name="sorteer"
            defaultValue={sorteer}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="datum">
              Sorteren op datum
            </option>
            <option value="prioriteit">
              Sorteren op prioriteit
            </option>
            <option value="webpagina">
              Sorteren op webpagina
            </option>
            <option value="status">
              Sorteren op status
            </option>
            <option value="gebruiker">
              Sorteren op gebruiker
            </option>
          </select>

          <select
            name="richting"
            defaultValue={richting}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="desc">
              Aflopend
            </option>
            <option value="asc">
              Oplopend
            </option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white"
            >
              Toepassen
            </button>

            <Link
              href="/bug-rapporteren"
              className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
            >
              Wissen
            </Link>
          </div>
        </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">
                  Datum
                </th>
                <th className="px-4 py-3">
                  Prioriteit
                </th>
                <th className="px-4 py-3">
                  Webpagina
                </th>
                <th className="px-4 py-3">
                  Uitleg bug
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Feedback
                </th>
                <th className="px-4 py-3">
                  Gebruiker
                </th>
                <th className="px-4 py-3">
                  Acties
                </th>
              </tr>
            </thead>

            <tbody>
              {rapporten.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center font-semibold text-slate-500"
                  >
                    Er zijn nog geen bugs gerapporteerd.
                  </td>
                </tr>
              ) : (
                rapporten.map(
                  (rapport) => (
                    <tr
                      key={rapport.id}
                      className={`border-t border-slate-200 align-top ${rijStijl(
                        rapport.status,
                      )}`}
                    >
                      <td className="whitespace-nowrap px-4 py-4">
                        {datumFormatter.format(
                          rapport.aangemaaktOp,
                        )}
                      </td>

                      <td className="max-w-64 px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-3 py-2 text-sm font-black shadow-sm ${prioriteitTekstStijl(
                            rapport.prioriteit,
                          )}`}
                        >
                          {prioriteitLabel(
                            rapport.prioriteit,
                          )}
                        </span>
                      </td>

                      <td className="max-w-80 px-4 py-4">
                        <a
                          href={
                            rapport.webpagina
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-semibold text-emerald-700 underline"
                        >
                          {rapport.webpagina}
                        </a>
                      </td>

                      <td className="min-w-80 whitespace-pre-wrap break-words px-4 py-4">
                        {rapport.uitleg}
                      </td>

                      <td className="min-w-52 px-4 py-4">
                        {isBeheerder ? (
                          <form
                            action={
                              wijzigBugStatus
                            }
                            className="flex gap-2"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={rapport.id}
                            />

                            <select
                              name="status"
                              defaultValue={
                                rapport.status
                              }
                              aria-label={`Status van bugrapport ${rapport.id}`}
                              className="min-w-36 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold"
                            >
                              <option value="OPEN">
                                Open
                              </option>
                              <option value="IN_BEHANDELING">
                                In behandeling
                              </option>
                              <option value="BEHANDELD">
                                Behandeld
                              </option>
                              <option value="AFGEWEZEN">
                                Afgewezen
                              </option>
                            </select>

                            <button
                              type="submit"
                              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                            >
                              Opslaan
                            </button>
                          </form>
                        ) : (
                          <span className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                            {statusLabel(
                              rapport.status,
                            )}
                          </span>
                        )}

                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          Huidig:{" "}
                          {statusLabel(
                            rapport.status,
                          )}
                        </p>
                      </td>

                      <td className="min-w-64 whitespace-pre-wrap break-words px-4 py-4">
                        {rapport.opmerkingen ||
                          "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-semibold">
                        {rapport.gebruikerNaam}
                      </td>

                      <td className="px-4 py-4">
                        <BugRapportActies
                          id={rapport.id}
                          isBeheerder={
                            isBeheerder
                          }
                        />
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

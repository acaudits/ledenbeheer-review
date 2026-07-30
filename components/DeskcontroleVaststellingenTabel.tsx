"use client";

import { useMemo, useState } from "react";

export type DeskcontroleVaststellingRij = {
  id: number;
  excelRij: number;
  parameter: string;
  ncId: string;
  omschrijving: string;
  vastgesteldDoorCi: string;
  verduidelijking: string;
  groteImpact: string;
  categorie: string;
  motivatieAanpassing: string;
};

type DeskcontroleVaststellingenTabelProps = {
  rijen: DeskcontroleVaststellingRij[];
};

type Sortering = {
  sleutel: keyof DeskcontroleVaststellingRij;
  richting: "oplopend" | "aflopend";
};

const kolommen: Array<{
  sleutel: keyof DeskcontroleVaststellingRij;
  label: string;
}> = [
  {
    sleutel: "excelRij",
    label: "Excelrij",
  },
  {
    sleutel: "parameter",
    label: "Parameter",
  },
  {
    sleutel: "ncId",
    label: "ID NC",
  },
  {
    sleutel: "omschrijving",
    label: "Omschrijving",
  },
  {
    sleutel: "vastgesteldDoorCi",
    label: "Vastgesteld door CI",
  },
  {
    sleutel: "verduidelijking",
    label: "Verduidelijking",
  },
  {
    sleutel: "groteImpact",
    label: "Grote impact",
  },
  {
    sleutel: "categorie",
    label: "Categorie",
  },
  {
    sleutel: "motivatieAanpassing",
    label: "Motivatie aanpassing",
  },
];

function uniekeWaarden(
  rijen: DeskcontroleVaststellingRij[],
  sleutel: keyof DeskcontroleVaststellingRij,
) {
  return Array.from(
    new Set(
      rijen
        .map((rij) =>
          String(rij[sleutel] ?? "").trim(),
        )
        .filter(Boolean),
    ),
  ).sort((a, b) =>
    a.localeCompare(b, "nl-BE", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function badgeStijl(waarde: string) {
  const tekst = waarde
    .trim()
    .toLocaleLowerCase("nl-BE");

  if (tekst === "ja") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tekst === "nee") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

export function DeskcontroleVaststellingenTabel({
  rijen,
}: DeskcontroleVaststellingenTabelProps) {
  const [zoekterm, setZoekterm] =
    useState("");

  const [
    filterVastgesteld,
    setFilterVastgesteld,
  ] = useState("");

  const [
    filterGroteImpact,
    setFilterGroteImpact,
  ] = useState("");

  const [
    filterCategorie,
    setFilterCategorie,
  ] = useState("");

  const [sortering, setSortering] =
    useState<Sortering>({
      sleutel: "excelRij",
      richting: "oplopend",
    });

  const vastgesteldOpties = useMemo(
    () =>
      uniekeWaarden(
        rijen,
        "vastgesteldDoorCi",
      ),
    [rijen],
  );

  const groteImpactOpties = useMemo(
    () =>
      uniekeWaarden(
        rijen,
        "groteImpact",
      ),
    [rijen],
  );

  const categorieOpties = useMemo(
    () =>
      uniekeWaarden(
        rijen,
        "categorie",
      ),
    [rijen],
  );

  const zichtbareRijen = useMemo(() => {
    const zoeken = zoekterm
      .trim()
      .toLocaleLowerCase("nl-BE");

    const resultaat = rijen.filter(
      (rij) => {
        if (
          filterVastgesteld &&
          rij.vastgesteldDoorCi !==
            filterVastgesteld
        ) {
          return false;
        }

        if (
          filterGroteImpact &&
          rij.groteImpact !==
            filterGroteImpact
        ) {
          return false;
        }

        if (
          filterCategorie &&
          rij.categorie !==
            filterCategorie
        ) {
          return false;
        }

        if (!zoeken) {
          return true;
        }

        return kolommen.some((kolom) =>
          String(
            rij[kolom.sleutel] ?? "",
          )
            .toLocaleLowerCase("nl-BE")
            .includes(zoeken),
        );
      },
    );

    return [...resultaat].sort(
      (eerste, tweede) => {
        const eersteWaarde =
          eerste[sortering.sleutel];

        const tweedeWaarde =
          tweede[sortering.sleutel];

        const vergelijking =
          typeof eersteWaarde ===
            "number" &&
          typeof tweedeWaarde ===
            "number"
            ? eersteWaarde -
              tweedeWaarde
            : String(
                eersteWaarde ?? "",
              ).localeCompare(
                String(
                  tweedeWaarde ?? "",
                ),
                "nl-BE",
                {
                  numeric: true,
                  sensitivity: "base",
                },
              );

        return sortering.richting ===
          "oplopend"
          ? vergelijking
          : -vergelijking;
      },
    );
  }, [
    rijen,
    zoekterm,
    filterVastgesteld,
    filterGroteImpact,
    filterCategorie,
    sortering,
  ]);

  const heeftFilters =
    zoekterm.trim() ||
    filterVastgesteld ||
    filterGroteImpact ||
    filterCategorie;

  function wijzigSortering(
    sleutel: keyof DeskcontroleVaststellingRij,
  ) {
    setSortering((huidige) => {
      if (huidige.sleutel !== sleutel) {
        return {
          sleutel,
          richting: "oplopend",
        };
      }

      return {
        sleutel,
        richting:
          huidige.richting ===
          "oplopend"
            ? "aflopend"
            : "oplopend",
      };
    });
  }

  function wisFilters() {
    setZoekterm("");
    setFilterVastgesteld("");
    setFilterGroteImpact("");
    setFilterCategorie("");
    setSortering({
      sleutel: "excelRij",
      richting: "oplopend",
    });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
              Excelgegevens
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Vaststellingen
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {zichtbareRijen.length} van{" "}
              {rijen.length} vaststellingen
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              value={zoekterm}
              onChange={(event) =>
                setZoekterm(
                  event.target.value,
                )
              }
              placeholder="Zoeken..."
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={filterVastgesteld}
              onChange={(event) =>
                setFilterVastgesteld(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">
                Alle CI-vaststellingen
              </option>

              {vastgesteldOpties.map(
                (optie) => (
                  <option
                    key={optie}
                    value={optie}
                  >
                    CI: {optie}
                  </option>
                ),
              )}
            </select>

            <select
              value={filterGroteImpact}
              onChange={(event) =>
                setFilterGroteImpact(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">
                Alle impactwaarden
              </option>

              {groteImpactOpties.map(
                (optie) => (
                  <option
                    key={optie}
                    value={optie}
                  >
                    Impact: {optie}
                  </option>
                ),
              )}
            </select>

            <select
              value={filterCategorie}
              onChange={(event) =>
                setFilterCategorie(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
            >
              <option value="">
                Alle categorieën
              </option>

              {categorieOpties.map(
                (optie) => (
                  <option
                    key={optie}
                    value={optie}
                  >
                    Categorie {optie}
                  </option>
                ),
              )}
            </select>

            {heeftFilters ? (
              <button
                type="button"
                onClick={wisFilters}
                className="h-10 rounded-xl border border-red-200 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                Filters wissen
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </header>

      {zichtbareRijen.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <h3 className="font-bold text-slate-950">
            Geen vaststellingen gevonden
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Pas de zoekterm of filters aan.
          </p>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1900px] text-left">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
              <tr>
                {kolommen.map((kolom) => {
                  const actief =
                    sortering.sleutel ===
                    kolom.sleutel;

                  return (
                    <th
                      key={kolom.sleutel}
                      className="border-b border-slate-200 px-3 py-3 align-top text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          wijzigSortering(
                            kolom.sleutel,
                          )
                        }
                        className={`inline-flex items-center gap-1 rounded-md px-1 py-1 hover:bg-white hover:text-slate-950 ${
                          actief
                            ? "text-emerald-800"
                            : ""
                        }`}
                      >
                        {kolom.label}

                        {actief ? (
                          <span>
                            {sortering.richting ===
                            "oplopend"
                              ? "↑"
                              : "↓"}
                          </span>
                        ) : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {zichtbareRijen.map(
                (rij) => (
                  <tr
                    key={rij.id}
                    className="align-top hover:bg-emerald-50/40"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-slate-500">
                      {rij.excelRij}
                    </td>

                    <td className="min-w-48 px-3 py-3 text-xs font-semibold text-slate-800">
                      {rij.parameter || "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-800">
                        {rij.ncId}
                      </span>
                    </td>

                    <td className="min-w-80 max-w-md whitespace-pre-wrap px-3 py-3 text-xs leading-5 text-slate-700">
                      {rij.omschrijving ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeStijl(
                          rij.vastgesteldDoorCi,
                        )}`}
                      >
                        {rij.vastgesteldDoorCi ||
                          "—"}
                      </span>
                    </td>

                    <td className="min-w-[28rem] max-w-2xl whitespace-pre-wrap px-3 py-3 text-xs leading-5 text-slate-700">
                      {rij.verduidelijking ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeStijl(
                          rij.groteImpact,
                        )}`}
                      >
                        {rij.groteImpact ||
                          "—"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      {rij.categorie ? (
                        <span className="inline-flex min-w-8 justify-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
                          {rij.categorie}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="min-w-80 max-w-lg whitespace-pre-wrap px-3 py-3 text-xs leading-5 text-slate-700">
                      {rij.motivatieAanpassing ||
                        "—"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


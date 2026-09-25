"use client";

import { useMemo, useState } from "react";

import type {
  DeskcontroleTargetRij,
  TerreincontroleTargetRij,
} from "@/lib/totaal-overzicht";

type DashboardControlelijstProps =
  | {
      soort: "terrein";
      rijen: readonly TerreincontroleTargetRij[];
    }
  | {
      soort: "desk";
      rijen: readonly DeskcontroleTargetRij[];
    };

type Sorteersleutel =
  | "naamPersoonscertificaat"
  | "ovamId"
  | "aantalAttesten"
  | "aantalDeskcontroles"
  | "aantalIngeplandeTerreincontroles"
  | "aantalNaFinalisaties"
  | "aantalNogNodig";

type Sorteerrichting = "oplopend" | "aflopend";

type TabelRij = {
  naamPersoonscertificaat: string;
  ovamId: string;
  aantalAttesten: number;
  aantalDeskcontroles: number | null;
  aantalIngeplandeTerreincontroles: number | null;
  aantalNaFinalisaties: number | null;
  aantalNogNodig: number;
};

type Kolom = {
  sleutel: Sorteersleutel;
  label: string;
  numeriek: boolean;
  breedte: string;
};

const getalFormatter = new Intl.NumberFormat("nl-BE");

function normaliseerZoekwaarde(waarde: string) {
  return waarde
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("nl-BE")
    .trim();
}

function formatteerWaarde(waarde: string | number | null) {
  if (waarde === null) {
    return "—";
  }

  return typeof waarde === "number" ? getalFormatter.format(waarde) : waarde;
}

function leesWaarde(rij: TabelRij, sleutel: Sorteersleutel) {
  return rij[sleutel];
}

function vergelijkWaarden(
  eerste: string | number | null,
  tweede: string | number | null,
) {
  if (eerste === tweede) {
    return 0;
  }

  if (eerste === null) {
    return 1;
  }

  if (tweede === null) {
    return -1;
  }

  if (typeof eerste === "number" && typeof tweede === "number") {
    return eerste - tweede;
  }

  return String(eerste).localeCompare(String(tweede), "nl-BE", {
    numeric: true,
    sensitivity: "base",
  });
}

export function DashboardControlelijst(props: DashboardControlelijstProps) {
  const [zoekterm, setZoekterm] = useState("");

  const [kolomFilters, setKolomFilters] = useState<
    Partial<Record<Sorteersleutel, string>>
  >({});

  const [sorteersleutel, setSorteersleutel] =
    useState<Sorteersleutel>("aantalNogNodig");

  const [sorteerrichting, setSorteerrichting] =
    useState<Sorteerrichting>("aflopend");

  const isTerrein = props.soort === "terrein";

  const titel = isTerrein ? "Alle terreincontroles" : "Alle deskcontroles";

  const titelId = isTerrein
    ? "terreincontrolelijst-titel"
    : "deskcontrolelijst-titel";

  const kolommen = useMemo<Kolom[]>(
    () =>
      isTerrein
        ? [
            {
              sleutel: "naamPersoonscertificaat",
              label: "Naam",
              numeriek: false,
              breedte: "min-w-56",
            },
            {
              sleutel: "ovamId",
              label: "OVAM-ID",
              numeriek: false,
              breedte: "min-w-36",
            },
            {
              sleutel: "aantalAttesten",
              label: "Attesten",
              numeriek: true,
              breedte: "min-w-28",
            },
            {
              sleutel: "aantalIngeplandeTerreincontroles",
              label: "Ingepland",
              numeriek: true,
              breedte: "min-w-28",
            },
            {
              sleutel: "aantalNaFinalisaties",
              label: "Na-finalisaties",
              numeriek: true,
              breedte: "min-w-32",
            },
            {
              sleutel: "aantalNogNodig",
              label: "Nog nodig",
              numeriek: true,
              breedte: "min-w-28",
            },
          ]
        : [
            {
              sleutel: "naamPersoonscertificaat",
              label: "Naam",
              numeriek: false,
              breedte: "min-w-56",
            },
            {
              sleutel: "ovamId",
              label: "OVAM-ID",
              numeriek: false,
              breedte: "min-w-36",
            },
            {
              sleutel: "aantalAttesten",
              label: "Attesten",
              numeriek: true,
              breedte: "min-w-28",
            },
            {
              sleutel: "aantalDeskcontroles",
              label: "Deskcontroles",
              numeriek: true,
              breedte: "min-w-32",
            },
            {
              sleutel: "aantalNogNodig",
              label: "Nog nodig",
              numeriek: true,
              breedte: "min-w-28",
            },
          ],
    [isTerrein],
  );

  const basisRijen = useMemo<TabelRij[]>(() => {
    if (props.soort === "terrein") {
      return props.rijen.map((rij) => ({
        naamPersoonscertificaat: rij.naamPersoonscertificaat,
        ovamId: rij.ovamId,
        aantalAttesten: rij.aantalAttesten,
        aantalDeskcontroles: null,
        aantalIngeplandeTerreincontroles: rij.aantalIngeplandeTerreincontroles,
        aantalNaFinalisaties: rij.aantalNaFinalisaties,
        aantalNogNodig: rij.aantalNogNodig,
      }));
    }

    return props.rijen.map((rij) => ({
      naamPersoonscertificaat: rij.naamPersoonscertificaat,
      ovamId: rij.ovamId,
      aantalAttesten: rij.aantalAttesten,
      aantalDeskcontroles: rij.aantalDeskcontroles,
      aantalIngeplandeTerreincontroles: null,
      aantalNaFinalisaties: null,
      aantalNogNodig: rij.aantalNogNodig,
    }));
  }, [props]);

  const zichtbareRijen = useMemo(() => {
    const algemeneZoekterm = normaliseerZoekwaarde(zoekterm);

    return basisRijen
      .filter((rij) => {
        if (algemeneZoekterm) {
          const alleWaarden = kolommen
            .map((kolom) => formatteerWaarde(leesWaarde(rij, kolom.sleutel)))
            .join(" ");

          if (!normaliseerZoekwaarde(alleWaarden).includes(algemeneZoekterm)) {
            return false;
          }
        }

        return kolommen.every((kolom) => {
          const filter = normaliseerZoekwaarde(
            kolomFilters[kolom.sleutel] ?? "",
          );

          if (!filter) {
            return true;
          }

          return normaliseerZoekwaarde(
            formatteerWaarde(leesWaarde(rij, kolom.sleutel)),
          ).includes(filter);
        });
      })
      .sort((eerste, tweede) => {
        const resultaat = vergelijkWaarden(
          leesWaarde(eerste, sorteersleutel),
          leesWaarde(tweede, sorteersleutel),
        );

        if (resultaat !== 0) {
          return sorteerrichting === "oplopend" ? resultaat : -resultaat;
        }

        return eerste.naamPersoonscertificaat.localeCompare(
          tweede.naamPersoonscertificaat,
          "nl-BE",
          {
            sensitivity: "base",
          },
        );
      });
  }, [
    basisRijen,
    kolomFilters,
    kolommen,
    sorteerrichting,
    sorteersleutel,
    zoekterm,
  ]);

  function wijzigSortering(sleutel: Sorteersleutel) {
    if (sorteersleutel === sleutel) {
      setSorteerrichting((huidige) =>
        huidige === "oplopend" ? "aflopend" : "oplopend",
      );

      return;
    }

    setSorteersleutel(sleutel);

    setSorteerrichting(
      sleutel === "naamPersoonscertificaat" || sleutel === "ovamId"
        ? "oplopend"
        : "aflopend",
    );
  }

  const heeftFilters =
    Boolean(zoekterm.trim()) ||
    Object.values(kolomFilters).some((waarde) => Boolean(waarde?.trim()));

  return (
    <section
      aria-labelledby={titelId}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-3 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id={titelId} className="text-sm font-bold text-slate-950">
              {titel}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Volledige lijst met resterende tekorten. Ongeveer 10 rijen zijn
              tegelijk zichtbaar.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="min-w-0 flex-1 lg:w-72">
              <span className="sr-only">Zoek in {titel.toLowerCase()}</span>

              <input
                type="search"
                value={zoekterm}
                onChange={(event) => setZoekterm(event.target.value)}
                placeholder="Zoeken in alle kolommen…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            {heeftFilters ? (
              <button
                type="button"
                onClick={() => {
                  setZoekterm("");
                  setKolomFilters({});
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-800"
              >
                Filters wissen
              </button>
            ) : null}
          </div>
        </div>

        <p
          className="mt-2 text-xs font-medium text-slate-600"
          aria-live="polite"
        >
          {getalFormatter.format(zichtbareRijen.length)} van{" "}
          {getalFormatter.format(basisRijen.length)} resultaten
        </p>
      </div>

      {basisRijen.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          Alle persoonscertificaten hebben het target voor {props.soort}
          controles bereikt.
        </div>
      ) : (
        <div className="max-h-[41.5rem] overflow-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr>
                {kolommen.map((kolom) => (
                  <th
                    key={kolom.sleutel}
                    scope="col"
                    className={`${kolom.breedte} border-b border-slate-200 px-3 py-2 align-top`}
                  >
                    <button
                      type="button"
                      onClick={() => wijzigSortering(kolom.sleutel)}
                      className={`flex w-full items-center gap-1 font-bold text-slate-800 hover:text-emerald-800 ${
                        kolom.numeriek
                          ? "justify-end text-right"
                          : "justify-start text-left"
                      }`}
                    >
                      <span>{kolom.label}</span>

                      <span
                        aria-hidden="true"
                        className={
                          sorteersleutel === kolom.sleutel
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }
                      >
                        {sorteersleutel === kolom.sleutel
                          ? sorteerrichting === "oplopend"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>

                      <span className="sr-only">Sorteer op {kolom.label}</span>
                    </button>
                  </th>
                ))}
              </tr>

              <tr>
                {kolommen.map((kolom) => (
                  <th
                    key={kolom.sleutel}
                    className="border-b border-slate-300 bg-slate-50 px-2 py-2"
                  >
                    <label>
                      <span className="sr-only">
                        Filter kolom {kolom.label}
                      </span>

                      <input
                        type="search"
                        inputMode={kolom.numeriek ? "numeric" : "search"}
                        value={kolomFilters[kolom.sleutel] ?? ""}
                        onChange={(event) =>
                          setKolomFilters((huidige) => ({
                            ...huidige,
                            [kolom.sleutel]: event.target.value,
                          }))
                        }
                        placeholder="Filter…"
                        className={`w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${
                          kolom.numeriek ? "text-right" : "text-left"
                        }`}
                      />
                    </label>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {zichtbareRijen.map((rij) => (
                <tr
                  key={rij.ovamId}
                  className="h-14 transition even:bg-slate-50/70 hover:bg-emerald-50"
                >
                  {kolommen.map((kolom) => {
                    const waarde = leesWaarde(rij, kolom.sleutel);

                    return (
                      <td
                        key={kolom.sleutel}
                        className={`border-b border-slate-100 px-3 py-2 ${
                          kolom.numeriek
                            ? "text-right font-bold tabular-nums text-slate-900"
                            : "text-left text-slate-800"
                        } ${
                          kolom.sleutel === "aantalNogNodig"
                            ? "font-black text-red-700"
                            : ""
                        }`}
                      >
                        <span
                          className={
                            kolom.sleutel === "naamPersoonscertificaat"
                              ? "block max-w-72 truncate font-bold text-slate-950"
                              : kolom.sleutel === "ovamId"
                                ? "block max-w-48 truncate font-medium text-slate-600"
                                : ""
                          }
                          title={formatteerWaarde(waarde)}
                        >
                          {formatteerWaarde(waarde)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {zichtbareRijen.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Geen resultaten gevonden voor de ingestelde zoekopdracht en
              filters.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

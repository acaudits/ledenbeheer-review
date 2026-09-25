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
            },
            {
              sleutel: "ovamId",
              label: "OVAM-ID",
              numeriek: false,
            },
            {
              sleutel: "aantalAttesten",
              label: "Attesten",
              numeriek: true,
            },
            {
              sleutel: "aantalIngeplandeTerreincontroles",
              label: "Ingepland",
              numeriek: true,
            },
            {
              sleutel: "aantalNaFinalisaties",
              label: "Na-finalisaties",
              numeriek: true,
            },
            {
              sleutel: "aantalNogNodig",
              label: "Nog nodig",
              numeriek: true,
            },
          ]
        : [
            {
              sleutel: "naamPersoonscertificaat",
              label: "Naam",
              numeriek: false,
            },
            {
              sleutel: "ovamId",
              label: "OVAM-ID",
              numeriek: false,
            },
            {
              sleutel: "aantalAttesten",
              label: "Attesten",
              numeriek: true,
            },
            {
              sleutel: "aantalDeskcontroles",
              label: "Deskcontroles",
              numeriek: true,
            },
            {
              sleutel: "aantalNogNodig",
              label: "Nog nodig",
              numeriek: true,
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
            .map((kolom) => {
              const waarde = leesWaarde(rij, kolom.sleutel);

              return [
                formatteerWaarde(waarde),
                waarde === null ? "" : String(waarde),
              ].join(" ");
            })
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

          const waarde = leesWaarde(rij, kolom.sleutel);

          const zoekbareWaarde = [
            formatteerWaarde(waarde),
            waarde === null ? "" : String(waarde),
          ].join(" ");

          return normaliseerZoekwaarde(zoekbareWaarde).includes(filter);
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

  const heeftFilters =
    Boolean(zoekterm.trim()) ||
    Object.values(kolomFilters).some((waarde) => Boolean(waarde?.trim()));

  const kaartRaster = isTerrein
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-[minmax(180px,1.7fr)_minmax(100px,1fr)_repeat(4,minmax(84px,0.7fr))]"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-[minmax(180px,1.7fr)_minmax(100px,1fr)_repeat(3,minmax(84px,0.7fr))]";

  function wisFilters() {
    setZoekterm("");
    setKolomFilters({});
  }

  return (
    <section
      aria-labelledby={titelId}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 id={titelId} className="text-sm font-bold text-slate-950">
              {titel}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Volledige lijst met resterende tekorten. Scroll verticaal voor
              meer resultaten.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)_auto] xl:w-auto xl:min-w-[620px]">
            <label className="min-w-0">
              <span className="sr-only">Zoek in {titel.toLowerCase()}</span>

              <input
                type="search"
                value={zoekterm}
                onChange={(event) => setZoekterm(event.target.value)}
                placeholder="Zoeken in alle velden…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="min-w-0">
              <span className="sr-only">Sorteren op</span>

              <select
                value={sorteersleutel}
                onChange={(event) =>
                  setSorteersleutel(event.target.value as Sorteersleutel)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {kolommen.map((kolom) => (
                  <option key={kolom.sleutel} value={kolom.sleutel}>
                    Sorteer: {kolom.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() =>
                setSorteerrichting((huidige) =>
                  huidige === "oplopend" ? "aflopend" : "oplopend",
                )
              }
              aria-label={
                sorteerrichting === "oplopend"
                  ? "Wijzig naar aflopende sortering"
                  : "Wijzig naar oplopende sortering"
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-800"
            >
              {sorteerrichting === "oplopend" ? "Oplopend ▲" : "Aflopend ▼"}
            </button>
          </div>
        </div>

        <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-800">
            Filters per kolom
          </summary>

          <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {kolommen.map((kolom) => (
              <label key={kolom.sleutel} className="min-w-0">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {kolom.label}
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
                  placeholder={`Filter ${kolom.label.toLowerCase()}…`}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            ))}
          </div>
        </details>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-600" aria-live="polite">
            {getalFormatter.format(zichtbareRijen.length)} van{" "}
            {getalFormatter.format(basisRijen.length)} resultaten
          </p>

          {heeftFilters ? (
            <button
              type="button"
              onClick={wisFilters}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-800"
            >
              Filters wissen
            </button>
          ) : null}
        </div>
      </div>

      {basisRijen.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          Alle persoonscertificaten hebben het target voor {props.soort}
          controles bereikt.
        </div>
      ) : zichtbareRijen.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Geen resultaten gevonden voor de ingestelde zoekopdracht en filters.
        </div>
      ) : (
        <ol className="max-h-[45rem] space-y-1.5 overflow-y-auto overflow-x-hidden p-2">
          {zichtbareRijen.map((rij) => (
            <li
              key={rij.ovamId}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <dl className={`grid min-w-0 gap-x-3 gap-y-2 ${kaartRaster}`}>
                {kolommen.map((kolom) => {
                  const waarde = leesWaarde(rij, kolom.sleutel);

                  const isNaam = kolom.sleutel === "naamPersoonscertificaat";

                  const isOvam = kolom.sleutel === "ovamId";

                  const isTekort = kolom.sleutel === "aantalNogNodig";

                  return (
                    <div
                      key={kolom.sleutel}
                      className={`min-w-0 ${
                        isNaam ? "col-span-2 sm:col-span-2 lg:col-span-1" : ""
                      }`}
                    >
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {kolom.label}
                      </dt>

                      <dd
                        className={`mt-0.5 ${
                          isNaam
                            ? "break-words text-sm font-bold text-slate-950"
                            : isOvam
                              ? "break-all text-xs font-semibold text-slate-700"
                              : isTekort
                                ? "text-sm font-black tabular-nums text-red-700"
                                : "text-sm font-bold tabular-nums text-slate-900"
                        }`}
                      >
                        {formatteerWaarde(waarde)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

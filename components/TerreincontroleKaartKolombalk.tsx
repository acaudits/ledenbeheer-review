"use client";

import { TerreincontroleDatumFilterBoom } from "@/components/TerreincontroleDatumFilterBoom";

import { useEffect, useRef, useState } from "react";

import type { TerreincontroleCardSortering } from "@/hooks/useTerreincontrolesQuery";

type Kolom = {
  sleutel: string;
  label: string;
  type?: string;
};

type Props = {
  kolommen: Kolom[];
  filters: Record<string, string>;
  sorteringen: TerreincontroleCardSortering[];
  onFilterWijzigen: (sleutel: string, waarde: string) => void;
  onSorteren: (sleutel: string, richting: "oplopend" | "aflopend") => void;
  onSorteringVerwijderen: (sleutel: string) => void;
  onSorteringVerplaatsen: (sleutel: string, verschil: -1 | 1) => void;
};

const EXCEL_FILTER_PREFIX = "__excel__";

type ExcelWaardeFilter = {
  modus: "insluiten" | "uitsluiten";
  waarden: string[];
  legeCellenGeselecteerd: boolean;
};

type BeschikbareWaarde = {
  waarde: string;
  aantal: number;
};

const ALLES_GESELECTEERD: ExcelWaardeFilter = {
  modus: "uitsluiten",
  waarden: [],
  legeCellenGeselecteerd: true,
};

function leesExcelFilter(filter: string): ExcelWaardeFilter {
  if (!filter.startsWith(EXCEL_FILTER_PREFIX)) {
    return ALLES_GESELECTEERD;
  }

  try {
    const inhoud = JSON.parse(
      decodeURIComponent(filter.slice(EXCEL_FILTER_PREFIX.length)),
    ) as ExcelWaardeFilter;

    if (
      (inhoud.modus !== "insluiten" && inhoud.modus !== "uitsluiten") ||
      !Array.isArray(inhoud.waarden) ||
      typeof inhoud.legeCellenGeselecteerd !== "boolean"
    ) {
      return ALLES_GESELECTEERD;
    }

    return {
      modus: inhoud.modus,
      waarden: Array.from(new Set(inhoud.waarden)),
      legeCellenGeselecteerd: inhoud.legeCellenGeselecteerd,
    };
  } catch {
    return ALLES_GESELECTEERD;
  }
}

function codeerExcelFilter(filter: ExcelWaardeFilter) {
  if (
    filter.modus === "uitsluiten" &&
    filter.waarden.length === 0 &&
    filter.legeCellenGeselecteerd
  ) {
    return "";
  }

  return EXCEL_FILTER_PREFIX + encodeURIComponent(JSON.stringify(filter));
}

type KolomMenuProps = {
  kolom: Kolom;
  filter: string;
  sortering: TerreincontroleCardSortering | undefined;
  prioriteit: number | null;
  aantalSorteringen: number;
  onFilterWijzigen: (waarde: string) => void;
  onSorteren: (richting: "oplopend" | "aflopend") => void;
  onSorteringVerwijderen: () => void;
  onSorteringVerplaatsen: (verschil: -1 | 1) => void;
};

function KolomMenu({
  kolom,
  filter,
  sortering,
  prioriteit,
  aantalSorteringen,
  onFilterWijzigen,
  onSorteren,
  onSorteringVerwijderen,
  onSorteringVerplaatsen,
}: KolomMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  const [menuGeopend, setMenuGeopend] = useState(false);
  const [zoekwaarde, setZoekwaarde] = useState("");
  const [waarden, setWaarden] = useState<BeschikbareWaarde[]>([]);
  const [waardenLaden, setWaardenLaden] = useState(false);
  const [waardenFout, setWaardenFout] = useState<string | null>(null);
  const [conceptFilter, setConceptFilter] = useState<ExcelWaardeFilter>(() =>
    leesExcelFilter(filter),
  );

  useEffect(() => {
    if (!menuGeopend) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setWaardenLaden(true);
      setWaardenFout(null);

      try {
        const parameters = new URLSearchParams({
          filterwaardenKolom: kolom.sleutel,
        });

        if (zoekwaarde.trim() && kolom.sleutel !== "datumControle") {
          parameters.set("filterwaardenZoekterm", zoekwaarde.trim());
        }

        const antwoord = await fetch(
          `/api/terreincontroles/lijst?${parameters.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!antwoord.ok) {
          throw new Error("Filterwaarden laden mislukt.");
        }

        const inhoud = (await antwoord.json()) as {
          waarden?: unknown;
        };

        if (!Array.isArray(inhoud.waarden)) {
          throw new Error("Ongeldig antwoord voor filterwaarden.");
        }

        const geldigeWaarden = inhoud.waarden.filter(
          (item): item is BeschikbareWaarde =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as BeschikbareWaarde).waarde === "string" &&
            typeof (item as BeschikbareWaarde).aantal === "number",
        );

        setWaarden(geldigeWaarden);
      } catch (fout) {
        if (!controller.signal.aborted) {
          setWaardenFout(
            fout instanceof Error
              ? fout.message
              : "Filterwaarden laden mislukt.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setWaardenLaden(false);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filter, kolom.sleutel, menuGeopend, zoekwaarde]);

  const allesGeselecteerd =
    conceptFilter.modus === "uitsluiten" &&
    conceptFilter.waarden.length === 0 &&
    conceptFilter.legeCellenGeselecteerd;

  function isWaardeGeselecteerd(waarde: string) {
    if (waarde === "") {
      return conceptFilter.legeCellenGeselecteerd;
    }

    const aanwezig = conceptFilter.waarden.includes(waarde);

    return conceptFilter.modus === "insluiten" ? aanwezig : !aanwezig;
  }

  function wisselWaarde(waarde: string) {
    setConceptFilter((huidig) => {
      if (waarde === "") {
        return {
          ...huidig,
          legeCellenGeselecteerd: !huidig.legeCellenGeselecteerd,
        };
      }

      const aanwezig = huidig.waarden.includes(waarde);

      return {
        ...huidig,
        waarden: aanwezig
          ? huidig.waarden.filter((item) => item !== waarde)
          : [...huidig.waarden, waarde],
      };
    });
  }

  function selecteerMeerdereWaarden(
    doelWaarden: string[],
    geselecteerd: boolean,
  ) {
    setConceptFilter((huidig) => {
      const volgendeWaarden = new Set(huidig.waarden);

      for (const waarde of doelWaarden) {
        if (huidig.modus === "insluiten") {
          if (geselecteerd) {
            volgendeWaarden.add(waarde);
          } else {
            volgendeWaarden.delete(waarde);
          }
        } else if (geselecteerd) {
          volgendeWaarden.delete(waarde);
        } else {
          volgendeWaarden.add(waarde);
        }
      }

      return {
        ...huidig,
        waarden: Array.from(volgendeWaarden),
      };
    });
  }

  function sluitMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  const actief = Boolean(filter || sortering);

  return (
    <details
      ref={menuRef}
      className="group relative z-0 min-w-0 open:z-[100]"
      data-terreincontrole-kolommenu="true"
      onToggle={(event) => {
        const geopendMenu = event.currentTarget;

        setMenuGeopend(geopendMenu.open);

        if (!geopendMenu.open) {
          return;
        }

        setConceptFilter(leesExcelFilter(filter));
        setZoekwaarde("");

        document
          .querySelectorAll<HTMLDetailsElement>(
            'details[data-terreincontrole-kolommenu="true"][open]',
          )
          .forEach((menu) => {
            if (menu !== geopendMenu) {
              menu.open = false;
            }
          });
      }}
    >
      <summary
        className={`flex min-h-8 w-full cursor-pointer list-none items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold leading-tight transition ${
          actief
            ? "border-emerald-400 bg-emerald-50 text-emerald-900"
            : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
        }`}
      >
        <span>{kolom.label}</span>

        {sortering ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
            {sortering.richting === "oplopend" ? "↑" : "↓"}
            {prioriteit}
          </span>
        ) : null}

        {filter ? (
          <span
            className="size-1.5 rounded-full bg-amber-500"
            aria-label="Filter actief"
          />
        ) : null}

        <span
          aria-hidden="true"
          className="text-[10px] text-slate-400 transition group-open:rotate-180"
        >
          ▼
        </span>
      </summary>

      <div className="absolute left-0 right-0 top-full z-[120] mt-1 max-h-[min(28rem,calc(100vh-1rem))] min-w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl ring-1 ring-slate-900/5">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          {kolom.label}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onSorteren("oplopend");
              sluitMenu();
            }}
            className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition ${
              sortering?.richting === "oplopend"
                ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            ↑ Oplopend
          </button>

          <button
            type="button"
            onClick={() => {
              onSorteren("aflopend");
              sluitMenu();
            }}
            className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition ${
              sortering?.richting === "aflopend"
                ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            ↓ Aflopend
          </button>
        </div>

        {sortering ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-bold text-slate-600">
              Sorteerprioriteit {prioriteit}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={prioriteit === 1}
                onClick={() => onSorteringVerplaatsen(-1)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Eerder
              </button>

              <button
                type="button"
                disabled={prioriteit === aantalSorteringen}
                onClick={() => onSorteringVerplaatsen(1)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Later →
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-2 border-t border-slate-200 pt-2">
          <label className="block">
            <span className="sr-only">
              Zoek in de waarden van {kolom.label}
            </span>
            <input
              value={zoekwaarde}
              onChange={(event) => setZoekwaarde(event.target.value)}
              placeholder="Zoeken"
              className="h-8 w-full rounded-lg border border-slate-300 px-2.5 text-[11px] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={allesGeselecteerd}
                onChange={() =>
                  setConceptFilter(
                    allesGeselecteerd
                      ? {
                          modus: "insluiten",
                          waarden: [],
                          legeCellenGeselecteerd: false,
                        }
                      : ALLES_GESELECTEERD,
                  )
                }
                className="size-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              Alles selecteren
            </label>

            {waardenLaden ? (
              <p className="px-2 py-3 text-center text-[11px] font-semibold text-slate-500">
                Waarden laden...
              </p>
            ) : waardenFout ? (
              <p className="px-2 py-3 text-center text-[11px] font-semibold text-red-700">
                {waardenFout}
              </p>
            ) : waarden.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-slate-500">
                Geen waarden gevonden.
              </p>
            ) : kolom.sleutel === "datumControle" ? (
              <TerreincontroleDatumFilterBoom
                key={waarden.map((item) => item.waarde).join("|")}
                waarden={waarden}
                zoekwaarde={zoekwaarde}
                isGeselecteerd={isWaardeGeselecteerd}
                onWisselen={wisselWaarde}
                onMeerdereSelecteren={selecteerMeerdereWaarden}
              />
            ) : (
              waarden.map((item) => (
                <label
                  key={item.waarde || "__lege_cellen__"}
                  className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-1.5 text-[11px] text-slate-700 last:border-b-0 hover:bg-emerald-50"
                >
                  <input
                    type="checkbox"
                    checked={isWaardeGeselecteerd(item.waarde)}
                    onChange={() => wisselWaarde(item.waarde)}
                    className="size-3.5 shrink-0 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {item.waarde || "(Lege cellen)"}
                  </span>
                  <span className="shrink-0 text-[9px] font-semibold text-slate-400">
                    {item.aantal}
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onFilterWijzigen(codeerExcelFilter(conceptFilter));
                sluitMenu();
              }}
              className="rounded-lg bg-emerald-700 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800"
            >
              Toepassen
            </button>

            <button
              type="button"
              onClick={() => {
                setConceptFilter(leesExcelFilter(filter));
                sluitMenu();
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
            >
              Annuleren
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
          {filter ? (
            <button
              type="button"
              onClick={() => onFilterWijzigen("")}
              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
            >
              Filter wissen
            </button>
          ) : null}

          {sortering ? (
            <button
              type="button"
              onClick={() => {
                onSorteringVerwijderen();
                sluitMenu();
              }}
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100"
            >
              Sortering wissen
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export function TerreincontroleKaartKolombalk({
  kolommen,
  filters,
  sorteringen,
  onFilterWijzigen,
  onSorteren,
  onSorteringVerwijderen,
  onSorteringVerplaatsen,
}: Props) {
  const sorteerbareKolommen = kolommen.filter(
    (kolom) => kolom.type !== "acties" && kolom.type !== "maps",
  );

  return (
    <div className="relative z-[70] overflow-visible">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">
          Filteren en sorteren
        </p>

        {sorteringen.length > 1 ? (
          <p className="text-[11px] font-semibold text-slate-500">
            De cijfers tonen de sorteervolgorde
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
        {sorteerbareKolommen.map((kolom) => {
          const index = sorteringen.findIndex(
            (sortering) => sortering.sleutel === kolom.sleutel,
          );

          return (
            <KolomMenu
              key={kolom.sleutel}
              kolom={kolom}
              filter={filters[kolom.sleutel] ?? ""}
              sortering={index >= 0 ? sorteringen[index] : undefined}
              prioriteit={index >= 0 ? index + 1 : null}
              aantalSorteringen={sorteringen.length}
              onFilterWijzigen={(waarde) =>
                onFilterWijzigen(kolom.sleutel, waarde)
              }
              onSorteren={(richting) => onSorteren(kolom.sleutel, richting)}
              onSorteringVerwijderen={() =>
                onSorteringVerwijderen(kolom.sleutel)
              }
              onSorteringVerplaatsen={(verschil) =>
                onSorteringVerplaatsen(kolom.sleutel, verschil)
              }
            />
          );
        })}
      </div>
    </div>
  );
}

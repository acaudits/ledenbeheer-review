"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const EXCEL_GEEN_WAARDEN_GESELECTEERD =
  "__GEEN_EXCELWAARDEN_GESELECTEERD__";

export type ExcelSortering = {
  kolom: string;
  richting:
    | "oplopend"
    | "aflopend";
} | null;

type Props = {
  kolom: string;
  label: string;
  waarden: string[];
  geselecteerdeWaarden:
    string[];
  sortering:
    ExcelSortering;
  onFilterWijzigen: (
    waarden: string[],
  ) => void;
  onSorteren: (
    richting:
      | "oplopend"
      | "aflopend",
  ) => void;
  onSorteringWissen: () => void;
};

export function ExcelKolomFilter({
  kolom,
  label,
  waarden,
  geselecteerdeWaarden,
  sortering,
  onFilterWijzigen,
  onSorteren,
  onSorteringWissen,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [zoekterm, setZoekterm] =
    useState("");

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const uniekeWaarden =
    useMemo(
      () =>
        [...new Set(waarden)]
          .sort((a, b) =>
            a.localeCompare(
              b,
              "nl-BE",
              {
                numeric: true,
                sensitivity: "base",
              },
            ),
          ),
      [waarden],
    );

  const zichtbareWaarden =
    useMemo(() => {
      const zoekwaarde =
        zoekterm
          .trim()
          .toLocaleLowerCase(
            "nl-BE",
          );

      if (!zoekwaarde) {
        return uniekeWaarden;
      }

      return uniekeWaarden.filter(
        (waarde) =>
          waarde
            .toLocaleLowerCase(
              "nl-BE",
            )
            .includes(
              zoekwaarde,
            ),
      );
    }, [
      uniekeWaarden,
      zoekterm,
    ]);

  const actieveSelectie =
    geselecteerdeWaarden.length >
      0
      ? new Set(
          geselecteerdeWaarden,
        )
      : new Set(
          uniekeWaarden,
        );

  const heeftFilter =
    geselecteerdeWaarden.length >
      0;

  const huidigeSortering =
    sortering?.kolom === kolom
      ? sortering.richting
      : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const sluitBuitenMenu = (
      event: MouseEvent,
    ) => {
      if (
        event.target instanceof
          Node &&
        !containerRef.current?.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    };

    const sluitMetEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      sluitBuitenMenu,
    );

    document.addEventListener(
      "keydown",
      sluitMetEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        sluitBuitenMenu,
      );

      document.removeEventListener(
        "keydown",
        sluitMetEscape,
      );
    };
  }, [open]);

  function normaliseerSelectie(
    volgende: Set<string>,
  ) {
    if (volgende.size === 0) {
      onFilterWijzigen([
        EXCEL_GEEN_WAARDEN_GESELECTEERD,
      ]);
      return;
    }

    if (
      volgende.size ===
        uniekeWaarden.length &&
      uniekeWaarden.every(
        (waarde) =>
          volgende.has(waarde),
      )
    ) {
      onFilterWijzigen([]);
      return;
    }

    onFilterWijzigen(
      uniekeWaarden.filter(
        (waarde) =>
          volgende.has(waarde),
      ),
    );
  }

  function wijzigWaarde(
    waarde: string,
  ) {
    const volgende =
      new Set(actieveSelectie);

    if (volgende.has(waarde)) {
      volgende.delete(waarde);
    } else {
      volgende.add(waarde);
    }

    normaliseerSelectie(
      volgende,
    );
  }

  const allesZichtbaarGeselecteerd =
    zichtbareWaarden.length >
      0 &&
    zichtbareWaarden.every(
      (waarde) =>
        actieveSelectie.has(
          waarde,
        ),
    );

  function wijzigAllesZichtbaar() {
    const volgende =
      new Set(actieveSelectie);

    if (
      allesZichtbaarGeselecteerd
    ) {
      for (
        const waarde of
        zichtbareWaarden
      ) {
        volgende.delete(waarde);
      }
    } else {
      for (
        const waarde of
        zichtbareWaarden
      ) {
        volgende.add(waarde);
      }
    }

    normaliseerSelectie(
      volgende,
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-w-28"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (huidig) => !huidig,
          )
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Filter en sorteer ${label}`}
        className={`flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left font-bold transition ${
          heeftFilter ||
          huidigeSortering
            ? "bg-emerald-100 text-emerald-900"
            : "hover:bg-slate-200"
        }`}
      >
        <span>{label}</span>

        <span
          aria-hidden="true"
          className="whitespace-nowrap text-[10px]"
        >
          {huidigeSortering ===
          "oplopend"
            ? "▲"
            : huidigeSortering ===
                "aflopend"
              ? "▼"
              : heeftFilter
                ? "●"
                : "▾"}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-[80] mt-1 w-72 rounded-xl border border-slate-300 bg-white p-3 text-slate-800 shadow-2xl"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onSorteren(
                  "oplopend",
                )
              }
              className={`rounded-lg border px-2 py-2 text-xs font-bold ${
                huidigeSortering ===
                "oplopend"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              A → Z
            </button>

            <button
              type="button"
              onClick={() =>
                onSorteren(
                  "aflopend",
                )
              }
              className={`rounded-lg border px-2 py-2 text-xs font-bold ${
                huidigeSortering ===
                "aflopend"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              Z → A
            </button>
          </div>

          <input
            type="search"
            value={zoekterm}
            onChange={(event) =>
              setZoekterm(
                event.target.value,
              )
            }
            placeholder="Zoeken in waarden..."
            aria-label={`Zoeken in ${label}`}
            className="mt-3 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <label className="mt-3 flex cursor-pointer items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={
                allesZichtbaarGeselecteerd
              }
              onChange={
                wijzigAllesZichtbaar
              }
              aria-label={
                allesZichtbaarGeselecteerd
                  ? `Alle zichtbare waarden van ${label} deselecteren`
                  : `Alle zichtbare waarden van ${label} selecteren`
              }
              className="size-4 accent-emerald-700"
            />

            {allesZichtbaarGeselecteerd
              ? "Alles deselecteren"
              : "Alles selecteren"}
          </label>

          <div className="mt-2 max-h-56 space-y-1 overflow-auto">
            {zichtbareWaarden.length >
            0 ? (
              zichtbareWaarden.map(
                (waarde) => (
                  <label
                    key={waarde}
                    className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={actieveSelectie.has(
                        waarde,
                      )}
                      onChange={() =>
                        wijzigWaarde(
                          waarde,
                        )
                      }
                      className="mt-0.5 size-4 shrink-0 accent-emerald-700"
                    />

                    <span className="break-words">
                      {waarde === "—"
                        ? "(Leeg)"
                        : waarde}
                    </span>
                  </label>
                ),
              )
            ) : (
              <p className="py-3 text-center text-xs text-slate-500">
                Geen waarden gevonden.
              </p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() =>
                onFilterWijzigen([])
              }
              disabled={!heeftFilter}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Filter wissen
            </button>

            <button
              type="button"
              onClick={
                onSorteringWissen
              }
              disabled={
                !huidigeSortering
              }
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sortering wissen
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600"
          >
            Gereed
          </button>
        </div>
      ) : null}
    </div>
  );
}

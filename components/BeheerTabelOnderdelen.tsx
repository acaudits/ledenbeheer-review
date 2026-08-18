"use client";

import type {
  ReactNode,
} from "react";

import type {
  BeheerTabelSortering,
} from "@/lib/beheer-tabel";

export const BEHEER_TABEL_STIJLEN = {
  kader:
    "overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm",
  bovenbalk:
    "border-b border-slate-200 px-4 py-3",
  overzichtTitel:
    "text-sm font-black text-slate-900",
  aantal:
    "mt-0.5 text-xs text-slate-500",
  leeg:
    "p-8 text-center text-sm font-medium text-slate-500",
  scroll:
    "max-h-[calc(100vh-240px)] overflow-auto",
  tabel:
    "w-full min-w-max text-left",
  kop:
    "sticky top-0 z-20 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600 shadow-sm",
  voet:
    "flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between",
  verwijderdKader:
    "isolate min-h-72 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm ring-1 ring-slate-200",
  verwijderdBovenbalk:
    "flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
  verwijderdLeeg:
    "flex min-h-56 flex-col items-center justify-center bg-white px-6 py-16 text-center text-sm font-medium text-slate-500",
  actieKolomLaatste:
    "[&_th:last-child]:sticky [&_th:last-child]:right-0 [&_th:last-child]:top-0 [&_th:last-child]:z-30 [&_th:last-child]:w-20 [&_th:last-child]:min-w-20 [&_th:last-child]:bg-slate-50 [&_th:last-child]:text-left [&_td:last-child]:sticky [&_td:last-child]:right-0 [&_td:last-child]:z-10 [&_td:last-child]:w-20 [&_td:last-child]:min-w-20 [&_td:last-child]:bg-inherit [&_td:last-child]:text-left",
  actieKolomEerste:
    "[&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:top-0 [&_th:first-child]:z-30 [&_th:first-child]:w-20 [&_th:first-child]:min-w-20 [&_th:first-child]:bg-slate-50 [&_th:first-child]:text-left [&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10 [&_td:first-child]:w-20 [&_td:first-child]:min-w-20 [&_td:first-child]:bg-inherit [&_td:first-child]:text-left",
  meerKnop:
    "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60",
  foutKnop:
    "inline-flex h-9 items-center justify-center rounded-xl border border-red-300 bg-white px-4 text-xs font-semibold text-red-800 transition hover:bg-red-100",
} as const;

type KaderProps = {
  titel?: string;
  aantalTekst?: ReactNode;
  zoekterm: string;
  zoekPlaceholder: string;
  heeftFilters: boolean;
  onZoektermWijzigen:
    (waarde: string) => void;
  onAllesWissen: () => void;
  filterPaneel?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

type KolomKopProps = {
  label: string;
  sleutel: string;
  sortering:
    BeheerTabelSortering;
  heeftFilter: boolean;
  onSorteren:
    (sleutel: string) => void;
  onFilteren:
    (sleutel: string) => void;
  stickyLinks?: boolean;
};

type FilterPaneelProps = {
  label: string;
  children: ReactNode;
  onWissen: () => void;
  onSluiten: () => void;
};

type VoetProps = {
  children?: ReactNode;
  heeftVolgendePagina?: boolean;
  isLaden?: boolean;
  onMeerLaden?: () => void;
};

export function BeheerTabelKader({
  titel = "Overzicht",
  aantalTekst,
  zoekterm,
  zoekPlaceholder,
  heeftFilters,
  onZoektermWijzigen,
  onAllesWissen,
  filterPaneel,
  children,
  footer,
}: KaderProps) {
  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900">
            {titel}
          </h2>

          {aantalTekst ? (
            <div className="mt-0.5 text-xs text-slate-500">
              {aantalTekst}
            </div>
          ) : null}
        </div>

        <div className="flex w-full gap-2 sm:max-w-xl">
          <input
            type="search"
            value={zoekterm}
            onChange={(event) => {
              onZoektermWijzigen(
                event.target.value,
              );
            }}
            placeholder={
              zoekPlaceholder
            }
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />

          {heeftFilters ? (
            <button
              type="button"
              onClick={
                onAllesWissen
              }
              className="h-10 shrink-0 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Alles wissen
            </button>
          ) : null}
        </div>
      </div>

      {filterPaneel}

      {children}

      {footer}
    </section>
  );
}

export function BeheerFilterPaneel({
  label,
  children,
  onWissen,
  onSluiten,
}: FilterPaneelProps) {
  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Filter op {label}
          </p>

          <div className="mt-1.5">
            {children}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onWissen}
            className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Filter wissen
          </button>

          <button
            type="button"
            onClick={onSluiten}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

export function BeheerTabelScroll({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="max-h-[calc(100vh-240px)] overflow-auto">
      {children}
    </div>
  );
}

export function BeheerTabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <table className="w-full min-w-max text-left">
      {children}
    </table>
  );
}

export function BeheerTabelKop({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
      {children}
    </thead>
  );
}

export function BeheerTabelKolomKop({
  label,
  sleutel,
  sortering,
  heeftFilter,
  onSorteren,
  onFilteren,
  stickyLinks = false,
}: KolomKopProps) {
  const actief =
    sortering?.sleutel ===
    sleutel;

  return (
    <th
      className={`border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold uppercase text-slate-500 ${
        stickyLinks
          ? "sticky left-0 top-0 z-30"
          : ""
      }`}
    >
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => {
            onSorteren(sleutel);
          }}
          className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-slate-200 ${
            actief
              ? "text-emerald-800"
              : ""
          }`}
        >
          <span>{label}</span>

          <span
            aria-hidden="true"
            className="text-[10px]"
          >
            {!actief
              ? "↕"
              : sortering
                    ?.richting ===
                  "oplopend"
                ? "↑"
                : "↓"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onFilteren(sleutel);
          }}
          aria-label={`Filter op ${label}`}
          className={`inline-flex size-7 items-center justify-center rounded-lg transition ${
            heeftFilter
              ? "bg-emerald-100 text-emerald-800"
              : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="size-4"
          >
            <path
              d="M4 6h16M7 12h10m-7 6h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </th>
  );
}

export function BeheerActieKolomKop() {
  return (
    <th className="sticky right-0 top-0 z-30 w-44 min-w-44 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-xs font-bold uppercase text-slate-500">
      Acties
    </th>
  );
}

export function BeheerTabelVoet({
  children,
  heeftVolgendePagina = false,
  isLaden = false,
  onMeerLaden,
}: VoetProps) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>{children}</div>

        {heeftVolgendePagina &&
        onMeerLaden ? (
          <button
            type="button"
            disabled={isLaden}
            onClick={onMeerLaden}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
          >
            {isLaden
              ? "Resultaten laden..."
              : "Meer resultaten laden"}
          </button>
        ) : null}
      </div>
    </footer>
  );
}

export function BeheerLegeToestand({
  titel,
  beschrijving,
  actie,
}: {
  titel: string;
  beschrijving: string;
  actie?: ReactNode;
}) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-lg font-bold text-slate-900">
        {titel}
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        {beschrijving}
      </p>

      {actie ? (
        <div className="mt-5">
          {actie}
        </div>
      ) : null}
    </div>
  );
}

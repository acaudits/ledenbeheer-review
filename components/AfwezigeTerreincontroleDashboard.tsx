"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AFWEZIGE_TERREINCONTROLE_DASHBOARDFILTER_EVENT,
  AFWEZIGE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
  type AfwezigeTerreincontroleDashboardfilter,
  type AfwezigeTerreincontroleDashboardTellingen,
  type AfwezigeTerreincontroleServergegevens,
} from "@/hooks/useAfwezigeTerreincontrolesQuery";

function useAfwezigeTerreincontroleDashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState<
    AfwezigeTerreincontroleDashboardTellingen | null
  >(null);

  useEffect(() => {
    function ontvang(
      event: Event,
    ) {
      const aangepast =
        event as CustomEvent<
          AfwezigeTerreincontroleServergegevens
        >;

      setDashboard(
        aangepast.detail.dashboard,
      );
    }

    window.addEventListener(
      AFWEZIGE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
      ontvang,
    );

    return () => {
      window.removeEventListener(
        AFWEZIGE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
        ontvang,
      );
    };
  }, []);

  return dashboard;
}

export function AfwezigeTerreincontroleAantalTekst() {
  const dashboard =
    useAfwezigeTerreincontroleDashboard();

  if (!dashboard) {
    return (
      <span>
        Afwezigen laden...
      </span>
    );
  }

  return (
    <span>
      {dashboard.aantalAfwezigen}{" "}
      {dashboard.aantalAfwezigen ===
      1
        ? "afwezige terreincontrole"
        : "afwezige terreincontroles"}
    </span>
  );
}

function pasDashboardfilterToe(
  filter:
    AfwezigeTerreincontroleDashboardfilter,
) {
  window.dispatchEvent(
    new CustomEvent<
      AfwezigeTerreincontroleDashboardfilter
    >(
      AFWEZIGE_TERREINCONTROLE_DASHBOARDFILTER_EVENT,
      {
        detail: filter,
      },
    ),
  );
}

export function AfwezigeTerreincontroleDashboard() {
  const dashboard =
    useAfwezigeTerreincontroleDashboard();

  const uitgeschakeld =
    dashboard === null;

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <button
        type="button"
        disabled={uitgeschakeld}
        onClick={() =>
          pasDashboardfilterToe(
            "alle",
          )
        }
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-wait disabled:opacity-70"
      >
        <span className="block text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal afwezigen
        </span>

        <span className="mt-2 block text-3xl font-black">
          {dashboard
            ?.aantalAfwezigen ??
            "…"}
        </span>

        <span className="mt-1 block text-xs font-semibold opacity-70">
          Klik om alle afwezigen te tonen
        </span>
      </button>

      <button
        type="button"
        disabled={uitgeschakeld}
        onClick={() =>
          pasDashboardfilterToe(
            "factuurVerzonden",
          )
        }
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-wait disabled:opacity-70"
      >
        <span className="block text-xs font-bold uppercase tracking-wide opacity-70">
          Factuur verzonden
        </span>

        <span className="mt-2 block text-3xl font-black">
          {dashboard
            ?.facturenVerzonden ??
            "…"}
        </span>

        <span className="mt-1 block text-xs font-semibold opacity-70">
          Klik om verzonden facturen te tonen
        </span>
      </button>

      <button
        type="button"
        disabled={uitgeschakeld}
        onClick={() =>
          pasDashboardfilterToe(
            "rood",
          )
        }
        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-red-950 shadow-sm transition hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-wait disabled:opacity-70"
      >
        <span className="block text-xs font-bold uppercase tracking-wide opacity-70">
          Rode persoons-ID&apos;s
        </span>

        <span className="mt-2 block text-3xl font-black">
          {dashboard
            ?.aantalRodePersoonsIds ??
            "…"}
        </span>

        <span className="mt-1 block text-xs font-semibold opacity-70">
          Klik voor persoons-ID&apos;s met twee of meer afwezigheden
        </span>
      </button>
    </section>
  );
}

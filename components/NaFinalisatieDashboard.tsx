"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  type NaFinalisatieDashboardTellingen,
  NA_FINALISATIE_SERVERGEGEVENS_EVENT,
  type NaFinalisatieServergegevens,
} from "@/hooks/useNaFinalisatieQuery";

function useNaFinalisatieDashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState<
    NaFinalisatieDashboardTellingen | null
  >(null);

  useEffect(() => {
    function ontvang(
      event: Event,
    ) {
      const aangepast =
        event as CustomEvent<
          NaFinalisatieServergegevens
        >;

      setDashboard(
        aangepast.detail
          .dashboard,
      );
    }

    window.addEventListener(
      NA_FINALISATIE_SERVERGEGEVENS_EVENT,
      ontvang,
    );

    return () => {
      window.removeEventListener(
        NA_FINALISATIE_SERVERGEGEVENS_EVENT,
        ontvang,
      );
    };
  }, []);

  return dashboard;
}

export function NaFinalisatieAantalTekst() {
  const dashboard =
    useNaFinalisatieDashboard();

  if (!dashboard) {
    return (
      <span>
        Registraties laden...
      </span>
    );
  }

  return (
    <span>
      {dashboard.registraties}{" "}
      actieve{" "}
      {dashboard.registraties ===
      1
        ? "registratie"
        : "registraties"}
    </span>
  );
}

export function NaFinalisatieDashboard() {
  const dashboard =
    useNaFinalisatieDashboard();

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal registraties
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.registraties ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Geregistreerd
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.geregistreerd ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-950 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Niet geregistreerd
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.nietGeregistreerd ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Spontaan
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.spontaan ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Afspraak of klacht
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.afspraakOfKlacht ??
            "…"}
        </p>
      </article>
    </section>
  );
}

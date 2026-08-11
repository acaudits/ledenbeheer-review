"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  INGEPLANDE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
  type IngeplandeTerreincontroleDashboardTellingen,
  type IngeplandeTerreincontroleServergegevens,
} from "@/hooks/useIngeplandeTerreincontrolesQuery";

function useIngeplandeTerreincontroleDashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState<
    IngeplandeTerreincontroleDashboardTellingen | null
  >(null);

  useEffect(() => {
    function ontvang(
      event: Event,
    ) {
      const aangepast =
        event as CustomEvent<
          IngeplandeTerreincontroleServergegevens
        >;

      setDashboard(
        aangepast.detail
          .dashboard,
      );
    }

    window.addEventListener(
      INGEPLANDE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
      ontvang,
    );

    return () => {
      window.removeEventListener(
        INGEPLANDE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
        ontvang,
      );
    };
  }, []);

  return dashboard;
}

export function IngeplandeTerreincontroleAantalTekst() {
  const dashboard =
    useIngeplandeTerreincontroleDashboard();

  if (!dashboard) {
    return (
      <span>
        Terreincontroles laden...
      </span>
    );
  }

  return (
    <span>
      {dashboard.plaatsbezoeken}{" "}
      actieve{" "}
      {dashboard.plaatsbezoeken ===
      1
        ? "terreincontrole"
        : "terreincontroles"}
    </span>
  );
}

export function IngeplandeTerreincontroleDashboard() {
  const dashboard =
    useIngeplandeTerreincontroleDashboard();

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal plaatsbezoeken
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.plaatsbezoeken ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal in opmaak
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.inOpmaak ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal gearchiveerd
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.gearchiveerd ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left text-sky-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal actueel attest
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.actueelAttest ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-red-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal niet verzonden facturen
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.nietVerzondenFacturen ??
            "…"}
        </p>
      </article>
    </section>
  );
}

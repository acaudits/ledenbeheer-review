"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  TERREINCONTROLE_SERVERGEGEVENS_EVENT,
  type TerreincontroleDashboardTellingen,
  type TerreincontroleServergegevens,
} from "@/hooks/useTerreincontrolesQuery";

function useTerreincontroleDashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState<
    TerreincontroleDashboardTellingen | null
  >(null);

  useEffect(() => {
    function ontvang(
      event: Event,
    ) {
      const aangepast =
        event as CustomEvent<
          TerreincontroleServergegevens
        >;

      setDashboard(
        aangepast.detail.dashboard,
      );
    }

    window.addEventListener(
      TERREINCONTROLE_SERVERGEGEVENS_EVENT,
      ontvang,
    );

    return () => {
      window.removeEventListener(
        TERREINCONTROLE_SERVERGEGEVENS_EVENT,
        ontvang,
      );
    };
  }, []);

  return dashboard;
}

export function TerreincontroleAantalTekst() {
  const dashboard =
    useTerreincontroleDashboard();

  if (!dashboard) {
    return (
      <span>
        Terreincontroles laden...
      </span>
    );
  }

  return (
    <span>
      {dashboard.terreincontroles}{" "}
      actieve{" "}
      {dashboard.terreincontroles ===
      1
        ? "terreincontrole"
        : "terreincontroles"}
    </span>
  );
}

export function TerreincontroleDashboard() {
  const dashboard =
    useTerreincontroleDashboard();

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal terreincontroles
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.terreincontroles ??
            "…"}
        </p>
      </article>

      <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left text-sky-950 shadow-sm transition">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Aantal non-conformiteiten
        </p>

        <p className="mt-2 text-3xl font-black">
          {dashboard
            ?.nonConformiteiten ??
            "…"}
        </p>
      </article>
    </section>
  );
}

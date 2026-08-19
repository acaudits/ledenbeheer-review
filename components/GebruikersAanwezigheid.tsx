"use client";

import { useEffect, useState } from "react";

type Gebruiker = {
  id: number;
  naam: string;
  initialen: string;
  laatsteActiviteitOp: string | null;
  isIngelogd: boolean;
};

type Props = {
  rol: string | null;
  pathname: string;
};

type Aanwezigheidsstatus =
  | "groen"
  | "geel"
  | "rood";

const ACTIEF_GEDURENDE_MS =
  10 * 60 * 1000;
const ACTIVITEIT_INTERVAL_MS =
  60 * 1000;
const OVERZICHT_INTERVAL_MS =
  30 * 1000;

function bepaalStatus(
  gebruiker: Gebruiker,
): Aanwezigheidsstatus {
  if (!gebruiker.isIngelogd) {
    return "rood";
  }

  const laatsteActiviteit =
    gebruiker.laatsteActiviteitOp
      ? new Date(
          gebruiker.laatsteActiviteitOp,
        ).getTime()
      : 0;

  if (
    laatsteActiviteit > 0 &&
    Date.now() - laatsteActiviteit <=
      ACTIEF_GEDURENDE_MS
  ) {
    return "groen";
  }

  return "geel";
}

const statusWeergave = {
  groen: {
    label: "Actief",
    uitleg:
      "Actief in de afgelopen 10 minuten",
    cirkel:
      "border-emerald-300/70 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-950/30",
    stip:
      "bg-emerald-400 ring-emerald-950",
    tekst: "text-emerald-300",
  },
  geel: {
    label: "Inactief",
    uitleg:
      "Langer dan 10 minuten inactief",
    cirkel:
      "border-amber-200/70 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-amber-950/30",
    stip:
      "bg-amber-400 ring-emerald-950",
    tekst: "text-amber-300",
  },
  rood: {
    label: "Uitgelogd",
    uitleg: "Gebruiker is uitgelogd",
    cirkel:
      "border-red-300/70 bg-gradient-to-br from-red-400 to-red-600 text-white shadow-red-950/30",
    stip:
      "bg-red-400 ring-emerald-950",
    tekst: "text-red-300",
  },
} satisfies Record<
  Aanwezigheidsstatus,
  {
    label: string;
    uitleg: string;
    cirkel: string;
    stip: string;
    tekst: string;
  }
>;

export function GebruikersAanwezigheid({
  rol,
  pathname,
}: Props) {
  const [gebruikers, setGebruikers] =
    useState<Gebruiker[]>([]);

  useEffect(() => {
    let laatsteVerzending = 0;

    function registreerActiviteit(
      geforceerd = false,
    ) {
      const nu = Date.now();

      if (
        !geforceerd &&
        nu - laatsteVerzending <
          ACTIVITEIT_INTERVAL_MS
      ) {
        return;
      }

      laatsteVerzending = nu;

      void fetch("/api/aanwezigheid", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    }

    registreerActiviteit(true);

    const activiteit = () =>
      registreerActiviteit(false);

    window.addEventListener(
      "pointerdown",
      activiteit,
    );
    window.addEventListener(
      "keydown",
      activiteit,
    );
    window.addEventListener(
      "scroll",
      activiteit,
      { passive: true },
    );
    window.addEventListener(
      "touchstart",
      activiteit,
      { passive: true },
    );
    window.addEventListener(
      "focus",
      activiteit,
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        activiteit,
      );
      window.removeEventListener(
        "keydown",
        activiteit,
      );
      window.removeEventListener(
        "scroll",
        activiteit,
      );
      window.removeEventListener(
        "touchstart",
        activiteit,
      );
      window.removeEventListener(
        "focus",
        activiteit,
      );
    };
  }, [pathname]);

  useEffect(() => {
    if (rol !== "BEHEERDER") {
      return;
    }

    let actief = true;

    async function laadGebruikers() {
      try {
        const response = await fetch(
          "/api/aanwezigheid",
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const resultaat =
          (await response.json()) as {
            gebruikers?: Gebruiker[];
          };

        if (
          actief &&
          Array.isArray(
            resultaat.gebruikers,
          )
        ) {
          setGebruikers(
            resultaat.gebruikers,
          );
        }
      } catch (fout) {
        console.error(
          "Aanwezigheid ophalen mislukt:",
          fout,
        );
      }
    }

    void laadGebruikers();

    const interval = window.setInterval(
      () => void laadGebruikers(),
      OVERZICHT_INTERVAL_MS,
    );

    return () => {
      actief = false;
      window.clearInterval(interval);
    };
  }, [rol]);

  if (rol !== "BEHEERDER") {
    return null;
  }

  const gesorteerdeGebruikers = [
    ...gebruikers,
  ].sort((a, b) => {
    const volgorde = {
      groen: 0,
      geel: 1,
      rood: 2,
    };

    const statusverschil =
      volgorde[bepaalStatus(a)] -
      volgorde[bepaalStatus(b)];

    return (
      statusverschil ||
      a.naam.localeCompare(b.naam, "nl-BE")
    );
  });

  const aantalActief =
    gesorteerdeGebruikers.filter(
      (gebruiker) =>
        bepaalStatus(gebruiker) ===
        "groen",
    ).length;

  return (
    <section className="mx-3 mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100/50">
          Team
        </p>

        <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-300/80">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          {aantalActief}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {gesorteerdeGebruikers.map(
          (gebruiker) => {
            const status =
              bepaalStatus(gebruiker);
            const weergave =
              statusWeergave[status];

            return (
              <button
                key={gebruiker.id}
                type="button"
                title={`${gebruiker.naam} — ${weergave.uitleg}`}
                aria-label={`${gebruiker.naam}: ${weergave.uitleg}`}
                className={`group relative flex size-7 shrink-0 items-center justify-center rounded-full border shadow-sm transition-transform duration-150 hover:-translate-y-0.5 focus:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-300/30 ${weergave.cirkel}`}
              >
                <span className="text-[9px] font-extrabold tracking-tight">
                  {gebruiker.initialen}
                </span>

                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-left text-white opacity-0 shadow-xl shadow-black/30 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100"
                >
                  <span className="block text-[11px] font-semibold">
                    {gebruiker.naam}
                  </span>

                  <span
                    className={`mt-0.5 block text-[9px] font-medium ${weergave.tekst}`}
                  >
                    {weergave.label}
                  </span>

                  <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/10 bg-slate-950" />
                </span>
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}

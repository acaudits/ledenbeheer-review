"use client";

import { useMemo, useState } from "react";

export type KalenderDagTelling = {
  datum: string;
  aantal: number;
};

type ControleMaandkalenderProps = {
  soort: "deskcontroles" | "terreincontroles";
  tellingen: readonly KalenderDagTelling[];
  naFinalisatieTellingen?: readonly KalenderDagTelling[];
  vandaag: string;
};

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

const maandFormatter = new Intl.DateTimeFormat("nl-BE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const volledigeDatumFormatter = new Intl.DateTimeFormat("nl-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function leesDatumSleutel(datum: string) {
  const [jaar, maand, dag] = datum.split("-").map(Number);

  return {
    jaar,
    maand: maand - 1,
    dag,
  };
}

function maakDatumSleutel(jaar: number, maand: number, dag: number) {
  return [
    jaar.toString().padStart(4, "0"),
    (maand + 1).toString().padStart(2, "0"),
    dag.toString().padStart(2, "0"),
  ].join("-");
}

export function ControleMaandkalender({
  soort,
  tellingen,
  naFinalisatieTellingen = [],
  vandaag,
}: ControleMaandkalenderProps) {
  const huidigeDatum = leesDatumSleutel(vandaag);

  const [zichtbareMaand, setZichtbareMaand] = useState(() => ({
    jaar: huidigeDatum.jaar,
    maand: huidigeDatum.maand,
  }));

  const tellingPerDag = useMemo(
    () =>
      new Map(
        tellingen.map((telling) => [telling.datum, telling.aantal] as const),
      ),
    [tellingen],
  );

  const naFinalisatiesPerDag = useMemo(
    () =>
      new Map(
        naFinalisatieTellingen.map(
          (telling) => [telling.datum, telling.aantal] as const,
        ),
      ),
    [naFinalisatieTellingen],
  );

  const eersteDag = new Date(
    Date.UTC(zichtbareMaand.jaar, zichtbareMaand.maand, 1),
  );

  const aantalDagen = new Date(
    Date.UTC(zichtbareMaand.jaar, zichtbareMaand.maand + 1, 0),
  ).getUTCDate();

  const legeDagenVooraf = (eersteDag.getUTCDay() + 6) % 7;
  const aantalCellen = Math.ceil((legeDagenVooraf + aantalDagen) / 7) * 7;

  const wijzigMaand = (verschil: number) => {
    setZichtbareMaand((huidigeMaand) => {
      const nieuweDatum = new Date(
        Date.UTC(huidigeMaand.jaar, huidigeMaand.maand + verschil, 1),
      );

      return {
        jaar: nieuweDatum.getUTCFullYear(),
        maand: nieuweDatum.getUTCMonth(),
      };
    });
  };

  const gaNaarVandaag = () => {
    setZichtbareMaand({
      jaar: huidigeDatum.jaar,
      maand: huidigeDatum.maand,
    });
  };

  const isTerrein = soort === "terreincontroles";
  const titel = isTerrein
    ? "Ingeplande terreincontroles"
    : "Ingeplande deskcontroles";

  return (
    <section
      aria-label={`${titel} per dag`}
      className="min-w-0 rounded-xl border border-emerald-200 bg-white p-2.5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => wijzigMaand(-1)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          aria-label="Vorige maand"
        >
          ‹
        </button>

        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-black capitalize text-slate-950">
            {maandFormatter.format(eersteDag)}
          </p>

          <button
            type="button"
            onClick={gaNaarVandaag}
            className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 hover:text-emerald-900 focus:outline-none focus:underline"
          >
            Vandaag
          </button>
        </div>

        <button
          type="button"
          onClick={() => wijzigMaand(1)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          aria-label="Volgende maand"
        >
          ›
        </button>
      </div>

      {isTerrein ? (
        <div
          className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold"
          aria-label="Kalenderlegende"
        >
          <span className="inline-flex items-center gap-1 text-emerald-800">
            <span
              className="size-2 rounded-full bg-emerald-600"
              aria-hidden="true"
            />
            T = terreincontrole
          </span>

          <span className="inline-flex items-center gap-1 text-amber-800">
            <span
              className="size-2 rounded-full bg-amber-500"
              aria-hidden="true"
            />
            NF = na-finalisatie
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAGEN.map((weekdag) => (
          <div
            key={weekdag}
            className="py-1 text-center text-[9px] font-black uppercase text-slate-500"
          >
            {weekdag}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: aantalCellen }, (_, index) => {
          const dag = index - legeDagenVooraf + 1;

          if (dag < 1 || dag > aantalDagen) {
            return (
              <div
                key={`leeg-${index}`}
                aria-hidden="true"
                className="min-h-14 rounded-md bg-slate-50/60"
              />
            );
          }

          const datumSleutel = maakDatumSleutel(
            zichtbareMaand.jaar,
            zichtbareMaand.maand,
            dag,
          );

          const aantal = tellingPerDag.get(datumSleutel) ?? 0;
          const aantalNaFinalisaties =
            naFinalisatiesPerDag.get(datumSleutel) ?? 0;

          const isVandaag = datumSleutel === vandaag;
          const datum = new Date(
            Date.UTC(zichtbareMaand.jaar, zichtbareMaand.maand, dag),
          );

          const ariaBeschrijving = isTerrein
            ? `${volledigeDatumFormatter.format(
                datum,
              )}: ${aantal} terreincontroles en ${aantalNaFinalisaties} na-finalisaties`
            : `${volledigeDatumFormatter.format(
                datum,
              )}: ${aantal} deskcontroles`;

          const celStijl = isVandaag
            ? "min-h-14 rounded-md border-2 border-emerald-600 bg-emerald-100 p-1 text-center"
            : aantal > 0
              ? "min-h-14 rounded-md border border-emerald-200 bg-emerald-50 p-1 text-center"
              : aantalNaFinalisaties > 0
                ? "min-h-14 rounded-md border border-amber-300 bg-amber-50 p-1 text-center"
                : "min-h-14 rounded-md border border-slate-100 bg-white p-1 text-center";

          return (
            <div
              key={datumSleutel}
              aria-label={ariaBeschrijving}
              className={celStijl}
            >
              <div
                className={
                  isVandaag
                    ? "text-[10px] font-black text-emerald-950"
                    : "text-[10px] font-bold text-slate-600"
                }
              >
                {dag}
              </div>

              {isTerrein ? (
                <div className="mt-0.5 space-y-0.5 text-[9px] font-black tabular-nums">
                  <div
                    className={
                      aantal > 0 ? "text-emerald-800" : "text-emerald-300"
                    }
                    title={`${aantal} terreincontroles`}
                  >
                    T {aantal}
                  </div>

                  <div
                    className={
                      aantalNaFinalisaties > 0
                        ? "text-amber-700"
                        : "text-amber-300"
                    }
                    title={`${aantalNaFinalisaties} na-finalisaties`}
                  >
                    NF {aantalNaFinalisaties}
                  </div>
                </div>
              ) : (
                <div
                  className={
                    aantal > 0
                      ? "mt-0.5 text-sm font-black tabular-nums text-emerald-800"
                      : "mt-0.5 text-xs font-bold tabular-nums text-slate-300"
                  }
                >
                  {aantal}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-500">
        {isTerrein
          ? "Groen: terreincontroles · amber: na-finalisaties"
          : "Aantal deskcontroles per controledatum"}
      </p>
    </section>
  );
}

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

type Weergave = "kalender" | "staafdiagram";

type DagGegevens = {
  dag: number;
  datumSleutel: string;
  aantal: number;
  aantalNaFinalisaties: number;
  isVandaag: boolean;
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

function KalenderLegende() {
  return (
    <div
      className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[10px] font-semibold"
      aria-label="Kalenderlegende"
    >
      <span className="inline-flex items-center gap-1.5 text-emerald-800">
        <span
          className="size-2.5 rounded-full bg-emerald-600"
          aria-hidden="true"
        />
        Terreincontroles
      </span>

      <span className="inline-flex items-center gap-1.5 text-amber-800">
        <span
          className="size-2.5 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        Na-finalisaties
      </span>
    </div>
  );
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

  const [weergave, setWeergave] = useState<Weergave>("kalender");

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
  const isTerrein = soort === "terreincontroles";

  const dagGegevens: DagGegevens[] = Array.from(
    { length: aantalDagen },
    (_, index) => {
      const dag = index + 1;
      const datumSleutel = maakDatumSleutel(
        zichtbareMaand.jaar,
        zichtbareMaand.maand,
        dag,
      );

      return {
        dag,
        datumSleutel,
        aantal: tellingPerDag.get(datumSleutel) ?? 0,
        aantalNaFinalisaties: naFinalisatiesPerDag.get(datumSleutel) ?? 0,
        isVandaag: datumSleutel === vandaag,
      };
    },
  );

  const maximumAantal = Math.max(
    1,
    ...dagGegevens.flatMap((dag) =>
      isTerrein ? [dag.aantal, dag.aantalNaFinalisaties] : [dag.aantal],
    ),
  );

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

  const titel = isTerrein
    ? "Ingeplande terreincontroles"
    : "Ingeplande deskcontroles";

  return (
    <section
      aria-label={`${titel} per dag`}
      className="min-w-0 rounded-xl border border-emerald-200 bg-white p-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => wijzigMaand(-1)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          aria-label="Vorige maand"
        >
          ‹
        </button>

        <p className="min-w-0 truncate text-center text-sm font-black capitalize text-slate-950">
          {maandFormatter.format(eersteDag)}
        </p>

        <button
          type="button"
          onClick={() => wijzigMaand(1)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          aria-label="Volgende maand"
        >
          ›
        </button>
      </div>

      <div
        className="mx-auto mt-2 grid max-w-64 grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-0.5"
        aria-label="Kies kalender- of diagramweergave"
      >
        <button
          type="button"
          aria-pressed={weergave === "kalender"}
          onClick={() => setWeergave("kalender")}
          className={
            weergave === "kalender"
              ? "rounded-md bg-white px-2 py-1.5 text-[11px] font-bold text-emerald-800 shadow-sm"
              : "rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
          }
        >
          Kalender
        </button>

        <button
          type="button"
          aria-pressed={weergave === "staafdiagram"}
          onClick={() => setWeergave("staafdiagram")}
          className={
            weergave === "staafdiagram"
              ? "rounded-md bg-white px-2 py-1.5 text-[11px] font-bold text-emerald-800 shadow-sm"
              : "rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
          }
        >
          Staafdiagram
        </button>
      </div>

      {weergave === "kalender" ? (
        <div className="mt-2">
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

              const gegevens = dagGegevens[dag - 1];
              const datum = new Date(
                Date.UTC(zichtbareMaand.jaar, zichtbareMaand.maand, dag),
              );

              const ariaBeschrijving = isTerrein
                ? `${volledigeDatumFormatter.format(
                    datum,
                  )}: ${gegevens.aantal} terreincontroles en ${
                    gegevens.aantalNaFinalisaties
                  } na-finalisaties`
                : `${volledigeDatumFormatter.format(
                    datum,
                  )}: ${gegevens.aantal} deskcontroles`;

              const heeftAantal =
                gegevens.aantal > 0 || gegevens.aantalNaFinalisaties > 0;

              const celStijl = gegevens.isVandaag
                ? "min-h-14 rounded-md border-2 border-emerald-600 bg-white p-1 text-center"
                : heeftAantal
                  ? "min-h-14 rounded-md border border-slate-200 bg-slate-50 p-1 text-center"
                  : "min-h-14 rounded-md border border-slate-100 bg-white p-1 text-center";

              return (
                <div
                  key={gegevens.datumSleutel}
                  aria-label={ariaBeschrijving}
                  className={celStijl}
                >
                  <div
                    className={
                      gegevens.isVandaag
                        ? "text-[10px] font-black text-emerald-900"
                        : "text-[10px] font-bold text-slate-600"
                    }
                  >
                    {dag}
                  </div>

                  <div className="mt-1 flex min-h-5 flex-wrap items-center justify-center gap-1 text-[10px] font-black tabular-nums">
                    {gegevens.aantal > 0 ? (
                      <span
                        className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-white"
                        title={`${gegevens.aantal} ${soort}`}
                      >
                        {gegevens.aantal}
                      </span>
                    ) : null}

                    {isTerrein && gegevens.aantalNaFinalisaties > 0 ? (
                      <span
                        className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-amber-950"
                        title={`${gegevens.aantalNaFinalisaties} na-finalisaties`}
                      >
                        {gegevens.aantalNaFinalisaties}
                      </span>
                    ) : null}

                    {!heeftAantal ? (
                      <span className="text-slate-300" aria-hidden="true">
                        –
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="mt-3"
          role="img"
          aria-label={`Staafdiagram met ${titel.toLowerCase()} per dag van ${maandFormatter.format(
            eersteDag,
          )}`}
        >
          <div
            className="grid h-40 items-end gap-px border-b border-slate-300 px-1"
            style={{
              gridTemplateColumns: `repeat(${aantalDagen}, minmax(0, 1fr))`,
            }}
          >
            {dagGegevens.map((gegevens) => {
              const datum = new Date(
                Date.UTC(
                  zichtbareMaand.jaar,
                  zichtbareMaand.maand,
                  gegevens.dag,
                ),
              );

              const titelTekst = isTerrein
                ? `${volledigeDatumFormatter.format(
                    datum,
                  )}: ${gegevens.aantal} terreincontroles en ${
                    gegevens.aantalNaFinalisaties
                  } na-finalisaties`
                : `${volledigeDatumFormatter.format(
                    datum,
                  )}: ${gegevens.aantal} deskcontroles`;

              return (
                <div
                  key={gegevens.datumSleutel}
                  title={titelTekst}
                  className={
                    gegevens.isVandaag
                      ? "flex h-full items-end justify-center gap-px rounded-t bg-emerald-50 ring-1 ring-inset ring-emerald-300"
                      : "flex h-full items-end justify-center gap-px"
                  }
                >
                  {gegevens.aantal > 0 ? (
                    <span
                      className={
                        isTerrein
                          ? "w-[42%] max-w-2 rounded-t-sm bg-emerald-600"
                          : "w-[70%] max-w-3 rounded-t-sm bg-emerald-600"
                      }
                      style={{
                        height: `${Math.max(
                          4,
                          (gegevens.aantal / maximumAantal) * 100,
                        )}%`,
                      }}
                      aria-hidden="true"
                    />
                  ) : null}

                  {isTerrein && gegevens.aantalNaFinalisaties > 0 ? (
                    <span
                      className="w-[42%] max-w-2 rounded-t-sm bg-amber-500"
                      style={{
                        height: `${Math.max(
                          4,
                          (gegevens.aantalNaFinalisaties / maximumAantal) * 100,
                        )}%`,
                      }}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className="mt-1 grid gap-px px-1"
            style={{
              gridTemplateColumns: `repeat(${aantalDagen}, minmax(0, 1fr))`,
            }}
            aria-hidden="true"
          >
            {dagGegevens.map((gegevens) => (
              <span
                key={gegevens.datumSleutel}
                className={
                  gegevens.dag === 1 ||
                  gegevens.dag === aantalDagen ||
                  gegevens.dag % 5 === 0
                    ? "text-center text-[8px] font-bold text-slate-500"
                    : "text-center text-[8px] text-transparent"
                }
              >
                {gegevens.dag}
              </span>
            ))}
          </div>
        </div>
      )}

      {isTerrein ? <KalenderLegende /> : null}
    </section>
  );
}

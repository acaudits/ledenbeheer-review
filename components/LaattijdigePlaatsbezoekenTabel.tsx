"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LaattijdigePlaatsbezoekenKaart,
  type LaattijdigKaartbezoek,
} from "@/components/LaattijdigePlaatsbezoekenKaart";

export type LaattijdigPlaatsbezoekRij = {
  id: number;
  startMomentIso: string;
  naamAdi: string;
  bedrijfsnaam: string;
  inspectielocatie: string;
  latitude: number | null;
  longitude: number | null;
  datum: string;
  tijdstip: string;
  reden: string;
  gemeenschappelijkeDelen: string;
  extraAdresdetails: string;
  aangemeldOp: string;
};

type TimerStatus = {
  soort:
    | "TOEKOMSTIG"
    | "BEGONNEN"
    | "VERLOPEN";
  rijStijl: string;
  label: string;
  toegankelijkLabel: string;
  uren?: string;
  minuten?: string;
};

const EEN_UUR_MS =
  60 * 60 * 1000;

function formatteerGetal(
  waarde: number,
) {
  return String(waarde).padStart(
    2,
    "0",
  );
}

function bepaalTimerStatus(
  startMomentIso: string,
  nu: number,
): TimerStatus {
  const startMoment =
    new Date(startMomentIso)
      .getTime();

  if (
    !Number.isFinite(startMoment)
  ) {
    return {
      soort: "VERLOPEN",
      rijStijl:
        "bg-red-50 hover:bg-red-100/80",
      label: "Ongeldig tijdstip",
      toegankelijkLabel:
        "Ongeldig tijdstip",
    };
  }

  const verschil =
    startMoment - nu;

  if (verschil > 0) {
    const resterendeMinuten =
      Math.max(
        1,
        Math.ceil(
          verschil / 60_000,
        ),
      );

    const uren = Math.floor(
      resterendeMinuten / 60,
    );

    const minuten =
      resterendeMinuten % 60;

    return {
      soort: "TOEKOMSTIG",
      rijStijl:
        "bg-emerald-50 hover:bg-emerald-100/80",
      label: "Tot plaatsbezoek",
      toegankelijkLabel:
        `Nog ${uren} uur en ${minuten} minuten tot het plaatsbezoek`,
      uren:
        formatteerGetal(uren),
      minuten:
        formatteerGetal(
          minuten,
        ),
    };
  }

  const verstreken =
    Math.abs(verschil);

  if (
    verstreken < EEN_UUR_MS
  ) {
    const verstrekenMinuten =
      Math.min(
        59,
        Math.floor(
          verstreken / 60_000,
        ),
      );

    return {
      soort: "BEGONNEN",
      rijStijl:
        "bg-amber-50 hover:bg-amber-100/80",
      label: "Begonnen",
      toegankelijkLabel:
        `Het plaatsbezoek is begonnen. ${verstrekenMinuten} minuten van 1 uur verstreken`,
      uren: "00",
      minuten:
        formatteerGetal(
          verstrekenMinuten,
        ),
    };
  }

  return {
    soort: "VERLOPEN",
    rijStijl:
      "bg-red-50 hover:bg-red-100/80",
    label: "Verlopen",
    toegankelijkLabel:
      "Het plaatsbezoek is langer dan één uur geleden begonnen en is verlopen",
  };
}

function googleMapsUrl(
  rij: LaattijdigPlaatsbezoekRij,
) {
  const heeftCoordinaten =
    typeof rij.latitude ===
      "number" &&
    typeof rij.longitude ===
      "number" &&
    Number.isFinite(
      rij.latitude,
    ) &&
    Number.isFinite(
      rij.longitude,
    );

  const zoekwaarde =
    heeftCoordinaten
      ? `${rij.latitude},${rij.longitude}`
      : rij.inspectielocatie;

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      zoekwaarde,
    )
  );
}

function Timer({
  startMomentIso,
  nu,
}: {
  startMomentIso: string;
  nu: number;
}) {
  const status =
    bepaalTimerStatus(
      startMomentIso,
      nu,
    );

  if (
    status.soort ===
    "VERLOPEN"
  ) {
    return (
      <div
        className="inline-flex min-w-28 items-center justify-center rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-sm font-black text-red-900"
        aria-label={
          status.toegankelijkLabel
        }
      >
        Verlopen
      </div>
    );
  }

  return (
    <div
      className={
        status.soort ===
        "TOEKOMSTIG"
          ? "inline-flex min-w-32 flex-col items-center rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 text-emerald-950"
          : "inline-flex min-w-40 flex-col items-center rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-amber-950"
      }
      aria-label={
        status.toegankelijkLabel
      }
    >
      <span
        className="font-mono text-lg font-black tabular-nums"
        aria-hidden="true"
      >
        {status.uren}
        <span className="timer-knipper">
          :
        </span>
        {status.minuten}

        {status.soort ===
        "BEGONNEN" ? (
          <>
            <span className="mx-1.5">
              /
            </span>
            01
            <span className="timer-knipper">
              :
            </span>
            00
          </>
        ) : null}
      </span>

      <span
        className={
          status.soort ===
          "TOEKOMSTIG"
            ? "mt-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-800"
            : "mt-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800"
        }
      >
        {status.label}
      </span>
    </div>
  );
}

export function LaattijdigePlaatsbezoekenTabel({
  rijen,
  referentieTijd,
}: {
  rijen:
    LaattijdigPlaatsbezoekRij[];
  referentieTijd: number;
}) {
  const [nu, setNu] =
    useState(referentieTijd);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setNu(Date.now());
      }, 1_000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, []);

  const huidigeMinuut =
    Math.floor(nu / 60_000);

  const kaartRijen =
    useMemo(() => {
      const kaartNu =
        huidigeMinuut * 60_000;

      return rijen.flatMap(
        (
          rij,
        ): LaattijdigKaartbezoek[] => {
          const status =
            bepaalTimerStatus(
              rij.startMomentIso,
              kaartNu,
            );

          if (
            status.soort ===
              "VERLOPEN" ||
            typeof rij.latitude !==
              "number" ||
            typeof rij.longitude !==
              "number" ||
            !Number.isFinite(
              rij.latitude,
            ) ||
            !Number.isFinite(
              rij.longitude,
            )
          ) {
            return [];
          }

          return [
            {
              id: rij.id,
              status:
                status.soort ===
                "TOEKOMSTIG"
                  ? "GROEN"
                  : "GEEL",
              naamAdi:
                rij.naamAdi,
              bedrijfsnaam:
                rij.bedrijfsnaam,
              inspectielocatie:
                rij.inspectielocatie,
              datum: rij.datum,
              tijdstip:
                rij.tijdstip,
              latitude:
                rij.latitude,
              longitude:
                rij.longitude,
            },
          ];
        },
      );
    }, [rijen, huidigeMinuut]);

  return (
    <div className="space-y-4">
      <LaattijdigePlaatsbezoekenKaart
        rijen={kaartRijen}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rijen.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-black text-slate-900">
              Nog geen meldingen
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Er werden nog geen
              laattijdige
              plaatsbezoeken
              aangemeld.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1480px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    Timer
                  </th>
                  <th className="px-4 py-3">
                    ADI
                  </th>
                  <th className="px-4 py-3">
                    Bedrijf
                  </th>
                  <th className="px-4 py-3">
                    Inspectielocatie
                  </th>
                  <th className="px-4 py-3">
                    Datum
                  </th>
                  <th className="px-4 py-3">
                    Tijdstip
                  </th>
                  <th className="px-4 py-3">
                    Gemeenschappelijke delen
                  </th>
                  <th className="px-4 py-3">
                    Extra adresdetails
                  </th>
                  <th className="px-4 py-3">
                    Reden
                  </th>
                  <th className="px-4 py-3">
                    Aangemeld op
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rijen.map(
                  (rij) => {
                    const status =
                      bepaalTimerStatus(
                        rij.startMomentIso,
                        nu,
                      );

                    return (
                      <tr
                        key={rij.id}
                        className={`align-top transition-colors ${status.rijStijl}`}
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Timer
                              startMomentIso={
                                rij.startMomentIso
                              }
                              nu={nu}
                            />

                            <a
                              href={googleMapsUrl(
                                rij,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-300 bg-white px-3 text-xs font-black text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-900"
                              aria-label={`Open ${rij.inspectielocatie} in Google Maps`}
                            >
                              Google Maps
                            </a>
                          </div>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {rij.naamAdi}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {
                            rij.bedrijfsnaam
                          }
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {
                            rij.inspectielocatie
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                          {rij.datum}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                          {rij.tijdstip}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                          {
                            rij.gemeenschappelijkeDelen
                          }
                        </td>

                        <td className="max-w-xs whitespace-pre-wrap px-4 py-4 text-slate-700">
                          {rij.extraAdresdetails ||
                            "—"}
                        </td>

                        <td className="max-w-md whitespace-pre-wrap px-4 py-4 text-slate-700">
                          {rij.reden}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {
                            rij.aangemeldOp
                          }
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

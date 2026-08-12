"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LaattijdigePlaatsbezoekenKaart,
  type LaattijdigKaartbezoek,
} from "@/components/LaattijdigePlaatsbezoekenKaart";
import {
  useLaattijdigePlaatsbezoekenKaartQuery,
  useLaattijdigePlaatsbezoekenQuery,
} from "@/hooks/useLaattijdigePlaatsbezoekenQuery";

export type LaattijdigPlaatsbezoekRij = {
  id: number;
  startMomentIso: string;
  naamAdi: string;
  bedrijfsnaam: string;
  aantalAttesten: number;
  laatsteTerreincontrole: string;
  aantalTerreincontroles: number;
  terreincontroleNodig: boolean;
  waarschuwingTerreincontrole: boolean;
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

type KolomSleutel =
  | "timer"
  | "naamAdi"
  | "bedrijfsnaam"
  | "aantalAttesten"
  | "laatsteTerreincontrole"
  | "aantalTerreincontroles"
  | "inspectielocatie"
  | "datum"
  | "tijdstip"
  | "gemeenschappelijkeDelen"
  | "extraAdresdetails"
  | "reden"
  | "aangemeldOp";

type Sorteerrichting =
  | "oplopend"
  | "aflopend";

type TimerStatus = {
  soort:
    | "TOEKOMSTIG"
    | "BEGONNEN"
    | "VERLOPEN";
  label: string;
  detail: string;
};

type Props = {
  rijen?: LaattijdigPlaatsbezoekRij[];
  referentieTijd?: number;
  serverModus?: boolean;
};

const EEN_UUR_MS =
  60 * 60 * 1000;

const kolommen: Array<{
  sleutel: KolomSleutel;
  label: string;
  breedte?: string;
}> = [
  {
    sleutel: "timer",
    label: "Timer",
    breedte: "min-w-48",
  },
  {
    sleutel: "naamAdi",
    label: "ADI",
    breedte: "min-w-48",
  },
  {
    sleutel: "bedrijfsnaam",
    label: "Bedrijf",
    breedte: "min-w-52",
  },
  {
    sleutel: "aantalAttesten",
    label: "Aantal attesten",
    breedte: "min-w-40",
  },
  {
    sleutel:
      "laatsteTerreincontrole",
    label:
      "Datum laatste terreincontrole",
    breedte: "min-w-52",
  },
  {
    sleutel:
      "aantalTerreincontroles",
    label:
      "Aantal terreincontroles",
    breedte: "min-w-48",
  },
  {
    sleutel: "inspectielocatie",
    label: "Inspectielocatie",
    breedte: "min-w-72",
  },
  {
    sleutel: "datum",
    label: "Datum",
    breedte: "min-w-48",
  },
  {
    sleutel: "tijdstip",
    label: "Tijdstip",
    breedte: "min-w-36",
  },
  {
    sleutel:
      "gemeenschappelijkeDelen",
    label:
      "Gemeenschappelijke delen",
    breedte: "min-w-48",
  },
  {
    sleutel:
      "extraAdresdetails",
    label: "Extra adresdetails",
    breedte: "min-w-56",
  },
  {
    sleutel: "reden",
    label: "Reden",
    breedte: "min-w-64",
  },
  {
    sleutel: "aangemeldOp",
    label: "Aangemeld op",
    breedte: "min-w-48",
  },
];

const maanden = [
  ["01", "Januari"],
  ["02", "Februari"],
  ["03", "Maart"],
  ["04", "April"],
  ["05", "Mei"],
  ["06", "Juni"],
  ["07", "Juli"],
  ["08", "Augustus"],
  ["09", "September"],
  ["10", "Oktober"],
  ["11", "November"],
  ["12", "December"],
] as const;

function bepaalTimerStatus(
  startMomentIso: string,
  nu: number,
): TimerStatus {
  const startMoment =
    new Date(
      startMomentIso,
    ).getTime();

  if (
    !Number.isFinite(
      startMoment,
    )
  ) {
    return {
      soort: "VERLOPEN",
      label:
        "Ongeldig tijdstip",
      detail: "",
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

    const uren =
      Math.floor(
        resterendeMinuten /
          60,
      );

    const minuten =
      resterendeMinuten %
      60;

    return {
      soort: "TOEKOMSTIG",
      label:
        "Tot plaatsbezoek",
      detail:
        `${String(uren).padStart(2, "0")}:${String(minuten).padStart(2, "0")}`,
    };
  }

  const verstreken =
    Math.abs(verschil);

  if (
    verstreken <
    EEN_UUR_MS
  ) {
    const minuten =
      Math.min(
        59,
        Math.floor(
          verstreken /
            60_000,
        ),
      );

    return {
      soort: "BEGONNEN",
      label: "Begonnen",
      detail:
        `00:${String(minuten).padStart(2, "0")}`,
    };
  }

  return {
    soort: "VERLOPEN",
    label: "Verlopen",
    detail: "",
  };
}

function Timer({
  rij,
  nu,
}: {
  rij:
    LaattijdigPlaatsbezoekRij;
  nu: number;
}) {
  const status =
    bepaalTimerStatus(
      rij.startMomentIso,
      nu,
    );

  const stijl =
    rij.waarschuwingTerreincontrole
      ? "border-red-300 bg-red-100 text-red-950"
      : status.soort ===
          "BEGONNEN"
        ? "border-amber-300 bg-amber-100 text-amber-950"
        : status.soort ===
            "TOEKOMSTIG"
          ? "border-emerald-300 bg-emerald-100 text-emerald-950"
          : "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <div
      className={`inline-flex min-w-36 flex-col rounded-xl border px-3 py-2 ${stijl}`}
    >
      <span className="text-xs font-black uppercase tracking-wide">
        {status.label}
      </span>

      {status.detail ? (
        <span className="mt-1 font-mono text-lg font-black">
          {status.detail}
        </span>
      ) : null}

      {rij.waarschuwingTerreincontrole ? (
        <span className="mt-1 text-xs font-bold">
          Terreincontrole nodig
        </span>
      ) : null}
    </div>
  );
}

function googleMapsUrl(
  rij:
    LaattijdigPlaatsbezoekRij,
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

function celInhoud(
  rij:
    LaattijdigPlaatsbezoekRij,
  sleutel:
    KolomSleutel,
  nu: number,
): ReactNode {
  if (
    sleutel === "timer"
  ) {
    return (
      <Timer
        rij={rij}
        nu={nu}
      />
    );
  }

  if (
    sleutel ===
    "inspectielocatie"
  ) {
    return (
      <a
        href={googleMapsUrl(
          rij,
        )}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
      >
        {
          rij.inspectielocatie
        }
      </a>
    );
  }

  if (
    sleutel ===
      "aantalAttesten" ||
    sleutel ===
      "aantalTerreincontroles"
  ) {
    return rij[sleutel];
  }

  const waarde =
    rij[sleutel];

  return (
    waarde || "—"
  );
}

export function LaattijdigePlaatsbezoekenTabel({
  rijen = [],
  referentieTijd = 0,
  serverModus = false,
}: Props) {
  const [
    zoeken,
    setZoeken,
  ] = useState("");

  const [
    filters,
    setFilters,
  ] = useState<
    Record<string, string>
  >({});

  const [
    datumJaar,
    setDatumJaar,
  ] = useState("");

  const [
    datumMaand,
    setDatumMaand,
  ] = useState("");

  const [
    sorteerSleutel,
    setSorteerSleutel,
  ] = useState<KolomSleutel>(
    "aangemeldOp",
  );

  const [
    sorteerRichting,
    setSorteerRichting,
  ] = useState<Sorteerrichting>(
    "aflopend",
  );

  const [
    nu,
    setNu,
  ] = useState(
    referentieTijd,
  );

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setNu(
            Date.now(),
          );
        },
        60_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  const serverQuery =
    useLaattijdigePlaatsbezoekenQuery(
      {
        ingeschakeld:
          serverModus,
        zoekterm:
          zoeken,
        filters,
        datumJaar,
        datumMaand,
        sortering: {
          sleutel:
            sorteerSleutel,
          richting:
            sorteerRichting,
        },
      },
    );

  const kaartQuery =
    useLaattijdigePlaatsbezoekenKaartQuery(
      {
        ingeschakeld:
          serverModus,
      },
    );

  const serverReferentieTijd =
    Date.parse(
      serverQuery.overzicht
        ?.referentieTijdIso ??
        "",
    );

  const effectieveNu =
    nu > 0
      ? nu
      : Number.isFinite(
            serverReferentieTijd,
          )
        ? serverReferentieTijd
        : 0;

  const zichtbareRijen =
    serverModus
      ? serverQuery.rijen
      : rijen;

  const lokaleKaartRijen =
    useMemo(() => {
      return rijen.flatMap(
        (
          rij,
        ): LaattijdigKaartbezoek[] => {
          const status =
            bepaalTimerStatus(
              rij.startMomentIso,
              effectieveNu,
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
                rij.waarschuwingTerreincontrole
                  ? "ROOD"
                  : "GROEN",
              knippert:
                status.soort ===
                "BEGONNEN",
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
    }, [
      rijen,
      effectieveNu,
    ]);

  const kaartRijen =
    serverModus
      ? kaartQuery.rijen
      : lokaleKaartRijen;

  const aantalTotaal =
    serverModus
      ? serverQuery
          .aantalTotaal ??
        serverQuery
          .rijen.length
      : rijen.length;

  const wijzigFilter = (
    sleutel:
      KolomSleutel,
    waarde: string,
  ) => {
    setFilters(
      (huidige) => ({
        ...huidige,
        [sleutel]:
          waarde,
      }),
    );
  };

  const sorteerOp = (
    sleutel:
      KolomSleutel,
  ) => {
    if (
      sleutel ===
      sorteerSleutel
    ) {
      setSorteerRichting(
        (huidige) =>
          huidige ===
          "oplopend"
            ? "aflopend"
            : "oplopend",
      );

      return;
    }

    setSorteerSleutel(
      sleutel,
    );
    setSorteerRichting(
      "oplopend",
    );
  };

  const wisFilters = () => {
    setZoeken("");
    setFilters({});
    setDatumJaar("");
    setDatumMaand("");
    setSorteerSleutel(
      "aangemeldOp",
    );
    setSorteerRichting(
      "aflopend",
    );
  };

  const heeftFilters =
    zoeken.trim() !== "" ||
    datumJaar !== "" ||
    datumMaand !== "" ||
    Object.values(
      filters,
    ).some(
      (waarde) =>
        waarde.trim() !== "",
    );

  return (
    <div className="space-y-4">
      <LaattijdigePlaatsbezoekenKaart
        rijen={kaartRijen}
      />

      {serverModus &&
      kaartQuery.fout ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold">
            De kaart kon niet worden bijgewerkt.
          </p>

          <button
            type="button"
            onClick={() => {
              void kaartQuery
                .opnieuwLaden();
            }}
            className="mt-2 font-bold underline"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="block flex-1">
            <span className="sr-only">
              Zoeken
            </span>

            <input
              type="search"
              value={zoeken}
              onChange={(
                gebeurtenis,
              ) => {
                setZoeken(
                  gebeurtenis
                    .target.value,
                );
              }}
              placeholder="Zoeken in laattijdige plaatsbezoeken..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">
              {
                zichtbareRijen.length
              } van{" "}
              {aantalTotaal}
            </span>

            {heeftFilters ? (
              <button
                type="button"
                onClick={
                  wisFilters
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Filters wissen
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[2350px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                {kolommen.map(
                  (kolom) => (
                    <th
                      key={
                        kolom.sleutel
                      }
                      className={`px-3 py-3 align-top ${kolom.breedte ?? ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          sorteerOp(
                            kolom.sleutel,
                          );
                        }}
                        className="flex min-h-10 w-full items-start justify-between gap-2 text-left font-black hover:text-blue-700"
                      >
                        <span>
                          {
                            kolom.label
                          }
                        </span>

                        <span aria-hidden="true">
                          {sorteerSleutel ===
                          kolom.sleutel
                            ? sorteerRichting ===
                                "oplopend"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>

                      {kolom.sleutel ===
                      "datum" ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 normal-case tracking-normal">
                          <select
                            value={
                              datumJaar
                            }
                            onChange={(
                              gebeurtenis,
                            ) => {
                              setDatumJaar(
                                gebeurtenis
                                  .target
                                  .value,
                              );
                            }}
                            aria-label="Filterjaar datum plaatsbezoek"
                            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700"
                          >
                            <option value="">
                              Jaar
                            </option>
                            <option value="2027">
                              2027
                            </option>
                            <option value="2026">
                              2026
                            </option>
                            <option value="2025">
                              2025
                            </option>
                          </select>

                          <select
                            value={
                              datumMaand
                            }
                            onChange={(
                              gebeurtenis,
                            ) => {
                              setDatumMaand(
                                gebeurtenis
                                  .target
                                  .value,
                              );
                            }}
                            aria-label="Filtermaand datum plaatsbezoek"
                            className="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700"
                          >
                            <option value="">
                              Maand
                            </option>

                            {maanden.map(
                              ([
                                waarde,
                                label,
                              ]) => (
                                <option
                                  key={
                                    waarde
                                  }
                                  value={
                                    waarde
                                  }
                                >
                                  {
                                    label
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      ) : (
                        <input
                          type="search"
                          value={
                            filters[
                              kolom
                                .sleutel
                            ] ?? ""
                          }
                          onChange={(
                            gebeurtenis,
                          ) => {
                            wijzigFilter(
                              kolom.sleutel,
                              gebeurtenis
                                .target
                                .value,
                            );
                          }}
                          onClick={(
                            gebeurtenis,
                          ) => {
                            gebeurtenis
                              .stopPropagation();
                          }}
                          placeholder="Filter..."
                          aria-label={`Filter ${kolom.label}`}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500"
                        />
                      )}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {zichtbareRijen.map(
                (rij) => {
                  const status =
                    bepaalTimerStatus(
                      rij.startMomentIso,
                      effectieveNu,
                    );

                  return (
                    <tr
                      key={rij.id}
                      className={`align-top transition-colors ${
                        rij.waarschuwingTerreincontrole
                          ? "bg-red-50 hover:bg-red-100/80"
                          : "bg-emerald-50 hover:bg-emerald-100/80"
                      } ${
                        status.soort ===
                        "BEGONNEN"
                          ? "plaatsbezoek-rij-knipper"
                          : ""
                      }`}
                      title={
                        rij.waarschuwingTerreincontrole
                          ? "Terreincontrole nodig en laatste terreincontrole is langer dan 14 dagen geleden of werd nooit uitgevoerd."
                          : rij.terreincontroleNodig
                            ? "Terreincontrole nodig, maar de laatste terreincontrole is minder dan 14 dagen geleden."
                            : "Terreincontroletarget behaald of geen terreincontrole vereist."
                      }
                    >
                      {kolommen.map(
                        (
                          kolom,
                        ) => (
                          <td
                            key={
                              kolom
                                .sleutel
                            }
                            className="whitespace-pre-wrap px-3 py-4 text-slate-700"
                          >
                            {celInhoud(
                              rij,
                              kolom.sleutel,
                              effectieveNu,
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        {serverModus &&
        serverQuery
          .isEersteKeerLaden ? (
          <div className="px-6 py-16 text-center text-sm font-semibold text-slate-600">
            Laattijdige plaatsbezoeken laden...
          </div>
        ) : null}

        {!serverQuery
          .isEersteKeerLaden &&
        zichtbareRijen.length ===
          0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-black text-slate-900">
              Geen plaatsbezoeken gevonden
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Pas de zoekterm of filters aan.
            </p>
          </div>
        ) : null}

        {serverModus &&
        serverQuery.fout ? (
          <div className="border-t border-red-200 bg-red-50 px-6 py-4 text-sm text-red-900">
            <p className="font-bold">
              {
                serverQuery.fout
              }
            </p>

            <button
              type="button"
              onClick={() => {
                void serverQuery
                  .opnieuwLaden();
              }}
              className="mt-2 font-bold underline"
            >
              Opnieuw proberen
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">
            {
              zichtbareRijen.length
            } van{" "}
            {aantalTotaal} resultaten
          </p>

          {serverModus &&
          serverQuery
            .heeftVolgendePagina ? (
            <button
              type="button"
              disabled={
                serverQuery
                  .isVolgendePaginaLaden
              }
              onClick={() => {
                void serverQuery
                  .laadVolgendePagina();
              }}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {serverQuery
                .isVolgendePaginaLaden
                ? "Resultaten laden..."
                : "Meer resultaten laden"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { BEHEER_TABEL_STIJLEN } from "@/components/BeheerTabelOnderdelen";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LaattijdigePlaatsbezoekenKaart,
  type LaattijdigKaartbezoek,
} from "@/components/LaattijdigePlaatsbezoekenKaart";
import {
  LaattijdigePlaatsbezoekenKaartKolombalk,
} from "@/components/LaattijdigePlaatsbezoekenKaartKolombalk";
import {
  CopyButton,
} from "@/components/CopyButton";
import {
  useLaattijdigePlaatsbezoekenKaartQuery,
  useLaattijdigePlaatsbezoekenQuery,
} from "@/hooks/useLaattijdigePlaatsbezoekenQuery";

export type LaattijdigPlaatsbezoekRij = {
  id: number;
  referentie: string;
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
  | "referentie"
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
  {
    sleutel: "referentie",
    label: "Referentie",
    breedte: "min-w-40",
  },

];

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
    openKaartId,
    setOpenKaartId,
  ] = useState<number | null>(
    null,
  );

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

  const wisFilters = () => {
    setOpenKaartId(null);
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
            className={BEHEER_TABEL_STIJLEN.foutKnop}
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

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <LaattijdigePlaatsbezoekenKaartKolombalk
          kolommen={kolommen}
          filters={filters}
          sorteringen={[
            {
              sleutel: sorteerSleutel,
              richting: sorteerRichting,
            },
          ]}
          onFilterWijzigen={(sleutel, waarde) => {
            wijzigFilter(
              sleutel as KolomSleutel,
              waarde,
            );
            setOpenKaartId(null);
          }}
          onSorteren={(sleutel, richting) => {
            setSorteerSleutel(
              sleutel as KolomSleutel,
            );
            setSorteerRichting(richting);
            setOpenKaartId(null);
          }}
          onSorteringVerwijderen={() => {
            setSorteerSleutel("aangemeldOp");
            setSorteerRichting("aflopend");
            setOpenKaartId(null);
          }}
          onSorteringVerplaatsen={() => {
            void 0;
          }}
        />

        {serverModus &&
        serverQuery.isEersteKeerLaden &&
        zichtbareRijen.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm font-semibold text-slate-600">
            Laattijdige plaatsbezoeken laden...
          </div>
        ) : zichtbareRijen.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-black text-slate-900">
              Geen plaatsbezoeken gevonden
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Pas de zoekterm of filters aan.
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-2 sm:p-3">
            {zichtbareRijen.map((rij) => {
              const geopend =
                openKaartId === rij.id;
              const inhoudId =
                `laattijdig-plaatsbezoek-${rij.id}`;
              const status =
                bepaalTimerStatus(
                  rij.startMomentIso,
                  effectieveNu,
                );

              const titel =
                rij.waarschuwingTerreincontrole
                  ? "Terreincontrole nodig en laatste terreincontrole is langer dan 14 dagen geleden of werd nooit uitgevoerd."
                  : rij.terreincontroleNodig
                    ? "Terreincontrole nodig, maar de laatste terreincontrole is minder dan 14 dagen geleden."
                    : "Terreincontroletarget behaald of geen terreincontrole vereist.";

              const overigeVelden = [
                {
                  label: "Aantal attesten",
                  waarde: String(rij.aantalAttesten),
                },
                {
                  label: "Datum laatste terreincontrole",
                  waarde: rij.laatsteTerreincontrole || "—",
                },
                {
                  label: "Aantal terreincontroles",
                  waarde: String(rij.aantalTerreincontroles),
                },
                {
                  label: "Gemeenschappelijke delen",
                  waarde: rij.gemeenschappelijkeDelen || "—",
                },
                {
                  label: "Extra adresdetails",
                  waarde: rij.extraAdresdetails || "—",
                },
                {
                  label: "Reden",
                  waarde: rij.reden || "—",
                },
                {
                  label: "Aangemeld op",
                  waarde: rij.aangemeldOp || "—",
                },
                {
                  label: "Referentie",
                  waarde: rij.referentie || "—",
                },
              ];

              return (
                <article
                  key={rij.id}
                  className={`overflow-visible rounded-xl border shadow-sm transition ${
                    rij.waarschuwingTerreincontrole
                      ? "border-red-300 bg-red-50"
                      : "border-emerald-200 bg-white"
                  } ${
                    status.soort === "BEGONNEN"
                      ? "plaatsbezoek-rij-knipper"
                      : ""
                  } ${
                    geopend
                      ? "ring-1 ring-blue-200"
                      : "hover:border-blue-300 hover:shadow"
                  }`}
                  title={titel}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={geopend}
                    aria-controls={inhoudId}
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.target.closest(
                          "button, a, input, select, textarea, details, summary",
                        )
                      ) {
                        return;
                      }

                      setOpenKaartId((huidig) =>
                        huidig === rij.id
                          ? null
                          : rij.id,
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.target !== event.currentTarget ||
                        (
                          event.key !== "Enter" &&
                          event.key !== " "
                        )
                      ) {
                        return;
                      }

                      event.preventDefault();
                      setOpenKaartId((huidig) =>
                        huidig === rij.id
                          ? null
                          : rij.id,
                      );
                    }}
                    className="cursor-pointer rounded-xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                              Timer
                            </p>
                            <div className="mt-1">
                              <Timer
                                rij={rij}
                                nu={effectieveNu}
                              />
                            </div>
                          </div>

                          {[
                            {
                              label: "ADI",
                              waarde: rij.naamAdi || "—",
                            },
                            {
                              label: "Bedrijf",
                              waarde: rij.bedrijfsnaam || "—",
                            },
                            {
                              label: "Datum",
                              waarde: rij.datum || "—",
                            },
                            {
                              label: "Tijdstip",
                              waarde: rij.tijdstip || "—",
                            },
                          ].map((veld) => (
                            <div
                              key={veld.label}
                              className="min-w-0"
                            >
                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                {veld.label}
                              </p>
                              <div className="mt-0.5 flex min-w-0 items-start justify-between gap-2 text-sm font-semibold text-slate-900">
                                <span className="min-w-0 flex-1 break-words">
                                  {veld.waarde}
                                </span>
                                <CopyButton
                                  waarde={
                                    veld.waarde === "—"
                                      ? null
                                      : veld.waarde
                                  }
                                  label={`${veld.label} kopiëren`}
                                />
                              </div>
                            </div>
                          ))}

                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                              Inspectielocatie
                            </p>
                            <div className="mt-0.5 flex min-w-0 items-start justify-between gap-2 text-sm font-semibold">
                              <a
                                href={googleMapsUrl(rij)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 flex-1 break-words text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
                              >
                                {rij.inspectielocatie || "—"}
                              </a>
                              <CopyButton
                                waarde={rij.inspectielocatie || null}
                                label="Inspectielocatie kopiëren"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <span
                        aria-hidden="true"
                        className={`mt-1 text-xs font-black text-slate-500 transition-transform ${
                          geopend ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {geopend ? (
                    <div
                      id={inhoudId}
                      className="border-t border-slate-200 px-3 py-3"
                    >
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        Overige gegevens
                      </p>

                      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {overigeVelden.map((veld) => (
                          <div
                            key={veld.label}
                            className="min-w-0"
                          >
                            <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                              {veld.label}
                            </dt>
                            <dd className="mt-0.5 flex min-w-0 items-start justify-between gap-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
                              <span className="min-w-0 flex-1 break-words">
                                {veld.waarde}
                              </span>
                              <CopyButton
                                waarde={
                                  veld.waarde === "—"
                                    ? null
                                    : veld.waarde
                                }
                                label={`${veld.label} kopiëren`}
                              />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  {geopend ? (
                    <div className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-3 py-2">
                      <a
                        href={googleMapsUrl(rij)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center rounded-lg border border-blue-300 bg-white px-3 text-xs font-bold text-blue-800 shadow-sm transition hover:bg-blue-50"
                      >
                        Open in Google Maps
                      </a>

                      {rij.waarschuwingTerreincontrole ? (
                        <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-black text-red-900">
                          Terreincontrole nodig
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {serverModus && serverQuery.fout ? (
          <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-bold">
              {serverQuery.fout}
            </p>
            <button
              type="button"
              onClick={() => {
                void serverQuery.opnieuwLaden();
              }}
              className={BEHEER_TABEL_STIJLEN.foutKnop}
            >
              Opnieuw proberen
            </button>
          </div>
        ) : null}

        <div className={BEHEER_TABEL_STIJLEN.voet}>
          <p className="text-sm font-semibold text-slate-600">
            {zichtbareRijen.length} van {aantalTotaal} resultaten
          </p>

          {serverModus &&
          serverQuery.heeftVolgendePagina ? (
            <button
              type="button"
              disabled={serverQuery.isVolgendePaginaLaden}
              onClick={() => {
                void serverQuery.laadVolgendePagina();
              }}
              className={BEHEER_TABEL_STIJLEN.meerKnop}
            >
              {serverQuery.isVolgendePaginaLaden
                ? "Resultaten laden..."
                : "Meer resultaten laden"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AfwezigeTerreincontroleHerstelKnop from "@/components/AfwezigeTerreincontroleHerstelKnop";
import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";
import {
  TerreincontroleDossierVerwijderKnop,
} from "@/components/TerreincontroleDossierVerwijderKnop";
import TerreincontroleMeerMenu from "@/components/TerreincontroleMeerMenu";
import { OpvolgingRijMeerMenu } from "@/components/OpvolgingRijMeerMenu";
import {
  TerreincontroleFactuurSelect,
  TerreincontroleStatusSelect,
} from "@/components/TerreincontroleSnelleVelden";
import {
  AFWEZIGE_TERREINCONTROLE_DASHBOARDFILTER_EVENT,
  type AfwezigeTerreincontroleDashboardfilter,
  useAfwezigeTerreincontrolesQuery,
} from "@/hooks/useAfwezigeTerreincontrolesQuery";
import {
  useIngeplandeTerreincontrolesQuery,
} from "@/hooks/useIngeplandeTerreincontrolesQuery";
import {
  useTerreincontrolesQuery,
} from "@/hooks/useTerreincontrolesQuery";

export type FilterTabelRij = {
  id: number;
  [sleutel: string]: unknown;
};

export type FilterTabelKolom = {
  sleutel: string;
  label: string;
  type?:
    | "tekst"
    | "datum"
    | "url"
    | "status"
    | "factuur"
    | "acties"
    | "maps";
};

type Props = {
  rijen: FilterTabelRij[];
  kolommen: FilterTabelKolom[];
  modus:
    | "terreincontrole"
    | "planning"
    | "afwezig";
  magBeheren: boolean;
  serverModus?: boolean;
};

type Sortering = {
  sleutel: string;
  richting:
    | "oplopend"
    | "aflopend";
} | null;

type PlanningStatus =
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null;

const maanden = [
  { waarde: "01", label: "Januari" },
  { waarde: "02", label: "Februari" },
  { waarde: "03", label: "Maart" },
  { waarde: "04", label: "April" },
  { waarde: "05", label: "Mei" },
  { waarde: "06", label: "Juni" },
  { waarde: "07", label: "Juli" },
  { waarde: "08", label: "Augustus" },
  { waarde: "09", label: "September" },
  { waarde: "10", label: "Oktober" },
  { waarde: "11", label: "November" },
  { waarde: "12", label: "December" },
];

function tekstWaarde(
  waarde: unknown,
) {
  if (
    waarde === null ||
    waarde === undefined ||
    waarde === ""
  ) {
    return "";
  }

  if (typeof waarde === "boolean") {
    return waarde
      ? "Ja"
      : "Nee";
  }

  return String(waarde);
}

function datumOnderdelen(
  waarde: unknown,
) {
  const tekst =
    tekstWaarde(waarde).trim();

  const belgisch =
    tekst.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    );

  if (belgisch) {
    return {
      dag:
        belgisch[1].padStart(2, "0"),
      maand:
        belgisch[2].padStart(2, "0"),
      jaar: belgisch[3],
      tijdstip:
        Date.UTC(
          Number(belgisch[3]),
          Number(belgisch[2]) - 1,
          Number(belgisch[1]),
        ),
    };
  }

  const datum = new Date(tekst);

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return null;
  }

  return {
    dag:
      String(
        datum.getUTCDate(),
      ).padStart(2, "0"),
    maand:
      String(
        datum.getUTCMonth() + 1,
      ).padStart(2, "0"),
    jaar:
      String(
        datum.getUTCFullYear(),
      ),
    tijdstip:
      datum.getTime(),
  };
}

function formatteerDatum(
  waarde: unknown,
) {
  const onderdelen =
    datumOnderdelen(waarde);

  if (!onderdelen) {
    return tekstWaarde(waarde) || "—";
  }

  return `${onderdelen.dag}/${onderdelen.maand}/${onderdelen.jaar}`;
}

function statusLabel(
  waarde: unknown,
) {
  switch (waarde) {
    case "IN_OPMAAK":
      return "In opmaak";

    case "GEARCHIVEERD_ATTEST":
      return "Gearchiveerd attest";

    case "ACTUEEL_ATTEST":
      return "Actueel attest";

    default:
      return "—";
  }
}

function statusStijl(
  waarde: unknown,
) {
  switch (waarde) {
    case "IN_OPMAAK":
      return "border-amber-200 bg-amber-100 text-amber-900";

    case "GEARCHIVEERD_ATTEST":
      return "border-slate-300 bg-slate-200 text-slate-800";

    case "ACTUEEL_ATTEST":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function mapsUrl(
  waarde: unknown,
) {
  const locatie =
    tekstWaarde(waarde).trim();

  if (!locatie) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(locatie)
  );
}

export function TerreincontroleFilterTabel({
  rijen,
  kolommen,
  modus,
  magBeheren,
  serverModus = false,
}: Props) {
  const router =
    useRouter();

  const [
    zoekterm,
    setZoekterm,
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
    sortering,
    setSortering,
  ] = useState<Sortering>(
    null,
  );

  const gebruiktDossierServer =
    serverModus &&
    modus === "terreincontrole";

  const gebruiktPlanningServer =
    serverModus &&
    modus === "planning";

  const gebruiktAfwezigServer =
    serverModus &&
    modus === "afwezig";

  useEffect(() => {
    if (!gebruiktAfwezigServer) {
      return;
    }

    function ontvangDashboardfilter(
      event: Event,
    ) {
      const filterEvent =
        event as CustomEvent<
          AfwezigeTerreincontroleDashboardfilter
        >;

      const filter =
        filterEvent.detail;

      setZoekterm("");
      setDatumJaar("");
      setDatumMaand("");
      setSortering(null);

      if (
        filter ===
        "factuurVerzonden"
      ) {
        setFilters({
          factuurVerzonden:
            "Ja",
        });

        return;
      }

      if (filter === "rood") {
        setFilters({
          ovamIdRood:
            "true",
        });

        return;
      }

      setFilters({});
    }

    window.addEventListener(
      AFWEZIGE_TERREINCONTROLE_DASHBOARDFILTER_EVENT,
      ontvangDashboardfilter,
    );

    return () => {
      window.removeEventListener(
        AFWEZIGE_TERREINCONTROLE_DASHBOARDFILTER_EVENT,
        ontvangDashboardfilter,
      );
    };
  }, [gebruiktAfwezigServer]);

  const gebruiktServer =
    gebruiktDossierServer ||
    gebruiktPlanningServer ||
    gebruiktAfwezigServer;

  const dossierServerQuery =
    useTerreincontrolesQuery({
      ingeschakeld:
        gebruiktDossierServer,
      zoekterm,
      filters,
      datumJaar,
      datumMaand,
      sortering,
    });

  const planningServerQuery =
    useIngeplandeTerreincontrolesQuery({
      ingeschakeld:
        gebruiktPlanningServer,
      zoekterm,
      filters,
      datumJaar,
      datumMaand,
      sortering,
    });

  const afwezigServerQuery =
    useAfwezigeTerreincontrolesQuery({
      ingeschakeld:
        gebruiktAfwezigServer,
      zoekterm,
      filters,
      datumJaar,
      datumMaand,
      sortering,
    });

  const serverQuery =
    gebruiktAfwezigServer
      ? afwezigServerQuery
      : gebruiktPlanningServer
        ? planningServerQuery
        : dossierServerQuery;

  const bronRijen =
    gebruiktServer
      ? serverQuery.rijen
      : rijen;

  const datumSleutel =
    modus === "terreincontrole"
      ? "datumControle"
      : "datumPlaatsbezoek";

  const beschikbareJaren =
    useMemo(() => {
      if (gebruiktServer) {
        return [
          "2025",
          "2026",
          "2027",
        ];
      }

      return Array.from(
        new Set(
          bronRijen
            .map((rij) =>
              datumOnderdelen(
                rij[datumSleutel],
              )?.jaar,
            )
            .filter(
              (
                jaar,
              ): jaar is string =>
                Boolean(jaar),
            ),
        ),
      ).sort(
        (eerste, tweede) =>
          tweede.localeCompare(
            eerste,
          ),
      );
    }, [
      bronRijen,
      datumSleutel,
      gebruiktServer,
    ]);

  const zichtbareRijen =
    useMemo(() => {
      if (gebruiktServer) {
        return bronRijen;
      }

      const algemeneTerm =
        zoekterm
          .trim()
          .toLocaleLowerCase(
            "nl-BE",
          );

      const resultaat =
        bronRijen.filter((rij) => {
          if (algemeneTerm) {
            const volledigeTekst =
              Object.values(rij)
                .map(tekstWaarde)
                .join(" ")
                .toLocaleLowerCase(
                  "nl-BE",
                );

            if (
              !volledigeTekst.includes(
                algemeneTerm,
              )
            ) {
              return false;
            }
          }

          const datum =
            datumOnderdelen(
              rij[datumSleutel],
            );

          if (
            datumJaar &&
            datum?.jaar !== datumJaar
          ) {
            return false;
          }

          if (
            datumMaand &&
            datum?.maand !== datumMaand
          ) {
            return false;
          }

          return kolommen.every(
            (kolom) => {
              if (
                kolom.type ===
                  "acties" ||
                kolom.type ===
                  "maps"
              ) {
                return true;
              }

              const filter =
                filters[
                  kolom.sleutel
                ]
                  ?.trim()
                  .toLocaleLowerCase(
                    "nl-BE",
                  ) ?? "";

              if (!filter) {
                return true;
              }

              const waarde =
                kolom.type ===
                "status"
                  ? `${tekstWaarde(
                      rij[
                        kolom.sleutel
                      ],
                    )} ${statusLabel(
                      rij[
                        kolom.sleutel
                      ],
                    )}`
                  : tekstWaarde(
                      rij[
                        kolom.sleutel
                      ],
                    );

              return waarde
                .toLocaleLowerCase(
                  "nl-BE",
                )
                .includes(filter);
            },
          );
        });

      if (!sortering) {
        return resultaat;
      }

      const kolom =
        kolommen.find(
          (item) =>
            item.sleutel ===
            sortering.sleutel,
        );

      return [
        ...resultaat,
      ].sort(
        (eerste, tweede) => {
          const eersteWaarde =
            eerste[
              sortering.sleutel
            ];

          const tweedeWaarde =
            tweede[
              sortering.sleutel
            ];

          let vergelijking = 0;

          if (
            kolom?.type ===
            "datum"
          ) {
            vergelijking =
              (
                datumOnderdelen(
                  eersteWaarde,
                )?.tijdstip ?? 0
              ) -
              (
                datumOnderdelen(
                  tweedeWaarde,
                )?.tijdstip ?? 0
              );
          } else {
            vergelijking =
              tekstWaarde(
                eersteWaarde,
              ).localeCompare(
                tekstWaarde(
                  tweedeWaarde,
                ),
                "nl-BE",
                {
                  numeric: true,
                  sensitivity:
                    "base",
                },
              );
          }

          return sortering.richting ===
            "oplopend"
            ? vergelijking
            : -vergelijking;
        },
      );
    }, [
      bronRijen,
      kolommen,
      zoekterm,
      filters,
      datumJaar,
      datumMaand,
      datumSleutel,
      sortering,
      gebruiktServer,
    ]);

  const heeftFilters =
    Boolean(
      zoekterm ||
      datumJaar ||
      datumMaand ||
      Object.values(
        filters,
      ).some(Boolean),
    );

  function wijzigSortering(
    sleutel: string,
  ) {
    setSortering(
      (huidig) => {
        if (
          huidig?.sleutel !==
          sleutel
        ) {
          return {
            sleutel,
            richting:
              "oplopend",
          };
        }

        if (
          huidig.richting ===
          "oplopend"
        ) {
          return {
            sleutel,
            richting:
              "aflopend",
          };
        }

        return null;
      },
    );
  }

  function wisFilters() {
    setZoekterm("");
    setFilters({});
    setDatumJaar("");
    setDatumMaand("");
    setSortering(null);
  }

  function renderActies(
    rij: FilterTabelRij,
  ) {
    if (!magBeheren) {
      return null;
    }

    if (modus === "afwezig") {
      return (
        <AfwezigeTerreincontroleHerstelKnop
          id={rij.id}
        />
      );
    }

    if (modus === "planning") {
      return (
        <TerreincontroleMeerMenu
          id={rij.id}
        />
      );
    }

    return (
      <OpvolgingRijMeerMenu
        bronType="TERREINCONTROLE"
        bronId={rij.id}
        bewerkenHref={`/terreincontroles/${rij.id}/bewerken`}
        kinderen={
          <TerreincontroleDossierVerwijderKnop
            id={rij.id}
          />
        }
      />
    );
  }

  function openRij(
    event:
      | React.MouseEvent<HTMLTableRowElement>
      | React.KeyboardEvent<HTMLTableRowElement>,
    id: number,
  ) {
    const doel =
      event.target as HTMLElement;

    if (
      doel.closest(
        "a, button, input, select, textarea, form, label",
      )
    ) {
      return;
    }

    if (
      "key" in event &&
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    const basis =
      modus === "terreincontrole"
        ? "/terreincontroles"
        : "/terreincontroles-inplannen";

    router.push(
      `${basis}/${id}`,
    );
  }

  function renderCel(
    rij: FilterTabelRij,
    kolom: FilterTabelKolom,
  ) {
    const waarde =
      rij[kolom.sleutel];

    if (
      kolom.type ===
      "acties"
    ) {
      return renderActies(rij);
    }

    if (
      kolom.type === "maps"
    ) {
      const url =
        mapsUrl(
          rij.inspectielocatie,
        );

      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-emerald-700 hover:underline"
        >
          Open kaart
        </a>
      ) : (
        "—"
      );
    }

    if (
      kolom.type === "datum"
    ) {
      return formatteerDatum(
        waarde,
      );
    }

    if (
      kolom.type === "url"
    ) {
      const url =
        tekstWaarde(
          waarde,
        ).trim();

      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-emerald-700 hover:underline"
        >
          Open link
        </a>
      ) : (
        "—"
      );
    }

    if (
      kolom.type ===
      "status"
    ) {
      if (
        magBeheren &&
        modus === "planning"
      ) {
        return (
          <TerreincontroleStatusSelect
            id={rij.id}
            beginwaarde={
              (waarde ??
                null) as PlanningStatus
            }
          />
        );
      }

      return (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStijl(
            waarde,
          )}`}
        >
          {statusLabel(
            waarde,
          )}
        </span>
      );
    }

    if (
      kolom.type ===
      "factuur"
    ) {
      const verzonden =
        Boolean(waarde);

      if (
        magBeheren &&
        modus === "planning"
      ) {
        return (
          <TerreincontroleFactuurSelect
            id={rij.id}
            beginwaarde={
              verzonden
            }
          />
        );
      }

      return verzonden
        ? "Ja"
        : "Nee";
    }

    if (
      modus === "afwezig" &&
      kolom.sleutel ===
        "ovamId" &&
      rij.ovamIdRood === true
    ) {
      return (
        <span className="inline-flex rounded-lg border border-red-300 bg-red-100 px-2.5 py-1 font-black text-red-800">
          {tekstWaarde(
            waarde,
          ) || "—"}
        </span>
      );
    }

    return (
      tekstWaarde(
        waarde,
      ) || "—"
    );
  }

  return (
    <section className={BEHEER_TABEL_STIJLEN.kader}>
      <div className={`${BEHEER_TABEL_STIJLEN.bovenbalk} space-y-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={BEHEER_TABEL_STIJLEN.overzichtTitel}>
              Overzicht
            </h2>

            <p className={BEHEER_TABEL_STIJLEN.aantal}>
              {zichtbareRijen.length} van{" "}
              {gebruiktServer
                ? (
                    serverQuery
                      .aantalTotaal ??
                    "…"
                  )
                : rijen.length}{" "}
              terreincontroles
            </p>
          </div>

          <p className="text-xs font-semibold text-slate-500">
            Klik op een kolomnaam om te sorteren
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
          <label>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Zoeken
            </span>

            <input
              value={
                zoekterm
              }
              onChange={(
                event,
              ) =>
                setZoekterm(
                  event.target
                    .value,
                )
              }
              placeholder="Zoek in alle kolommen..."
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Jaar
            </span>

            <select
              value={
                datumJaar
              }
              onChange={(
                event,
              ) =>
                setDatumJaar(
                  event.target
                    .value,
                )
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">
                Alle jaren
              </option>

              {beschikbareJaren.map(
                (jaar) => (
                  <option
                    key={jaar}
                    value={jaar}
                  >
                    {jaar}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Maand
            </span>

            <select
              value={
                datumMaand
              }
              onChange={(
                event,
              ) =>
                setDatumMaand(
                  event.target
                    .value,
                )
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">
                Alle maanden
              </option>

              {maanden.map(
                (maand) => (
                  <option
                    key={
                      maand.waarde
                    }
                    value={
                      maand.waarde
                    }
                  >
                    {maand.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={
                wisFilters
              }
              disabled={
                !heeftFilters &&
                !sortering
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Filters wissen
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500">
          Klik op een kolomnaam om te sorteren. Gebruik de invoervelden onder de kolomnamen om per kolom te filteren.
        </p>
      </div>

      {gebruiktServer &&
      serverQuery
        .isEersteKeerLaden ? (
        <div className="p-12 text-center text-sm font-semibold text-slate-500">
          Terreincontroles laden...
        </div>
      ) : gebruiktServer &&
        serverQuery.fout ? (
        <div className="space-y-3 p-12 text-center">
          <p className="text-sm font-semibold text-red-700">
            {serverQuery.fout}
          </p>

          <button
            type="button"
            onClick={() => {
              void serverQuery
                .opnieuwLaden();
            }}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : zichtbareRijen.length ===
        0 ? (
        <div className={BEHEER_TABEL_STIJLEN.leeg}>
          Geen terreincontroles gevonden.
        </div>
      ) : (
        <div className={BEHEER_TABEL_STIJLEN.scroll}>
          <table className={BEHEER_TABEL_STIJLEN.tabel}>
            <thead className={BEHEER_TABEL_STIJLEN.kop}>
              <tr>
                {kolommen.map(
                  (kolom) => {
                    const kanSorteren =
                      kolom.type !==
                        "acties" &&
                      kolom.type !==
                        "maps";

                    return (
                      <th
                        key={
                          kolom.sleutel
                        }
                        className={
                          kolom.type ===
                          "acties"
                            ? "sticky right-0 top-0 z-30 whitespace-nowrap border-b border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500"
                            : "whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500"
                        }
                      >
                        {kanSorteren ? (
                          <button
                            type="button"
                            onClick={() =>
                              wijzigSortering(
                                kolom.sleutel,
                              )
                            }
                            className="font-bold hover:text-emerald-700"
                          >
                            {kolom.label}
                            {sortering?.sleutel ===
                            kolom.sleutel
                              ? sortering.richting ===
                                "oplopend"
                                ? " ↑"
                                : " ↓"
                              : ""}
                          </button>
                        ) : (
                          <span className="font-bold">
                            {kolom.label}
                          </span>
                        )}
                      </th>
                    );
                  },
                )}
              </tr>

              <tr className="bg-white">
                {kolommen.map(
                  (kolom) => (
                    <th
                      key={
                        kolom.sleutel
                      }
                      className={
                        kolom.type ===
                        "acties"
                          ? "sticky right-0 z-30 border-b border-l border-slate-200 bg-white px-2 py-2 shadow-[-8px_0_12px_-10px_rgba(15,23,42,0.45)]"
                          : "border-b border-slate-200 px-2 py-2"
                      }
                    >
                      {kolom.type ===
                        "acties" ||
                      kolom.type ===
                        "maps" ? null : (
                        <input
                          value={
                            filters[
                              kolom
                                .sleutel
                            ] ?? ""
                          }
                          onChange={(
                            event,
                          ) =>
                            setFilters(
                              (
                                huidig,
                              ) => ({
                                ...huidig,
                                [kolom.sleutel]:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          aria-label={`Filter ${kolom.label}`}
                          placeholder="Filter..."
                          className="h-8 min-w-28 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />
                      )}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {zichtbareRijen.map(
                (rij) => (
                  <tr
                    key={rij.id}
                    role="link"
                    tabIndex={0}
                    onClick={(event) =>
                      openRij(
                        event,
                        rij.id,
                      )
                    }
                    onKeyDown={(event) =>
                      openRij(
                        event,
                        rij.id,
                      )
                    }
                    className={`group cursor-pointer align-top outline-none transition focus-visible:ring-2 focus-visible:ring-inset ${
                      modus ===
                        "afwezig" &&
                      rij.ovamIdRood ===
                        true
                        ? "bg-red-50 text-red-950 hover:bg-red-100/80 focus-visible:ring-red-600"
                        : "bg-white hover:bg-emerald-50/40 focus-visible:ring-emerald-600"
                    }`}
                  >
                    {kolommen.map(
                      (kolom) => (
                        <td
                          key={
                            kolom.sleutel
                          }
                          className={
                            kolom.type ===
                            "acties"
                              ? `sticky right-0 z-10 has-[details[open]]:z-50 min-w-56 whitespace-nowrap border-l border-slate-200 px-3 py-3 align-top has-[details[open]]:z-[70] ${
                                  modus ===
                                    "afwezig" &&
                                  rij.ovamIdRood ===
                                    true
                                    ? "bg-red-50 group-hover:bg-red-100/80"
                                    : "bg-white group-hover:bg-[#f7fcfa]"
                                }`
                              : `max-w-72 whitespace-pre-wrap break-words px-3 py-2 text-xs ${
                                  modus ===
                                    "afwezig" &&
                                  rij.ovamIdRood ===
                                    true
                                    ? "text-red-950"
                                    : "text-slate-700"
                                }`
                          }
                        >
                          {renderCel(
                            rij,
                            kolom,
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <footer className={BEHEER_TABEL_STIJLEN.voet}>
        <span>
          Klik op een rij om de terreincontrole te bekijken. Klik op een kolomnaam om te sorteren en gebruik de filters om de lijst te verfijnen.
        </span>

        {gebruiktServer &&
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
            className={BEHEER_TABEL_STIJLEN.meerKnop}
          >
            {serverQuery
              .isVolgendePaginaLaden
              ? "Resultaten laden..."
              : "Meer resultaten laden"}
          </button>
        ) : null}
      </footer>
    </section>
  );
}

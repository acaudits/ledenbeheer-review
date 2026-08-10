"use client";

import NextLink from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { DeskcontroleHerstelButton as BasisDeskcontroleHerstelButton } from "@/components/DeskcontroleHerstelButton";
import { DeskcontroleOpmerkingenDialog } from "@/components/DeskcontroleOpmerkingenDialog";
import { DeskcontroleVerwijderButton as BasisDeskcontroleVerwijderButton } from "@/components/DeskcontroleVerwijderButton";
import {
  DeskcontroleSelectievak,
  DeskcontroleStatusSelect,
} from "@/components/DeskcontroleSnelleVelden";
import { useRouter } from "next/navigation";
import { DeskcontroleAfgerondSelectievak } from "@/components/DeskcontroleAfgerondSelectievak";
import {
  DESKCONTROLE_SERVERGEGEVENS_EVENT,
  useDeskcontrolesQuery,
  type DeskcontroleDashboardFilter,
  type DeskcontroleServergegevens,
} from "@/hooks/useDeskcontrolesQuery";

export type DeskcontroleKolom = {
  sleutel: string;
  label: string;
  type?:
    | "tekst"
    | "url"
    | "badge"
    | "boolean"
    | "datum"
    | "opmerking";
};

export type DeskcontroleRij = {
  id: number;
  [sleutel: string]: string | number | null;
};

type DeskcontrolesTabelProps = {
  rijen: DeskcontroleRij[];
  kolommen: DeskcontroleKolom[];
  modus?: "actief" | "verwijderd";
  magBeheren: boolean;
  serverModus?: boolean;
};

type Sortering = {
  sleutel: string;
  richting: "oplopend" | "aflopend";
} | null;

type DatumFilter = {
  jaar: string;
  maand: string;
};
type DashboardFilter = {
  sleutel: DeskcontroleDashboardFilter;
  label: string;
  ids: number[];
};

const DASHBOARD_FILTER_EVENT =
  "deskcontrole-dashboard-filter";


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

function ontleedDatum(waarde: string | number | null) {
  const tekst = String(waarde ?? "").trim();

  const gevonden = tekst.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (!gevonden) {
    return null;
  }

  const dag = gevonden[1].padStart(2, "0");
  const maand = gevonden[2].padStart(2, "0");
  const jaar = gevonden[3];

  return {
    dag,
    maand,
    jaar,
    tijdstip: Date.UTC(
      Number(jaar),
      Number(maand) - 1,
      Number(dag),
    ),
  };
}

function badgeStijl(tekst: string) {
  if (
    tekst === "Geactualiseerd" ||
    tekst === "Afgerond" ||
    tekst === "Ja"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    tekst === "In opmaak" ||
    tekst === "Opvolging"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (tekst === "Nieuwe controle") {
    return "bg-sky-100 text-sky-800";
  }

  return "bg-slate-100 text-slate-700";
}
type DeadlineInformatie = {
  label: string;
  stijl: string;
};

function bepaalDeadlineInformatie(
  waarde: string | number | null,
  status: string,
): DeadlineInformatie | null {
  const datum = ontleedDatum(waarde);

  if (!datum) {
    return null;
  }

  const genormaliseerdeStatus = status
    .trim()
    .toLocaleLowerCase("nl-BE");

  if (
    genormaliseerdeStatus ===
      "geactualiseerd" ||
    genormaliseerdeStatus ===
      "afgerond"
  ) {

    return {
      label: "Afgehandeld",
      stijl:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  const vandaag = new Date();

  const vandaagTijdstip = Date.UTC(
    vandaag.getFullYear(),
    vandaag.getMonth(),
    vandaag.getDate(),
  );

  const verschilInDagen = Math.ceil(
    (datum.tijdstip - vandaagTijdstip) /
      (1000 * 60 * 60 * 24),
  );

  if (verschilInDagen < 0) {
    const aantalDagen = Math.abs(
      verschilInDagen,
    );

    return {
      label:
        aantalDagen === 1
          ? "1 dag verstreken"
          : `${aantalDagen} dagen verstreken`,
      stijl:
        "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (verschilInDagen === 0) {
    return {
      label: "Vandaag",
      stijl:
        "border-red-300 bg-red-100 text-red-900",
    };
  }

  if (verschilInDagen <= 7) {
    return {
      label:
        verschilInDagen === 1
          ? "Nog 1 dag"
          : `Nog ${verschilInDagen} dagen`,
      stijl:
        "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: `Nog ${verschilInDagen} dagen`,
    stijl:
      "border-sky-200 bg-sky-50 text-sky-800",
  };
}

type BeheerLinkProps =
  ComponentProps<typeof NextLink> & {
    magBeheren: boolean;
  };

function BeheerLink({
  magBeheren,
  ...props
}: BeheerLinkProps) {
  const bestemming =
    typeof props.href === "string"
      ? props.href
      : "";

  const isWijziglink =
    bestemming === "/deskcontroles/nieuw" ||
    /^\/deskcontroles\/\d+\/bewerken$/.test(
      bestemming,
    );

  if (!magBeheren && isWijziglink) {
    return null;
  }

  return <NextLink {...props} />;
}

type BeheerVerwijderButtonProps =
  ComponentProps<
    typeof BasisDeskcontroleVerwijderButton
  > & {
    magBeheren: boolean;
  };

function BeheerVerwijderButton({
  magBeheren,
  ...props
}: BeheerVerwijderButtonProps) {
  if (!magBeheren) {
    return null;
  }

  return (
    <BasisDeskcontroleVerwijderButton
      {...props}
    />
  );
}

type BeheerHerstelButtonProps =
  ComponentProps<
    typeof BasisDeskcontroleHerstelButton
  > & {
    magBeheren: boolean;
  };

function BeheerHerstelButton({
  magBeheren,
  ...props
}: BeheerHerstelButtonProps) {
  if (!magBeheren) {
    return null;
  }

  return (
    <BasisDeskcontroleHerstelButton
      {...props}
    />
  );
}

export function DeskcontrolesTabel({
  rijen,
  kolommen,
  modus = "actief",
  magBeheren,
  serverModus = false,
}: DeskcontrolesTabelProps) {
  const router = useRouter();

  const [zoekterm, setZoekterm] = useState("");

  const [filters, setFilters] = useState<
    Record<string, string>
  >({});

  const [datumFilters, setDatumFilters] = useState<
    Record<string, DatumFilter>
  >({});

  const [
    actieveFilterSleutel,
    setActieveFilterSleutel,
  ] = useState<string | null>(null);

  const [sortering, setSortering] =
    useState<Sortering>(null);
  const [
    dashboardFilter,
    setDashboardFilter,
  ] = useState<
    DashboardFilter | null
  >(null);
  const serverQuery =
    useDeskcontrolesQuery({
      ingeschakeld: serverModus,
      zoekterm,
      filters,
      datumFilters,
      sortering,
      dashboardFilter:
        dashboardFilter?.sleutel ?? null,
    });

  const bronRijen =
    serverModus
      ? serverQuery.rijen
      : rijen;

  const totaalAantal =
    serverModus
      ? (
          serverQuery.aantalTotaal ??
          bronRijen.length
        )
      : rijen.length;

  const serverFout =
    serverModus
      ? serverQuery.fout
      : null;

  const toontEersteServerlading =
    serverModus &&
    serverQuery.isEersteKeerLaden &&
    bronRijen.length === 0;

  const toontServerFoutZonderRijen =
    serverModus &&
    Boolean(serverFout) &&
    bronRijen.length === 0;

  useEffect(() => {
    if (!serverModus) {
      return;
    }

    const detail:
      DeskcontroleServergegevens = {
      aantalTotaal:
        serverQuery.aantalTotaal,
      dashboard:
        serverQuery.dashboard,
    };

    window.dispatchEvent(
      new CustomEvent(
        DESKCONTROLE_SERVERGEGEVENS_EVENT,
        { detail },
      ),
    );
  }, [
    serverModus,
    serverQuery.aantalTotaal,
    serverQuery.dashboard,
  ]);

  useEffect(() => {
    function verwerkDashboardFilter(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<
          DashboardFilter | null
        >;

      setDashboardFilter(
        customEvent.detail,
      );
    }

    window.addEventListener(
      DASHBOARD_FILTER_EVENT,
      verwerkDashboardFilter,
    );

    return () => {
      window.removeEventListener(
        DASHBOARD_FILTER_EVENT,
        verwerkDashboardFilter,
      );
    };
  }, []);


  const actieveKolom =
    kolommen.find(
      (kolom) =>
        kolom.sleutel === actieveFilterSleutel,
    ) ?? null;

  const heeftFilters =
    dashboardFilter !== null ||
    zoekterm.trim().length > 0 ||
    Object.values(filters).some((waarde) =>
      waarde.trim(),
    ) ||
    Object.values(datumFilters).some(
      (filter) => filter.jaar || filter.maand,
    );


  const beschikbareJaren = useMemo(() => {
    if (
      !actieveKolom ||
      actieveKolom.type !== "datum"
    ) {
      return [];
    }

    if (serverModus) {
      return ["2025", "2026", "2027"];
    }

    const jaren = new Set<string>();

    for (const rij of rijen) {
      const datum = ontleedDatum(
        rij[actieveKolom.sleutel],
      );

      if (datum) {
        jaren.add(datum.jaar);
      }
    }

    return Array.from(jaren).sort(
      (a, b) => Number(b) - Number(a),
    );
  }, [
    actieveKolom,
    rijen,
    serverModus,
  ]);

  const zichtbareRijen = useMemo(() => {
    if (serverModus) {
      return bronRijen;
    }

    const algemeneZoekterm = zoekterm
      .trim()
      .toLocaleLowerCase("nl-BE");

  const dashboardIds =
    dashboardFilter
      ? new Set(
          dashboardFilter.ids,
        )
      : null;

  const resultaat = rijen.filter((rij) => {
    if (
      dashboardIds &&
      !dashboardIds.has(
        Number(rij.id),
      )
    ) {
      return false;
    }

      if (
        algemeneZoekterm &&

        !kolommen.some((kolom) =>
          String(rij[kolom.sleutel] ?? "")
            .toLocaleLowerCase("nl-BE")
            .includes(algemeneZoekterm),
        )
      ) {
        return false;
      }

      return kolommen.every((kolom) => {
        if (kolom.type === "datum") {
          const filter =
            datumFilters[kolom.sleutel];

          if (!filter?.jaar && !filter?.maand) {
            return true;
          }

          const datum = ontleedDatum(
            rij[kolom.sleutel],
          );

          if (!datum) {
            return false;
          }

          if (
            filter.jaar &&
            datum.jaar !== filter.jaar
          ) {
            return false;
          }

          if (
            filter.maand &&
            datum.maand !== filter.maand
          ) {
            return false;
          }

          return true;
        }

        const filter =
          filters[kolom.sleutel]
            ?.trim()
            .toLocaleLowerCase("nl-BE") ?? "";

        if (!filter) {
          return true;
        }

        return String(rij[kolom.sleutel] ?? "")
          .toLocaleLowerCase("nl-BE")
          .includes(filter);
      });
    });

    if (!sortering) {
      return resultaat;
    }

    return [...resultaat].sort(
      (eerste, tweede) => {
        const kolom = kolommen.find(
          (item) =>
            item.sleutel === sortering.sleutel,
        );

        const eersteWaarde =
          eerste[sortering.sleutel];

        const tweedeWaarde =
          tweede[sortering.sleutel];

        const eersteLeeg =
          eersteWaarde === null ||
          String(eersteWaarde).trim() === "";

        const tweedeLeeg =
          tweedeWaarde === null ||
          String(tweedeWaarde).trim() === "";

        if (eersteLeeg && tweedeLeeg) {
          return 0;
        }

        if (eersteLeeg) {
          return 1;
        }

        if (tweedeLeeg) {
          return -1;
        }

        let vergelijking = 0;

        if (kolom?.type === "datum") {
          vergelijking =
            (ontleedDatum(
              eersteWaarde,
            )?.tijdstip ?? 0) -
            (ontleedDatum(
              tweedeWaarde,
            )?.tijdstip ?? 0);
        } else {
          vergelijking = String(
            eersteWaarde,
          ).localeCompare(
            String(tweedeWaarde),
            "nl-BE",
            {
              numeric: true,
              sensitivity: "base",
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
    rijen,
    serverModus,
    kolommen,
    zoekterm,
    filters,
    datumFilters,
    sortering,
    dashboardFilter,
  ]);


  function wijzigSortering(sleutel: string) {
    setSortering((huidige) => {
      if (
        !huidige ||
        huidige.sleutel !== sleutel
      ) {
        return {
          sleutel,
          richting: "oplopend",
        };
      }

      if (huidige.richting === "oplopend") {
        return {
          sleutel,
          richting: "aflopend",
        };
      }

      return null;
    });
  }

  function wisFilter(sleutel: string) {
    setFilters((huidige) => {
      const volgende = { ...huidige };
      delete volgende[sleutel];
      return volgende;
    });

    setDatumFilters((huidige) => {
      const volgende = { ...huidige };
      delete volgende[sleutel];
      return volgende;
    });
  }

  function wisAlles() {
    setZoekterm("");
    setFilters({});
    setDatumFilters({});
    setSortering(null);
    setActieveFilterSleutel(null);
    setDashboardFilter(null);

    window.dispatchEvent(
      new CustomEvent(
        DASHBOARD_FILTER_EVENT,
        {
          detail: null,
        },
      ),
    );
  }

  function isInteractiefElement(
    doel: EventTarget | null,
  ) {
    if (!(doel instanceof Element)) {
      return false;
    }

    return Boolean(
      doel.closest(
        [
          "a",
          "button",
          "input",
          "select",
          "textarea",
          "label",
          '[role="button"]',
          "[data-voorkom-rij-navigatie]",
        ].join(","),
      ),
    );
  }

  function openDeskcontrole(
    id: number,
  ) {
    router.push(
      `/deskcontroles/${id}`,
    );
  }


  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-950">
            Overzicht
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {zichtbareRijen.length} van {totaalAantal}{" "}
            deskcontroles
          </p>

          {dashboardFilter ? (
            <p className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Filter: {
                dashboardFilter.label
              }
            </p>
          ) : null}

        </div>

        <div className="flex w-full gap-2 sm:max-w-xl">
          <input
            type="search"
            value={zoekterm}
            onChange={(event) =>
              setZoekterm(event.target.value)
            }
            placeholder="Zoeken in deskcontroles..."
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />

          {(heeftFilters || sortering) && (
            <button
              type="button"
              onClick={wisAlles}
              className="h-10 shrink-0 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Alles wissen
            </button>
          )}
        </div>
      </div>

      {actieveKolom && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Filter op {actieveKolom.label}
              </p>

              {actieveKolom.type === "datum" ? (
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <select
                    value={
                      datumFilters[
                        actieveKolom.sleutel
                      ]?.jaar ?? ""
                    }
                    onChange={(event) =>
                      setDatumFilters(
                        (huidige) => ({
                          ...huidige,
                          [actieveKolom.sleutel]: {
                            jaar: event.target.value,
                            maand:
                              huidige[
                                actieveKolom.sleutel
                              ]?.maand ?? "",
                          },
                        }),
                      )
                    }
                    className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">
                      Alle jaren
                    </option>

                    {beschikbareJaren.map((jaar) => (
                      <option
                        key={jaar}
                        value={jaar}
                      >
                        {jaar}
                      </option>
                    ))}
                  </select>

                  <select
                    value={
                      datumFilters[
                        actieveKolom.sleutel
                      ]?.maand ?? ""
                    }
                    onChange={(event) =>
                      setDatumFilters(
                        (huidige) => ({
                          ...huidige,
                          [actieveKolom.sleutel]: {
                            jaar:
                              huidige[
                                actieveKolom.sleutel
                              ]?.jaar ?? "",
                            maand: event.target.value,
                          },
                        }),
                      )
                    }
                    className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none"
                  >
                    <option value="">
                      Alle maanden
                    </option>

                    {maanden.map((maand) => (
                      <option
                        key={maand.waarde}
                        value={maand.waarde}
                      >
                        {maand.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="search"
                  autoFocus
                  value={
                    filters[
                      actieveKolom.sleutel
                    ] ?? ""
                  }
                  onChange={(event) =>
                    setFilters((huidige) => ({
                      ...huidige,
                      [actieveKolom.sleutel]:
                        event.target.value,
                    }))
                  }
                  placeholder={`Filter op ${actieveKolom.label.toLowerCase()}...`}
                  className="mt-1.5 h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  wisFilter(actieveKolom.sleutel)
                }
                className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Wissen
              </button>

              <button
                type="button"
                onClick={() =>
                  setActieveFilterSleutel(null)
                }
                className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Gereed
              </button>
            </div>
          </div>
        </div>
      )}

      {toontEersteServerlading ? (
        <div
          className="px-6 py-16 text-center"
          role="status"
        >
          <div className="mx-auto size-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <h3 className="mt-4 text-lg font-bold text-slate-950">
            Deskcontroles laden
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            De eerste resultaten worden opgehaald.
          </p>
        </div>
      ) : toontServerFoutZonderRijen ? (
        <div
          className="px-6 py-16 text-center"
          role="alert"
        >
          <h3 className="text-lg font-bold text-red-800">
            Deskcontroles konden niet worden geladen
          </h3>

          <p className="mt-2 text-sm text-red-700">
            {serverFout}
          </p>

          <button
            type="button"
            onClick={() => {
              void serverQuery.opnieuwLaden();
            }}
            className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : zichtbareRijen.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <h3 className="text-lg font-bold text-slate-950">
            {modus === "verwijderd"
              ? "Geen verwijderde deskcontroles"
              : "Geen deskcontroles gevonden"}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {modus === "verwijderd"
              ? "Er zijn momenteel geen verwijderde deskcontroles."
              : "Pas de filters aan of voeg een nieuwe deskcontrole toe."}
          </p>

          <BeheerLink
                magBeheren={magBeheren}
            href={
              modus === "verwijderd"
                ? "/deskcontroles"
                : "/deskcontroles/nieuw"
            }
            className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            {modus === "verwijderd"
              ? "Terug naar actieve deskcontroles"
              : "Nieuwe deskcontrole"}
          </BeheerLink>
        </div>
      ) : (
        <>
          <div className="max-h-[calc(100vh-240px)] overflow-auto">
            <table className="w-full min-w-max text-left">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                <tr>
                  {kolommen.map(
                    (kolom, index) => {
                      const actief =
                        sortering?.sleutel ===
                        kolom.sleutel;

                      const heeftFilter =
                        Boolean(
                          filters[
                            kolom.sleutel
                          ]?.trim(),
                        ) ||
                        Boolean(
                          datumFilters[
                            kolom.sleutel
                          ]?.jaar ||
                            datumFilters[
                              kolom.sleutel
                            ]?.maand,
                        );

                      return (
                        <th
                          key={kolom.sleutel}
                          className={`border-b border-slate-200 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 ${
                            index === 0
                              ? "sticky left-0 z-30 bg-slate-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                wijzigSortering(
                                  kolom.sleutel,
                                )
                              }
                              title={`Sorteren op ${kolom.label}`}
                              className={`inline-flex items-center gap-1 rounded-md px-1 py-1 hover:bg-white hover:text-slate-900 ${
                                actief
                                  ? "text-emerald-800"
                                  : ""
                              }`}
                            >
                              {kolom.label}

                              <span aria-hidden="true">
                                {!actief
                                  ? "↕"
                                  : sortering.richting ===
                                      "oplopend"
                                    ? "↑"
                                    : "↓"}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setActieveFilterSleutel(
                                  (huidige) =>
                                    huidige ===
                                    kolom.sleutel
                                      ? null
                                      : kolom.sleutel,
                                )
                              }
                              title={`Filter op ${kolom.label}`}
                              aria-label={`Filter op ${kolom.label}`}
                              className={`flex size-7 items-center justify-center rounded-md ${
                                heeftFilter
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "text-slate-400 hover:bg-white hover:text-slate-700"
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="size-4"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4 5h16l-6.2 7.1v5.3l-3.6 1.8v-7.1L4 5Z"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </th>
                      );
                    },
                  )}

                  <th className="sticky right-0 top-0 z-30 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-xs font-bold uppercase text-slate-500">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {zichtbareRijen.map((rij) => (
                  <tr
                    key={rij.id}
                    tabIndex={0}
                    title="Klik om de deskcontrole en non-conformiteiten te bekijken"
                    onClick={(event) => {
                      if (
                        isInteractiefElement(
                          event.target,
                        )
                      ) {
                        return;
                      }

                      openDeskcontrole(
                        Number(rij.id),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        isInteractiefElement(
                          event.target,
                        )
                      ) {
                        return;
                      }

                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        openDeskcontrole(
                          Number(rij.id),
                        );
                      }
                    }}
                    className={`group cursor-pointer outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
                      String(
                        rij.status ?? "",
                      )
                        .trim()
                        .toLocaleLowerCase(
                          "nl-BE",
                        ) ===
                      "afgerond"
                        ? "[&>td]:!bg-emerald-100 [&>td]:!text-emerald-950 hover:[&>td]:!bg-emerald-200 focus-visible:[&>td]:!bg-emerald-200"
                        : "bg-white hover:bg-emerald-50/40 focus-visible:bg-emerald-50"
                    }`}

                  >

                    {kolommen.map(
                      (kolom, index) => {
                        const tekst = String(
                          rij[kolom.sleutel] ?? "",
                        ).trim();

                        const isOpmerking =
                          kolom.type ===
                            "opmerking" ||
                          kolom.sleutel ===
                            "opmerkingen";
                        const isDeadline =
                          kolom.sleutel ===
                            "deadlineSanctie" ||
                          kolom.sleutel ===
                            "deadlineCorrectie";

                        const deadlineInformatie =
                          isDeadline && tekst
                            ? bepaalDeadlineInformatie(
                                rij[kolom.sleutel],
                                String(rij.status ?? ""),
                              )
                            : null;
                        const isStatus =
                          kolom.sleutel === "status";
                        const isAfgerond =
                          kolom.sleutel ===
                          "afgerond";

                        const isSnelSelectievak =
                          kolom.sleutel ===
                            "mailSanctieVerzonden" ||
                          kolom.sleutel ===
                            "mailCorrectieVerzonden" ||
                          kolom.sleutel ===
                            "voorwaardelijkeOpheffing";


                        return (
                          <td
                            key={kolom.sleutel}
                            className={`max-w-72 px-3 py-2 text-xs text-slate-700 ${
                              index === 0
                                ? "sticky left-0 z-10 bg-white font-semibold text-slate-950 group-hover:bg-[#f7fcfa]"
                                : ""
                            }`}
                          >
                            {isAfgerond &&
                            modus === "actief" &&
                            magBeheren ? (
                              <DeskcontroleAfgerondSelectievak
                                id={Number(rij.id)}
                                afgerond={
                                  tekst
                                    .toLocaleLowerCase(
                                      "nl-BE",
                                    ) ===
                                  "ja"
                                }
                                label={`Deskcontrole ${rij.id} als afgerond markeren`}
                              />
                            ) : isStatus &&
                              modus === "actief" &&
                            magBeheren ? (
                              <DeskcontroleStatusSelect
                                id={Number(rij.id)}
                                waarde={tekst}
                              />
                            ) : isSnelSelectievak &&

                              modus === "actief" &&
                            magBeheren ? (
                              <DeskcontroleSelectievak
                                id={Number(rij.id)}
                                veld={
                                  kolom.sleutel as
                                    | "mailSanctieVerzonden"
                                    | "mailCorrectieVerzonden"
                                    | "voorwaardelijkeOpheffing"
                                }
                                waarde={String(rij[kolom.sleutel] ?? "")}
                                label={`${kolom.label} voor deskcontrole ${rij.id}`}
                              />
                            ) : isOpmerking &&
                              modus === "actief" &&
                            magBeheren ? (
                              <DeskcontroleOpmerkingenDialog
                                id={Number(rij.id)}
                                tekst={tekst}
                              />
                            ) : deadlineInformatie ? (
                              <div className="flex min-w-36 flex-col items-start gap-1">
                                <span className="font-semibold text-slate-800">
                                  {tekst}
                                </span>

                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${deadlineInformatie.stijl}`}
                                >
                                  {deadlineInformatie.label}
                                </span>
                              </div>
                            ) : kolom.type === "url" && tekst ? (
                              <a
                                href={tekst}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 font-bold text-sky-800 hover:bg-sky-100"
                              >
                                Open ↗
                              </a>
                            ) : kolom.type === "badge" ||
                              kolom.type === "boolean" ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 font-bold ${badgeStijl(
                                  tekst || "Nee",
                                )}`}
                              >
                                {tekst || "Nee"}
                              </span>
                            ) : (
                              <span
                                title={tekst || undefined}
                                className="block max-w-64 truncate"
                              >
                                {tekst || "—"}
                              </span>
                            )}

                          </td>
                        );
                      },
                    )}

                    <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-3 py-3 align-top group-hover:bg-[#f7fcfa]">
                      {modus === "verwijderd" ? (
                        <BeheerHerstelButton
                          magBeheren={magBeheren}
                          id={Number(rij.id)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <BeheerLink
                magBeheren={magBeheren}
                            href={`/deskcontroles/${rij.id}/bewerken`}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Bewerken
                          </BeheerLink>

                          <BeheerVerwijderButton
                            magBeheren={magBeheren}
                            id={Number(rij.id)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            {serverModus &&
            serverFout &&
            bronRijen.length > 0 ? (
              <div
                role="alert"
                className="mb-3 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {serverFout} De reeds geladen resultaten blijven zichtbaar.
                </span>

                <button
                  type="button"
                  onClick={() => {
                    void serverQuery.opnieuwLaden();
                  }}
                  className="w-fit rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
                >
                  Opnieuw proberen
                </button>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Klik op een rij om de deskcontrole
                en non-conformiteiten te bekijken. Klik
                op een kolomnaam om te sorteren en
                op het filtericoon om te filteren.
              </span>

              {serverModus &&
              serverQuery.heeftVolgendePagina ? (
                <button
                  type="button"
                  disabled={
                    serverQuery.isVolgendePaginaLaden
                  }
                  onClick={() => {
                    void serverQuery
                      .laadVolgendePagina();
                  }}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {serverQuery.isVolgendePaginaLaden
                    ? "Resultaten laden..."
                    : "Meer resultaten laden"}
                </button>
              ) : null}
            </div>
          </footer>

        </>
      )}
    </section>
  );
}

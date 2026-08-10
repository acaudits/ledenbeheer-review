"use client";

import { VerwijderButton as BasisVerwijderButton } from "@/components/CertificaatStatusButton";
import { CopyButton } from "@/components/CopyButton";
import { OpmerkingDialog } from "@/components/OpmerkingDialog";
import { usePersoonscertificatenQuery } from "@/hooks/usePersoonscertificatenQuery";
import { useProcescertificatenQuery } from "@/hooks/useProcescertificatenQuery";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ComponentProps } from "react";

export type CertificaatKolom = {
  sleutel: string;
  label: string;
  type?: "tekst" | "url" | "badge" | "datum" | "statusbol";
};

export type CertificaatRij = {
  id: number;
  [sleutel: string]: string | number | null;
};

type CertificatenTabelProps = {
  rijen: CertificaatRij[];
  kolommen: CertificaatKolom[];
  zoekPlaceholder: string;
  legeTitel: string;
  legeBeschrijving: string;
  nieuwHref: string;
  nieuwTekst: string;
  bewerkBasisHref: string;
  detailBasisHref?: string;
  soort: "persoon" | "proces";
  magBeheren: boolean;
  serverModus?: boolean;
};

type Sorteerrichting =
  | "oplopend"
  | "aflopend";

type Sortering = {
  sleutel: string;
  richting: Sorteerrichting;
} | null;

type DatumFilter = {
  jaar: string;
  maand: string;
};

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

function isDatumKolom(kolom: CertificaatKolom) {
  return (
    kolom.type === "datum" ||
    kolom.sleutel === "uitgereiktOp"
  );
}

const targetStatusOpties = [
  {
    waarde: "GRIJS",
    label: "Grijs — geen attesten",
  },
  {
    waarde: "ROOD",
    label: "Rood — geen controles",
  },
  {
    waarde: "GEEL",
    label: "Geel — target gedeeltelijk behaald",
  },
  {
    waarde: "GROEN",
    label: "Groen — targets behaald",
  },
];

function statusbolPresentatie(waarde: string) {
  switch (waarde.toUpperCase()) {
    case "GROEN":
      return {
        label: "Targets behaald",
        stijl:
          "bg-emerald-500 ring-emerald-200",
      };

    case "GEEL":
      return {
        label: "Targets gedeeltelijk behaald",
        stijl:
          "bg-amber-400 ring-amber-200",
      };

    case "ROOD":
      return {
        label: "Geen deskcontrole of terreincontrole uitgevoerd",
        stijl:
          "bg-red-500 ring-red-200",
      };

    default:
      return {
        label: "Geen attesten",
        stijl:
          "bg-slate-400 ring-slate-200",
      };
  }
}

function statusRijStijl(
  waarde: string | number | null,
) {
  switch (String(waarde ?? "").toUpperCase()) {
    case "GROEN":
      return "bg-emerald-50/70 hover:bg-emerald-100/60";

    case "GEEL":
      return "bg-amber-50/80 hover:bg-amber-100/60";

    case "ROOD":
      return "bg-red-50/75 hover:bg-red-100/60";

    case "GRIJS":
      return "bg-slate-50/90 hover:bg-slate-100/80";

    default:
      return "bg-white hover:bg-emerald-50/35";
  }
}

function ontleedDatum(
  waarde: string | number | null,
) {
  const tekst = String(waarde ?? "").trim();

  if (!tekst) {
    return null;
  }

  const belgischeDatum = tekst.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (belgischeDatum) {
    const dag = belgischeDatum[1].padStart(
      2,
      "0",
    );

    const maand = belgischeDatum[2].padStart(
      2,
      "0",
    );

    const jaar = belgischeDatum[3];

    const tijdstip = Date.UTC(
      Number(jaar),
      Number(maand) - 1,
      Number(dag),
    );

    return {
      dag,
      maand,
      jaar,
      tijdstip,
    };
  }

  const isoDatum = new Date(tekst);

  if (!Number.isNaN(isoDatum.getTime())) {
    return {
      dag: String(
        isoDatum.getUTCDate(),
      ).padStart(2, "0"),
      maand: String(
        isoDatum.getUTCMonth() + 1,
      ).padStart(2, "0"),
      jaar: String(isoDatum.getUTCFullYear()),
      tijdstip: isoDatum.getTime(),
    };
  }

  return null;
}

function naamVanMaand(maand: string) {
  return (
    maanden.find(
      (optie) => optie.waarde === maand,
    )?.label ?? maand
  );
}

type BeheerLinkProps =
  ComponentProps<typeof NextLink> & {
    magBeheren: boolean;
    nieuwHref: string;
    bewerkBasisHref: string;
  };

function BeheerLink({
  magBeheren,
  nieuwHref,
  bewerkBasisHref,
  ...props
}: BeheerLinkProps) {
  const bestemming =
    typeof props.href === "string"
      ? props.href
      : "";

  const isBeheerlink =
    bestemming === nieuwHref ||
    bestemming.startsWith(
      `${bewerkBasisHref}/`,
    );

  if (!magBeheren && isBeheerlink) {
    return null;
  }

  return <NextLink {...props} />;
}

type BeheerVerwijderButtonProps =
  ComponentProps<typeof BasisVerwijderButton> & {
    magBeheren: boolean;
  };

function BeheerVerwijderButton({
  magBeheren,
  ...props
}: BeheerVerwijderButtonProps) {
  if (!magBeheren) {
    return null;
  }

  return <BasisVerwijderButton {...props} />;
}

export function CertificatenTabel({
  rijen,
  kolommen,
  zoekPlaceholder,
  legeTitel,
  legeBeschrijving,
  nieuwHref,
  nieuwTekst,
  bewerkBasisHref,
  detailBasisHref,
  soort,
  magBeheren,
  serverModus = false,
}: CertificatenTabelProps) {
  const router = useRouter();

  const [zoekterm, setZoekterm] = useState("");

  const [kolomFilters, setKolomFilters] =
    useState<Record<string, string>>({});

  const [datumFilters, setDatumFilters] =
    useState<Record<string, DatumFilter>>({});

  const [
    actieveFilterSleutel,
    setActieveFilterSleutel,
  ] = useState<string | null>(null);

  const [sortering, setSortering] =
    useState<Sortering>(null);

  const persoonscertificatenQuery =
    usePersoonscertificatenQuery({
      ingeschakeld:
        serverModus &&
        soort === "persoon",
      zoekterm,
      kolomFilters,
      datumFilters,
      sortering,
    });

  const procescertificatenQuery =
    useProcescertificatenQuery({
      ingeschakeld:
        serverModus &&
        soort === "proces",
      zoekterm,
      kolomFilters,
      datumFilters,
      sortering,
    });

  const serverQuery =
    soort === "proces"
      ? procescertificatenQuery
      : persoonscertificatenQuery;

  const bronRijen =
    serverModus
      ? serverQuery.rijen
      : rijen;

  const totaalAantal =
    serverModus
      ? (
          serverQuery
            .aantalTotaal ??
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
    Boolean(serverFout) &&
    bronRijen.length === 0;

  const actieveFilterKolom =
    kolommen.find(
      (kolom) =>
        kolom.sleutel === actieveFilterSleutel,
    ) ?? null;

  const targetStatusKolom =
    kolommen.find(
      (kolom) => kolom.type === "statusbol",
    ) ?? null;

  const actiefTargetStatus =
    targetStatusKolom
      ? kolomFilters[
          targetStatusKolom.sleutel
        ] ?? ""
      : "";

  const zichtbareKolommen =
    kolommen.filter(
      (kolom) => kolom.type !== "statusbol",
    );

  const aantalTekstFilters = Object.values(
    kolomFilters,
  ).filter((waarde) => waarde.trim()).length;

  const aantalDatumFilters = Object.values(
    datumFilters,
  ).filter(
    (filter) => filter.jaar || filter.maand,
  ).length;

  const aantalActieveKolomFilters =
    aantalTekstFilters + aantalDatumFilters;

  const heeftActieveFilters =
    zoekterm.trim().length > 0 ||
    aantalActieveKolomFilters > 0;

  const filterSuggesties = useMemo(() => {
    if (
      !actieveFilterKolom ||
      isDatumKolom(actieveFilterKolom)
    ) {
      return [];
    }

    const waarden = new Set<string>();

    for (const rij of bronRijen) {
      const waarde = String(
        rij[actieveFilterKolom.sleutel] ?? "",
      ).trim();

      if (waarde) {
        waarden.add(waarde);
      }
    }

    return Array.from(waarden)
      .sort((eerste, tweede) =>
        eerste.localeCompare(tweede, "nl-BE", {
          numeric: true,
          sensitivity: "base",
        }),
      )
      .slice(0, 250);
  }, [bronRijen, actieveFilterKolom]);

  const beschikbareJaren = useMemo(() => {
    if (
      !actieveFilterKolom ||
      !isDatumKolom(actieveFilterKolom)
    ) {
      return [];
    }

    if (
      serverModus &&
      soort === "proces"
    ) {
      return ["2025", "2026", "2027"];
    }

    const jaren = new Set<string>();

    for (const rij of bronRijen) {
      const datum = ontleedDatum(
        rij[actieveFilterKolom.sleutel],
      );

      if (datum) {
        jaren.add(datum.jaar);
      }
    }

    return Array.from(jaren).sort(
      (eerste, tweede) =>
        Number(tweede) - Number(eerste),
    );
  }, [
    bronRijen,
    actieveFilterKolom,
    serverModus,
    soort,
  ]);

  const gefilterdeEnGesorteerdeRijen =
    useMemo(() => {
      if (serverModus) {
        return bronRijen;
      }

      const algemeneZoekwaarde = zoekterm
        .trim()
        .toLocaleLowerCase("nl-BE");

      const gefilterd = bronRijen.filter((rij) => {
        const voldoetAanAlgemeneZoekterm =
          !algemeneZoekwaarde ||
          kolommen.some((kolom) => {
            const waarde = String(
              rij[kolom.sleutel] ?? "",
            ).toLocaleLowerCase("nl-BE");

            return waarde.includes(
              algemeneZoekwaarde,
            );
          });

        if (!voldoetAanAlgemeneZoekterm) {
          return false;
        }

        return kolommen.every((kolom) => {
          if (isDatumKolom(kolom)) {
            const filter =
              datumFilters[kolom.sleutel];

            if (
              !filter?.jaar &&
              !filter?.maand
            ) {
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

          const filterWaarde =
            kolomFilters[kolom.sleutel]
              ?.trim()
              .toLocaleLowerCase("nl-BE") ??
            "";

          if (!filterWaarde) {
            return true;
          }

          const celWaarde = String(
            rij[kolom.sleutel] ?? "",
          ).toLocaleLowerCase("nl-BE");

          return celWaarde.includes(
            filterWaarde,
          );
        });
      });

      if (!sortering) {
        return gefilterd;
      }

      const gesorteerd = [...gefilterd];

      const sorteerKolom = kolommen.find(
        (kolom) =>
          kolom.sleutel === sortering.sleutel,
      );

      gesorteerd.sort((eerste, tweede) => {
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

        if (
          sorteerKolom &&
          isDatumKolom(sorteerKolom)
        ) {
          const eersteDatum =
            ontleedDatum(eersteWaarde);

          const tweedeDatum =
            ontleedDatum(tweedeWaarde);

          vergelijking =
            (eersteDatum?.tijdstip ?? 0) -
            (tweedeDatum?.tijdstip ?? 0);
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
      });

      return gesorteerd;
    }, [
      serverModus,
      bronRijen,
      kolommen,
      zoekterm,
      kolomFilters,
      datumFilters,
      sortering,
    ]);

  function wijzigKolomFilter(
    sleutel: string,
    waarde: string,
  ) {
    setKolomFilters((huidigeFilters) => ({
      ...huidigeFilters,
      [sleutel]: waarde,
    }));
  }

  function wijzigDatumFilter(
    sleutel: string,
    veld: keyof DatumFilter,
    waarde: string,
  ) {
    setDatumFilters((huidigeFilters) => ({
      ...huidigeFilters,
      [sleutel]: {
        jaar:
          huidigeFilters[sleutel]?.jaar ?? "",
        maand:
          huidigeFilters[sleutel]?.maand ??
          "",
        [veld]: waarde,
      },
    }));
  }

  function wisKolomFilter(sleutel: string) {
    setKolomFilters((huidigeFilters) => {
      const nieuweFilters = {
        ...huidigeFilters,
      };

      delete nieuweFilters[sleutel];

      return nieuweFilters;
    });

    setDatumFilters((huidigeFilters) => {
      const nieuweFilters = {
        ...huidigeFilters,
      };

      delete nieuweFilters[sleutel];

      return nieuweFilters;
    });
  }

  function wisAlleFilters() {
    setZoekterm("");
    setKolomFilters({});
    setDatumFilters({});
    setActieveFilterSleutel(null);
  }

  function wijzigSortering(sleutel: string) {
    setSortering((huidigeSortering) => {
      if (
        !huidigeSortering ||
        huidigeSortering.sleutel !== sleutel
      ) {
        return {
          sleutel,
          richting: "oplopend",
        };
      }

      if (
        huidigeSortering.richting ===
        "oplopend"
      ) {
        return {
          sleutel,
          richting: "aflopend",
        };
      }

      return null;
    });
  }

  function openOfSluitFilter(
    sleutel: string,
  ) {
    setActieveFilterSleutel((huidige) =>
      huidige === sleutel ? null : sleutel,
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${
        magBeheren
          ? ""
          : "[&_th:last-child]:hidden [&_td:last-child]:hidden"
      }`}
    >
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Overzicht
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totaalAantal} geregistreerd ·{" "}
              {
                gefilterdeEnGesorteerdeRijen.length
              }{" "}
              {serverModus ? "geladen" : "getoond"}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
            {targetStatusKolom && (
              <div className="relative sm:w-64">
                <label
                  htmlFor="target-status-filter"
                  className="sr-only"
                >
                  Filter op targetstatus
                </label>

                <select
                  id="target-status-filter"
                  value={actiefTargetStatus}
                  onChange={(event) =>
                    wijzigKolomFilter(
                      targetStatusKolom.sleutel,
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                >
                  <option value="">
                    Alle targetstatussen
                  </option>

                  {targetStatusOpties.map(
                    (optie) => (
                      <option
                        key={optie.waarde}
                        value={optie.waarde}
                      >
                        {optie.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

            <div className="relative flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              >
                <path
                  d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              <input
                type="search"
                value={zoekterm}
                onChange={(event) =>
                  setZoekterm(event.target.value)
                }
                placeholder={zoekPlaceholder}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />

              {zoekterm && (
                <button
                  type="button"
                  onClick={() => setZoekterm("")}
                  aria-label="Zoekopdracht wissen"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {(heeftActieveFilters ||
              sortering) && (
              <button
                type="button"
                onClick={() => {
                  wisAlleFilters();
                  setSortering(null);
                }}
                className="h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                Alles wissen
              </button>
            )}
          </div>
        </div>
      </div>

      {actieveFilterKolom && (
        <div className="border-b border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Filter op{" "}
                {actieveFilterKolom.label}
              </p>

              {isDatumKolom(
                actieveFilterKolom,
              ) ? (
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`jaar-${actieveFilterKolom.sleutel}`}
                      className="sr-only"
                    >
                      Jaar
                    </label>

                    <select
                      id={`jaar-${actieveFilterKolom.sleutel}`}
                      value={
                        datumFilters[
                          actieveFilterKolom
                            .sleutel
                        ]?.jaar ?? ""
                      }
                      onChange={(event) =>
                        wijzigDatumFilter(
                          actieveFilterKolom.sleutel,
                          "jaar",
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
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
                  </div>

                  <div>
                    <label
                      htmlFor={`maand-${actieveFilterKolom.sleutel}`}
                      className="sr-only"
                    >
                      Maand
                    </label>

                    <select
                      id={`maand-${actieveFilterKolom.sleutel}`}
                      value={
                        datumFilters[
                          actieveFilterKolom
                            .sleutel
                        ]?.maand ?? ""
                      }
                      onChange={(event) =>
                        wijzigDatumFilter(
                          actieveFilterKolom.sleutel,
                          "maand",
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
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
                </div>
              ) : (
                <div className="relative mt-1.5">
                  <input
                    id={`filter-${actieveFilterKolom.sleutel}`}
                    type="search"
                    list={`filter-opties-${actieveFilterKolom.sleutel}`}
                    value={
                      kolomFilters[
                        actieveFilterKolom.sleutel
                      ] ?? ""
                    }
                    onChange={(event) =>
                      wijzigKolomFilter(
                        actieveFilterKolom.sleutel,
                        event.target.value,
                      )
                    }
                    placeholder={`Typ of kies een waarde voor ${actieveFilterKolom.label.toLowerCase()}...`}
                    autoFocus
                    className="h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />

                  <datalist
                    id={`filter-opties-${actieveFilterKolom.sleutel}`}
                  >
                    {filterSuggesties.map(
                      (waarde) => (
                        <option
                          key={waarde}
                          value={waarde}
                        />
                      ),
                    )}
                  </datalist>
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() =>
                  wisKolomFilter(
                    actieveFilterKolom.sleutel,
                  )
                }
                className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Wissen
              </button>

              <button
                type="button"
                onClick={() =>
                  setActieveFilterSleutel(null)
                }
                className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Gereed
              </button>
            </div>
          </div>
        </div>
      )}

      {aantalActieveKolomFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Actieve filters:
          </span>

          {kolommen.map((kolom) => {
            const tekstFilter =
              kolomFilters[
                kolom.sleutel
              ]?.trim();

            const datumFilter =
              datumFilters[kolom.sleutel];

            if (
              !tekstFilter &&
              !datumFilter?.jaar &&
              !datumFilter?.maand
            ) {
              return null;
            }

            let filterTekst =
              tekstFilter ?? "";

            if (isDatumKolom(kolom)) {
              const delen: string[] = [];

              if (datumFilter?.jaar) {
                delen.push(datumFilter.jaar);
              }

              if (datumFilter?.maand) {
                delen.push(
                  naamVanMaand(
                    datumFilter.maand,
                  ),
                );
              }

              filterTekst = delen.join(" · ");
            }

            return (
              <button
                key={kolom.sleutel}
                type="button"
                onClick={() =>
                  wisKolomFilter(kolom.sleutel)
                }
                title={`${kolom.label}-filter verwijderen`}
                className="inline-flex max-w-xs items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <span className="truncate">
                  {kolom.label}: {filterTekst}
                </span>

                <span aria-hidden="true">×</span>
              </button>
            );
          })}
        </div>
      )}

      {toontEersteServerlading ? (
        <div
          className="flex flex-col items-center justify-center px-6 py-16 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="size-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <h3 className="mt-5 text-lg font-bold text-slate-950">
            Persoonscertificaten laden
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            De eerste resultaten worden opgehaald.
          </p>
        </div>
      ) : toontServerFoutZonderRijen ? (
        <div
          className="flex flex-col items-center justify-center px-6 py-16 text-center"
          role="alert"
        >
          <div className="flex size-16 items-center justify-center rounded-3xl bg-red-100 text-2xl text-red-700">
            !
          </div>

          <h3 className="mt-5 text-xl font-bold text-slate-950">
            Persoonscertificaten konden niet worden geladen
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {serverFout}
          </p>

          <button
            type="button"
            onClick={() => {
              void serverQuery.opnieuwLaden();
            }}
            className="mt-6 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : gefilterdeEnGesorteerdeRijen.length ===
      0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-8"
              aria-hidden="true"
            >
              <path
                d="M5 7h14M5 12h14M5 17h8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h3 className="mt-5 text-xl font-bold text-slate-950">
            {heeftActieveFilters
              ? "Geen resultaten gevonden"
              : legeTitel}
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {heeftActieveFilters
              ? "Er zijn geen resultaten die aan de gekozen filters voldoen."
              : legeBeschrijving}
          </p>

          {heeftActieveFilters ? (
            <button
              type="button"
              onClick={wisAlleFilters}
              className="mt-6 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Alle filters wissen
            </button>
          ) : (
            <BeheerLink
              magBeheren={magBeheren}
              nieuwHref={nieuwHref}
              bewerkBasisHref={bewerkBasisHref}
              href={nieuwHref}
              className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              + {nieuwTekst}
            </BeheerLink>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left">
              <thead className="bg-slate-50">
                <tr>
                  {zichtbareKolommen.map(
                    (kolom, index) => {
                      const heeftTekstFilter =
                        Boolean(
                          kolomFilters[
                            kolom.sleutel
                          ]?.trim(),
                        );

                      const heeftDatumFilter =
                        Boolean(
                          datumFilters[
                            kolom.sleutel
                          ]?.jaar ||
                            datumFilters[
                              kolom.sleutel
                            ]?.maand,
                        );

                      const heeftFilter =
                        heeftTekstFilter ||
                        heeftDatumFilter;

                      const isGesorteerd =
                        sortering?.sleutel ===
                        kolom.sleutel;

                      const ariaSort =
                        isGesorteerd
                          ? sortering.richting ===
                            "oplopend"
                            ? "ascending"
                            : "descending"
                          : "none";

                      return (
                        <th
                          key={kolom.sleutel}
                          aria-sort={ariaSort}
                          className={`border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                            index === 0
                              ? "sticky left-0 z-10 bg-slate-50"
                              : ""
                          }`}
                        >
                          <div className="flex min-w-max items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                wijzigSortering(
                                  kolom.sleutel,
                                )
                              }
                              title={`Sorteer op ${kolom.label}`}
                              className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1 transition hover:bg-white hover:text-slate-900 ${
                                isGesorteerd
                                  ? "bg-white text-emerald-800 shadow-sm"
                                  : ""
                              }`}
                            >
                              <span>
                                {kolom.label}
                              </span>

                              <span
                                aria-hidden="true"
                                className="text-sm"
                              >
                                {!isGesorteerd
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
                                openOfSluitFilter(
                                  kolom.sleutel,
                                )
                              }
                              aria-label={`Filter instellen voor ${kolom.label}`}
                              title={`Filter op ${kolom.label}`}
                              className={`flex size-7 items-center justify-center rounded-lg border transition ${
                                heeftFilter
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                  : "border-transparent text-slate-400 hover:border-slate-300 hover:bg-white hover:text-slate-700"
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
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </th>
                      );
                    },
                  )}

                  <th className="sticky right-0 z-10 border-b border-slate-200 bg-slate-50 px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {gefilterdeEnGesorteerdeRijen.map(
                  (rij) => (
                    <tr
                      key={rij.id}
                      tabIndex={
                        detailBasisHref
                          ? 0
                          : undefined
                      }
                      role={
                        detailBasisHref
                          ? "link"
                          : undefined
                      }
                      aria-label={
                        detailBasisHref
                          ? `Open detail van ${
                              rij.naamPersoon ??
                              rij.bedrijf ??
                              `record ${rij.id}`
                            }`
                          : undefined
                      }
                      title={
                        targetStatusKolom
                          ? String(
                              rij[
                                `${targetStatusKolom.sleutel}Toelichting`
                              ] ?? "",
                            )
                          : undefined
                      }
                      onClick={(event) => {
                        if (
                          !detailBasisHref ||
                          (
                            event.target instanceof
                              Element &&
                            event.target.closest(
                              "a, button, input, select, textarea, [role='button']",
                            )
                          )
                        ) {
                          return;
                        }

                        router.push(
                          `${detailBasisHref}/${rij.id}`,
                        );
                      }}
                      onKeyDown={(event) => {
                        if (
                          !detailBasisHref ||
                          (
                            event.key !==
                              "Enter" &&
                            event.key !== " "
                          )
                        ) {
                          return;
                        }

                        if (
                          event.target !==
                          event.currentTarget
                        ) {
                          return;
                        }

                        event.preventDefault();

                        router.push(
                          `${detailBasisHref}/${rij.id}`,
                        );
                      }}
                      className={`group ${
                        targetStatusKolom
                          ? statusRijStijl(
                              rij[
                                targetStatusKolom.sleutel
                              ],
                            )
                          : "bg-white hover:bg-emerald-50/35"
                      } ${
                        detailBasisHref
                          ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                          : ""
                      }`}
                    >
                      {zichtbareKolommen.map(
                        (kolom, index) => {
                          const origineleWaarde =
                            rij[kolom.sleutel];

                          const tekst = String(
                            origineleWaarde ?? "",
                          ).trim();

                          const weergegevenTekst =
                            tekst || "—";

                          return (
                            <td
                              key={kolom.sleutel}
                              className={`max-w-96 px-5 py-3 text-sm text-slate-700 ${
                                index === 0
                                  ? "sticky left-0 z-10 bg-inherit font-semibold text-slate-950"
                                  : ""
                              }`}
                            >
                              <div className="flex min-w-max items-center gap-2">
                                {kolom.sleutel ===
                                "opmerking" ? (
                                  magBeheren ? (
                                    <OpmerkingDialog
                                      id={rij.id}
                                      soort={soort}
                                      tekst={tekst}
                                    />
                                  ) : (
                                    <span
                                      title={
                                        tekst ||
                                        undefined
                                      }
                                      className={`max-w-72 truncate ${
                                        !tekst
                                          ? "text-slate-400"
                                          : ""
                                      }`}
                                    >
                                      {tekst || "—"}
                                    </span>
                                  )
                                ) : kolom.type ===
                                    "statusbol" ? (
                                  (() => {
                                    const presentatie =
                                      statusbolPresentatie(
                                        tekst,
                                      );

                                    const toelichting =
                                      String(
                                        rij[
                                          `${kolom.sleutel}Toelichting`
                                        ] ??
                                          presentatie.label,
                                      );

                                    return (
                                      <span
                                        title={toelichting}
                                        aria-label={toelichting}
                                        className={`inline-block size-3 shrink-0 rounded-full ring-4 ${presentatie.stijl}`}
                                      >
                                        <span className="sr-only">
                                          {
                                            presentatie.label
                                          }
                                        </span>
                                      </span>
                                    );
                                  })()
                                ) : kolom.type ===
                                    "url" &&
                                  tekst ? (
                                  <a
                                    href={tekst}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
                                  >
                                    Open link
                                    <span aria-hidden="true">
                                      ↗
                                    </span>
                                  </a>
                                ) : kolom.type ===
                                    "badge" &&
                                  tekst ? (
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                                      tekst ===
                                      "Eenmanszaak"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {tekst}
                                  </span>
                                ) : (
                                  <span
                                    title={
                                      tekst ||
                                      undefined
                                    }
                                    className={`max-w-72 truncate ${
                                      !tekst
                                        ? "text-slate-400"
                                        : ""
                                    }`}
                                  >
                                    {
                                      weergegevenTekst
                                    }
                                  </span>
                                )}

                                {kolom.sleutel !==
                                  "opmerking" &&
                                  kolom.type !==
                                    "statusbol" && (
                                    <CopyButton
                                      waarde={
                                        tekst || null
                                      }
                                    />
                                  )}
                              </div>
                            </td>
                          );
                        },
                      )}

                      <td className="sticky right-0 z-10 bg-inherit px-5 py-3 text-right">
                        <div className="flex min-w-max items-center justify-end gap-2">
                          <BeheerLink
                            magBeheren={magBeheren}
                            nieuwHref={nieuwHref}
                            bewerkBasisHref={bewerkBasisHref}
                            href={`${bewerkBasisHref}/${rij.id}/bewerken`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="size-4"
                              aria-hidden="true"
                            >
                              <path
                                d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Zm9-9 4 4"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>

                            Bewerken
                          </BeheerLink>

                          <BeheerVerwijderButton
                            magBeheren={magBeheren}
                            id={rij.id}
                            soort={soort}
                            naam={String(
                              rij.naamPersoon ??
                                rij.bedrijf ??
                                `record ${rij.id}`,
                            )}
                          />
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong className="text-slate-700">
                {
                  gefilterdeEnGesorteerdeRijen.length
                }
              </strong>{" "}
              van{" "}
              <strong className="text-slate-700">
                {totaalAantal}
              </strong>{" "}
              resultaten
            </p>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              {serverFout && (
                <div
                  className="flex flex-wrap items-center gap-2 text-xs text-red-700"
                  role="alert"
                >
                  <span>{serverFout}</span>

                  <button
                    type="button"
                    onClick={() => {
                      void serverQuery.opnieuwLaden();
                    }}
                    className="font-bold underline underline-offset-2"
                  >
                    Opnieuw proberen
                  </button>
                </div>
              )}

              {serverModus &&
              serverQuery.heeftVolgendePagina ? (
                <button
                  type="button"
                  disabled={
                    serverQuery.isVolgendePaginaLaden
                  }
                  onClick={() => {
                    void serverQuery.laadVolgendePagina();
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {serverQuery.isVolgendePaginaLaden
                    ? "Meer laden…"
                    : "Meer resultaten laden"}
                </button>
              ) : (
                <p className="text-xs">
                  Klik op een kolomnaam om te sorteren en
                  op het filtericoon om te filteren.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

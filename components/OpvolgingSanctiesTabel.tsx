"use client";

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  BeheerFilterPaneel,
  BeheerLegeToestand,
  BeheerTabelKader,
  BeheerTabelVoet,
} from "@/components/BeheerTabelOnderdelen";
import {
  OpvolgingSanctieActies,
} from "@/components/OpvolgingSanctieActies";
import {
  OpvolgingSanctieAfronding,
} from "@/components/OpvolgingSanctieAfronding";
import {
  OpvolgingSanctieKaartKolombalk,
} from "@/components/OpvolgingSanctieKaartKolombalk";
import {
  CopyButton,
} from "@/components/CopyButton";
import {
  beschikbareBeheerJaren,
  filterEnSorteerBeheerRijen,
  type BeheerDatumFilter,
  type BeheerTabelKolom,
  type BeheerTabelRij,
  type BeheerTabelSortering,
} from "@/lib/beheer-tabel";

type Auditeur = {
  id: number;
  email: string;
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
};

export type OpvolgingSanctieTabelRij =
  BeheerTabelRij & {
    id: number;
    bron: string;
    auditeur: string;
    naamAdi: string;
    opvolgingAfgerondTekst:
      string;
    opvolgingAfgerond:
      boolean;
    datumAfgerond: string;
    datumAfgerondInvoer:
      string;
    afgerondDoor: string;
    afgerondDoorGebruikerId:
      number | null;
    auditeurGebruikerId:
      number | null;
    linkAttest: string;
    attestnummer: string;
    reden: string;
    bedrijfsnaam: string;
    ovamId: string;
    datumVaststelling: string;
    opmerkingen: string;
    ncCategorie: string;
    sanctieBegindatum: string;
    sanctieEinddatum: string;
    sanctieDoorgezet: string;
    redenNietDoorzetten: string;
    magBeheren: boolean;
  };

type Props = {
  rijen:
    OpvolgingSanctieTabelRij[];
  auditeurs: Auditeur[];
};

const kolommen:
  BeheerTabelKolom[] = [
    {
      sleutel: "bron",
      label: "Bron",
    },
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel: "naamAdi",
      label: "Naam ADI",
    },
    {
      sleutel:
        "opvolgingAfgerondTekst",
      label:
        "Opvolging afgerond",
      type: "badge",
    },
    {
      sleutel: "datumAfgerond",
      label: "Datum afgerond",
      type: "datum",
    },
    {
      sleutel: "afgerondDoor",
      label: "Afgerond door",
    },
    {
      sleutel: "linkAttest",
      label: "Link attest",
      type: "url",
    },
    {
      sleutel: "attestnummer",
      label: "Attestnummer",
    },
    {
      sleutel: "reden",
      label: "Reden",
    },
    {
      sleutel: "bedrijfsnaam",
      label: "Bedrijfsnaam",
    },
    {
      sleutel: "ovamId",
      label: "OVAM-ID",
    },
    {
      sleutel:
        "datumVaststelling",
      label:
        "Datum vaststelling",
      type: "datum",
    },
    {
      sleutel: "opmerkingen",
      label: "Opmerkingen",
    },
    {
      sleutel: "ncCategorie",
      label: "NC-categorie",
      type: "badge",
    },
    {
      sleutel:
        "sanctieDoorgezet",
      label:
        "Sanctie doorgezet",
      type: "badge",
    },
    {
      sleutel:
        "redenNietDoorzetten",
      label:
        "Reden niet doorzetten",
    },
    {
      sleutel:
        "sanctieBegindatum",
      label:
        "Sanctie begindatum",
      type: "datum",
    },
    {
      sleutel:
        "sanctieEinddatum",
      label:
        "Sanctie einddatum",
      type: "datum",
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

function toonWaarde(
  waarde:
    | string
    | number
    | boolean
    | null
    | undefined,
) {
  const tekst =
    String(waarde ?? "").trim();

  return tekst || "—";
}

function OpvolgingSanctieKaartWaarde({
  label,
  waarde,
  weergave,
  breed = false,
  sterk = false,
}: {
  label: string;
  waarde:
    | string
    | number
    | boolean
    | null
    | undefined;
  weergave?: ReactNode;
  breed?: boolean;
  sterk?: boolean;
}) {
  const kopieerWaarde =
    waarde === null ||
    waarde === undefined
      ? ""
      : String(waarde).trim();

  const getoondeWaarde =
    weergave ?? kopieerWaarde;

  return (
    <div
      className={
        breed
          ? "sm:col-span-2 lg:col-span-3"
          : ""
      }
    >
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd
        className={`mt-1 flex items-start gap-1.5 break-words text-sm text-slate-900 ${
          sterk
            ? "font-semibold"
            : "font-medium"
        }`}
      >
        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
          {getoondeWaarde || "—"}
        </span>

        <CopyButton
          waarde={
            kopieerWaarde &&
            kopieerWaarde !== "—"
              ? kopieerWaarde
              : null
          }
          label={`${label} kopiëren`}
        />
      </dd>
    </div>
  );
}

export function OpvolgingSanctiesTabel({
  rijen,
  auditeurs,
}: Props) {
  const [
    openKaartId,
    setOpenKaartId,
  ] = useState<number | null>(
    null,
  );

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
    datumFilters,
    setDatumFilters,
  ] = useState<
    Record<
      string,
      BeheerDatumFilter
    >
  >({});

  const [
    sortering,
    setSortering,
  ] =
    useState<BeheerTabelSortering>(
      null,
    );

  const [
    actieveFilterSleutel,
    setActieveFilterSleutel,
  ] = useState<
    string | null
  >(null);

  const actieveKolom =
    kolommen.find(
      (kolom) =>
        kolom.sleutel ===
        actieveFilterSleutel,
    ) ?? null;

  const hoofdKolomSleutels =
    new Set([
      "auditeur",
      "naamAdi",
      "opvolgingAfgerondTekst",
      "attestnummer",
      "datumVaststelling",
      "ncCategorie",
    ]);

  const hoofdKolommen =
    kolommen.filter((kolom) =>
      hoofdKolomSleutels.has(
        kolom.sleutel,
      ),
    );

  const meerKolomSleutels =
    new Set([
      "reden",
      "opmerkingen",
      "redenNietDoorzetten",
    ]);

  const overigeKolommen = [
    ...kolommen.filter(
      (kolom) =>
        !hoofdKolomSleutels.has(
          kolom.sleutel,
        ) &&
        kolom.sleutel !==
          "linkAttest" &&
        !meerKolomSleutels.has(
          kolom.sleutel,
        ),
    ),
    ...kolommen.filter(
      (kolom) =>
        meerKolomSleutels.has(
          kolom.sleutel,
        ),
    ),
  ];

  const waardenPerKolom =
    useMemo(
      () =>
        Object.fromEntries(
          kolommen.map(
            (kolom) => {
              const aantallen =
                new Map<
                  string,
                  number
                >();

              for (
                const rij of rijen
              ) {
                const waarde =
                  String(
                    rij[
                      kolom.sleutel
                    ] ?? "",
                  ).trim();

                aantallen.set(
                  waarde,
                  (
                    aantallen.get(
                      waarde,
                    ) ?? 0
                  ) + 1,
                );
              }

              return [
                kolom.sleutel,
                Array.from(
                  aantallen,
                  ([
                    waarde,
                    aantal,
                  ]) => ({
                    waarde,
                    aantal,
                  }),
                ).sort(
                  (
                    eerste,
                    tweede,
                  ) =>
                    eerste.waarde.localeCompare(
                      tweede.waarde,
                      "nl-BE",
                      {
                        numeric: true,
                        sensitivity:
                          "base",
                      },
                    ),
                ),
              ];
            },
          ),
        ),
      [rijen],
    );

  const zichtbareRijen =
    useMemo(
      () =>
        filterEnSorteerBeheerRijen(
          rijen,
          kolommen,
          {
            zoekterm,
            filters,
            datumFilters,
            sortering,
          },
        ),
      [
        rijen,
        zoekterm,
        filters,
        datumFilters,
        sortering,
      ],
    );

  const beschikbareJaren =
    useMemo(
      () =>
        actieveKolom?.type ===
        "datum"
          ? beschikbareBeheerJaren(
              rijen,
              actieveKolom.sleutel,
            )
          : [],
      [
        actieveKolom,
        rijen,
      ],
    );

  const heeftFilters =
    zoekterm.trim().length > 0 ||
    Object.values(
      filters,
    ).some(
      (waarde) =>
        waarde.trim().length >
        0,
    ) ||
    Object.values(
      datumFilters,
    ).some(
      (filter) =>
        Boolean(
          filter.jaar ||
          filter.maand,
        ),
    ) ||
    sortering !== null;

  function wisFilter(
    sleutel: string,
  ) {
    setFilters(
      (huidige) => {
        const volgende = {
          ...huidige,
        };

        delete volgende[
          sleutel
        ];

        return volgende;
      },
    );

    setDatumFilters(
      (huidige) => {
        const volgende = {
          ...huidige,
        };

        delete volgende[
          sleutel
        ];

        return volgende;
      },
    );
  }

  function wisAlles() {
    setZoekterm("");
    setFilters({});
    setDatumFilters({});
    setSortering(null);
    setActieveFilterSleutel(
      null,
    );
  }

  function renderCel(
    rij:
      OpvolgingSanctieTabelRij,
    kolom:
      BeheerTabelKolom,
  ) {
    const waarde =
      rij[kolom.sleutel];

    if (
      kolom.sleutel ===
      "linkAttest"
    ) {
      return rij.linkAttest ? (
        <a
          href={
            rij.linkAttest
          }
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          Open
        </a>
      ) : (
        "—"
      );
    }

    if (
      kolom.sleutel ===
      "opvolgingAfgerondTekst"
    ) {
      return (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
            rij.opvolgingAfgerond
              ? "border-emerald-200 bg-emerald-100 text-emerald-900"
              : "border-slate-300 bg-slate-100 text-slate-700"
          }`}
        >
          {
            rij.opvolgingAfgerondTekst
          }
        </span>
      );
    }

    if (
      kolom.sleutel ===
      "ncCategorie"
    ) {
      return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {
            rij.ncCategorie
          }
        </span>
      );
    }

    return toonWaarde(
      waarde,
    );
  }

  return (
    <BeheerTabelKader
      titel="Overzicht"
      aantalTekst={
        <>
          {
            zichtbareRijen.length
          }{" "}
          van {rijen.length}{" "}
          {rijen.length === 1
            ? "registratie"
            : "registraties"}
        </>
      }
      zoekterm={zoekterm}
      zoekPlaceholder="Zoeken in opvolgingen en sancties..."
      heeftFilters={
        heeftFilters
      }
      onZoektermWijzigen={
        setZoekterm
      }
      onAllesWissen={
        wisAlles
      }
      filterPaneel={
        actieveKolom ? (
          <BeheerFilterPaneel
            label={
              actieveKolom.label
            }
            onWissen={() => {
              wisFilter(
                actieveKolom.sleutel,
              );
            }}
            onSluiten={() => {
              setActieveFilterSleutel(
                null,
              );
            }}
          >
            {actieveKolom.type ===
            "datum" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={
                    datumFilters[
                      actieveKolom
                        .sleutel
                    ]?.jaar ?? ""
                  }
                  onChange={(
                    event,
                  ) => {
                    setDatumFilters(
                      (huidige) => ({
                        ...huidige,
                        [actieveKolom.sleutel]:
                          {
                            jaar:
                              event
                                .target
                                .value,
                            maand:
                              huidige[
                                actieveKolom
                                  .sleutel
                              ]?.maand ??
                              "",
                          },
                      }),
                    );
                  }}
                  className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
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

                <select
                  value={
                    datumFilters[
                      actieveKolom
                        .sleutel
                    ]?.maand ?? ""
                  }
                  onChange={(
                    event,
                  ) => {
                    setDatumFilters(
                      (huidige) => ({
                        ...huidige,
                        [actieveKolom.sleutel]:
                          {
                            jaar:
                              huidige[
                                actieveKolom
                                  .sleutel
                              ]?.jaar ??
                              "",
                            maand:
                              event
                                .target
                                .value,
                          },
                      }),
                    );
                  }}
                  className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">
                    Alle maanden
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
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            ) : (
              <input
                autoFocus
                type="search"
                value={
                  filters[
                    actieveKolom
                      .sleutel
                  ] ?? ""
                }
                onChange={(
                  event,
                ) => {
                  setFilters(
                    (huidige) => ({
                      ...huidige,
                      [actieveKolom.sleutel]:
                        event
                          .target
                          .value,
                    }),
                  );
                }}
                placeholder={`Filter op ${actieveKolom.label.toLocaleLowerCase(
                  "nl-BE",
                )}...`}
                className="h-10 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
              />
            )}
          </BeheerFilterPaneel>
        ) : undefined
      }
      footer={
        <BeheerTabelVoet>
          Klik op een kaart om de overige gegevens en acties te bekijken. Gebruik de kolombalk om te sorteren en filteren.
        </BeheerTabelVoet>
      }
    >
      {rijen.length === 0 ? (
        <BeheerLegeToestand
          titel="Nog geen opvolgingen"
          beschrijving="Gebruik bij een deskcontrole, terreincontrole of registratie na finalisatie de actie Opvolgen/sanctioneren."
        />
      ) : zichtbareRijen.length ===
        0 ? (
        <BeheerLegeToestand
          titel="Geen resultaten"
          beschrijving="Pas de zoekterm of actieve filters aan."
        />
      ) : (
        <>
          <OpvolgingSanctieKaartKolombalk
            kolommen={kolommen}
            filters={filters}
            waardenPerKolom={
              waardenPerKolom
            }
            sorteringen={
              sortering
                ? [sortering]
                : []
            }
            onFilterWijzigen={(
              sleutel,
              waarde,
            ) => {
              setFilters(
                (huidige) => ({
                  ...huidige,
                  [sleutel]:
                    waarde,
                }),
              );

              setDatumFilters(
                (huidige) => {
                  const volgende = {
                    ...huidige,
                  };

                  delete volgende[
                    sleutel
                  ];

                  return volgende;
                },
              );
            }}
            onSorteren={(
              sleutel,
              richting,
            ) => {
              setSortering({
                sleutel,
                richting,
              });
            }}
            onSorteringVerwijderen={(
              sleutel,
            ) => {
              setSortering(
                (huidige) =>
                  huidige?.sleutel ===
                  sleutel
                    ? null
                    : huidige,
              );
            }}
            onSorteringVerplaatsen={() => {
              // Deze lijst gebruikt één actieve sortering.
            }}
          />

          <div className="space-y-1.5 p-2">
            {zichtbareRijen.map(
              (rij) => {
                const geopend =
                  openKaartId ===
                  rij.id;

                const kaartNaam =
                  String(
                    rij.attestnummer ??
                      `registratie ${rij.id}`,
                  );

                return (
                  <article
                    key={rij.id}
                    role="button"
                    tabIndex={0}
                    aria-expanded={
                      geopend
                    }
                    aria-label={`Opvolging of sanctie ${kaartNaam}`}
                    onClick={(
                      event,
                    ) => {
                      if (
                        event.target instanceof
                          Element &&
                        event.target.closest(
                          "a, button, form, input, select, textarea, details, summary",
                        )
                      ) {
                        return;
                      }

                      setOpenKaartId(
                        (huidig) =>
                          huidig ===
                          rij.id
                            ? null
                            : rij.id,
                      );
                    }}
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.target !==
                          event.currentTarget ||
                        (
                          event.key !==
                            "Enter" &&
                          event.key !==
                            " "
                        )
                      ) {
                        return;
                      }

                      event.preventDefault();

                      setOpenKaartId(
                        (huidig) =>
                          huidig ===
                          rij.id
                            ? null
                            : rij.id,
                      );
                    }}
                    className={`group relative z-0 cursor-pointer rounded-xl border shadow-sm outline-none transition hover:shadow-md focus-within:z-40 has-[details[open]]:z-50 focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                      rij.opvolgingAfgerond
                        ? "border-emerald-400 bg-emerald-100/80 hover:border-emerald-500 hover:bg-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/35"
                    } ${
                      geopend
                        ? "ring-1 ring-emerald-300"
                        : ""
                    }`}
                  >
                    <div className="relative p-2.5 pr-10">
                      <span
                        aria-hidden="true"
                        className={`absolute right-2.5 top-2.5 inline-flex size-6 items-center justify-center rounded-full bg-white/80 text-sm font-black text-slate-600 shadow-sm transition ${
                          geopend
                            ? "rotate-180 bg-emerald-100 text-emerald-800"
                            : ""
                        }`}
                      >
                        ↓
                      </span>

                      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-start">
                        {hoofdKolommen.map(
                          (kolom) =>
                            kolom.sleutel ===
                            "opvolgingAfgerondTekst" ? (
                              <OpvolgingSanctieAfronding
                                key={`${rij.id}-${rij.opvolgingAfgerond}-${rij.datumAfgerondInvoer}-${rij.afgerondDoorGebruikerId ?? ""}`}
                                id={rij.id}
                                afgerond={
                                  rij.opvolgingAfgerond
                                }
                                datumAfgerond={
                                  rij.datumAfgerondInvoer
                                }
                                afgerondDoorGebruikerId={
                                  rij.afgerondDoorGebruikerId
                                }
                                auditeurs={
                                  auditeurs
                                }
                                magBeheren={
                                  rij.magBeheren
                                }
                              />
                            ) : (
                              <OpvolgingSanctieKaartWaarde
                                key={
                                  kolom.sleutel
                                }
                                label={
                                  kolom.label
                                }
                                waarde={
                                  rij[
                                    kolom.sleutel
                                  ]
                                }
                                weergave={renderCel(
                                  rij,
                                  kolom,
                                )}
                                sterk
                              />
                            ),
                        )}
                      </dl>
                    </div>

                    {geopend ? (
                      <div
                        className={`border-t p-2.5 ${
                          rij.opvolgingAfgerond
                            ? "border-emerald-300 bg-emerald-50/80"
                            : "border-slate-200 bg-white/55"
                        }`}
                      >
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-600">
                          Overige gegevens
                        </p>

                        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                          {overigeKolommen.map(
                            (kolom) => (
                              <OpvolgingSanctieKaartWaarde
                                key={
                                  kolom.sleutel
                                }
                                label={
                                  kolom.label
                                }
                                waarde={
                                  rij[
                                    kolom.sleutel
                                  ]
                                }
                                weergave={renderCel(
                                  rij,
                                  kolom,
                                )}
                                breed={[
                                  "reden",
                                  "opmerkingen",
                                  "redenNietDoorzetten",
                                ].includes(
                                  kolom.sleutel,
                                )}
                              />
                            ),
                          )}
                        </dl>

                        <div
                          className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3"
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();
                          }}
                          onKeyDown={(
                            event,
                          ) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {rij.linkAttest ? (
                              <a
                                href={
                                  rij.linkAttest
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-9 items-center rounded-xl border border-sky-200 bg-white px-3 text-xs font-bold text-sky-800 hover:bg-sky-50"
                              >
                                Attest bekijken
                                <span
                                  aria-hidden="true"
                                  className="ml-1"
                                >
                                  ↗
                                </span>
                              </a>
                            ) : null}
                          </div>

                          {rij.magBeheren ? (
                            <OpvolgingSanctieActies
                              registratie={{
                                id: rij.id,
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              },
            )}
          </div>
        </>
      )}
    </BeheerTabelKader>
  );
}

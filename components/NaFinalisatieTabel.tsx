"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";
import {
  CopyButton,
} from "@/components/CopyButton";
import {
  NaFinalisatieHerstelKnop,
} from "@/components/NaFinalisatieHerstelKnop";
import {
  NaFinalisatieKaartKolombalk,
} from "@/components/NaFinalisatieKaartKolombalk";
import {
  NaFinalisatieVerwijderKnop,
} from "@/components/NaFinalisatieVerwijderKnop";
import { OpvolgingRijMeerMenu } from "@/components/OpvolgingRijMeerMenu";
import {
  useNaFinalisatieQuery,
} from "@/hooks/useNaFinalisatieQuery";

export type NaFinalisatieRij = {
  id: number;
  auditeur: string;
  naamAdi: string | null;
  geregistreerd: boolean;
  linkAttest: string;
  attestnummer: string;
  datumNaFinalisatie: string;
  plaatsbezoek: string;
  typeControle: string;
  reden: string | null;
  opmerking: string;
  inspectielocatie:
    string | null;
  naamBedrijf: string | null;
  persoonsId: string | null;
  attestId: string;
  verwijderdOp?: string | null;
};

type Kolom = {
  sleutel:
    keyof NaFinalisatieRij;
  label: string;
  type?:
    | "datum"
    | "boolean"
    | "url"
    | "plaatsbezoek"
    | "type";
};

const basiskolommen:
  Kolom[] = [
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel: "naamAdi",
      label: "Naam ADI",
    },
    {
      sleutel: "geregistreerd",
      label: "Geregistreerd?",
      type: "boolean",
    },
    {
      sleutel: "linkAttest",
      label: "Link Attest",
      type: "url",
    },
    {
      sleutel: "attestnummer",
      label: "Attestnummer",
    },
    {
      sleutel:
        "datumNaFinalisatie",
      label:
        "Datum na finalisatie",
      type: "datum",
    },
    {
      sleutel: "plaatsbezoek",
      label: "Plaatsbezoek",
      type: "plaatsbezoek",
    },
    {
      sleutel: "typeControle",
      label: "Type controle",
      type: "type",
    },
    {
      sleutel: "reden",
      label: "Reden",
    },
    {
      sleutel: "opmerking",
      label: "Opmerking",
    },
    {
      sleutel:
        "inspectielocatie",
      label:
        "Inspectielocatie",
    },
    {
      sleutel: "naamBedrijf",
      label: "Naam bedrijf",
    },
    {
      sleutel: "persoonsId",
      label: "PersoonsID",
    },
    {
      sleutel: "attestId",
      label: "ID",
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

function plaatsbezoekLabel(
  waarde: string,
) {
  switch (waarde) {
    case "SPONTAAN":
      return "Spontaan";
    case "TELEFONISCHE_AFSPRAAK":
      return "Telefonische afspraak";
    case "EMAILAFSPRAAK":
      return "E-mailafspraak";
    case "KLACHT":
      return "Klacht";
    default:
      return waarde;
  }
}

function typeLabel(
  waarde: string,
) {
  switch (waarde) {
    case "GEHEEL":
      return "Geheel";
    case "DEELS":
      return "Deels";
    case "ENKEL_OPENBARE_WEG":
      return "Enkel van openbare weg";
    default:
      return waarde;
  }
}

function formatteerDatum(
  waarde:
    | string
    | null
    | undefined,
) {
  if (!waarde) {
    return "—";
  }

  const datum =
    new Date(waarde);

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return waarde;
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

function formatteerDatumTijd(
  waarde:
    | string
    | null
    | undefined,
) {
  if (!waarde) {
    return "—";
  }

  const datum =
    new Date(waarde);

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return waarde;
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(datum);
}

function zoekWaarde(
  rij: NaFinalisatieRij,
  kolom: Kolom,
) {
  const waarde =
    rij[kolom.sleutel];

  if (
    kolom.type === "boolean"
  ) {
    return waarde
      ? "ja geregistreerd"
      : "nee niet geregistreerd";
  }

  if (
    kolom.type ===
    "plaatsbezoek"
  ) {
    return plaatsbezoekLabel(
      String(waarde ?? ""),
    );
  }

  if (kolom.type === "type") {
    return typeLabel(
      String(waarde ?? ""),
    );
  }

  if (kolom.type === "datum") {
    return `${String(
      waarde ?? "",
    )} ${formatteerDatum(
      String(waarde ?? ""),
    )}`;
  }

  return String(
    waarde ?? "",
  );
}

function isInteractief(
  doel: EventTarget | null,
) {
  return (
    doel instanceof Element &&
    Boolean(
      doel.closest(
        "a,button,input,select,textarea,label,form",
      ),
    )
  );
}

type Props = {
  rijen:
    NaFinalisatieRij[];
  magBeheren: boolean;
  verwijderd?: boolean;
  serverModus?: boolean;
};

export function NaFinalisatieTabel({
  rijen,
  magBeheren,
  verwijderd = false,
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
    jaar,
    setJaar,
  ] = useState("");

  const [
    maand,
    setMaand,
  ] = useState("");

  const [
    openKaartId,
    setOpenKaartId,
  ] = useState<number | null>(
    null,
  );

  const [
    sorteerSleutel,
    setSorteerSleutel,
  ] = useState<
    keyof NaFinalisatieRij
  >("datumNaFinalisatie");

  const [
    aflopend,
    setAflopend,
  ] = useState(true);

  const gebruiktServer =
    serverModus &&
    !verwijderd;

  const serverQuery =
    useNaFinalisatieQuery({
      ingeschakeld:
        gebruiktServer,
      zoekterm:
        zoeken,
      filters,
      datumJaar:
        jaar,
      datumMaand:
        maand,
      sortering: {
        sleutel:
          String(
            sorteerSleutel,
          ),
        richting:
          aflopend
            ? "aflopend"
            : "oplopend",
      },
    });

  const kolommen =
    useMemo(
      () =>
        verwijderd
          ? [
              ...basiskolommen,
              {
                sleutel:
                  "verwijderdOp" as const,
                label:
                  "Verwijderd op",
                type:
                  "datum" as const,
              },
            ]
          : basiskolommen,
      [verwijderd],
    );

  const jaren =
    useMemo(
      () =>
        gebruiktServer
          ? [
              "2027",
              "2026",
              "2025",
            ]
          : Array.from(
              new Set(
                rijen.map((rij) =>
                  rij.datumNaFinalisatie.slice(
                    0,
                    4,
                  ),
                ),
              ),
            )
              .filter(Boolean)
              .sort()
              .reverse(),
      [
        gebruiktServer,
        rijen,
      ],
    );

  const zichtbareRijen =
    useMemo(() => {
      if (gebruiktServer) {
        return serverQuery.rijen;
      }

      const algemeneZoekterm =
        zoeken
          .trim()
          .toLocaleLowerCase(
            "nl-BE",
          );

      const resultaat =
        rijen.filter((rij) => {
          const datum =
            rij.datumNaFinalisatie.slice(
              0,
              10,
            );

          if (
            jaar &&
            datum.slice(0, 4) !==
              jaar
          ) {
            return false;
          }

          if (
            maand &&
            datum.slice(5, 7) !==
              maand
          ) {
            return false;
          }

          if (
            algemeneZoekterm &&
            !kolommen.some(
              (kolom) =>
                zoekWaarde(
                  rij,
                  kolom,
                )
                  .toLocaleLowerCase(
                    "nl-BE",
                  )
                  .includes(
                    algemeneZoekterm,
                  ),
            )
          ) {
            return false;
          }

          return kolommen.every(
            (kolom) => {
              const filter =
                (
                  filters[
                    String(
                      kolom.sleutel,
                    )
                  ] ?? ""
                )
                  .trim()
                  .toLocaleLowerCase(
                    "nl-BE",
                  );

              if (!filter) {
                return true;
              }

              return zoekWaarde(
                rij,
                kolom,
              )
                .toLocaleLowerCase(
                  "nl-BE",
                )
                .includes(filter);
            },
          );
        });

      return resultaat.sort(
        (a, b) => {
          const waardeA =
            zoekWaarde(
              a,
              kolommen.find(
                (kolom) =>
                  kolom.sleutel ===
                  sorteerSleutel,
              ) ?? kolommen[0],
            );

          const waardeB =
            zoekWaarde(
              b,
              kolommen.find(
                (kolom) =>
                  kolom.sleutel ===
                  sorteerSleutel,
              ) ?? kolommen[0],
            );

          const vergelijking =
            waardeA.localeCompare(
              waardeB,
              "nl-BE",
              {
                numeric: true,
                sensitivity:
                  "base",
              },
            );

          return aflopend
            ? -vergelijking
            : vergelijking;
        },
      );
    }, [
      rijen,
      zoeken,
      filters,
      jaar,
      maand,
      kolommen,
      sorteerSleutel,
      aflopend,
      gebruiktServer,
      serverQuery.rijen,
    ]);

  const aantalBronRijen =
    gebruiktServer
      ? (
          serverQuery
            .aantalTotaal ??
          serverQuery.rijen
            .length
        )
      : rijen.length;

  function wisFilters() {
    setZoeken("");
    setFilters({});
    setJaar("");
    setMaand("");
    setSorteerSleutel(
      "datumNaFinalisatie",
    );
    setAflopend(true);
    setOpenKaartId(null);
  }

  const actieveFilters =
    Boolean(
      zoeken ||
        jaar ||
        maand ||
        Object.values(
          filters,
        ).some(Boolean),
    );

  return (
    <section className={BEHEER_TABEL_STIJLEN.kader}>
      <div className={BEHEER_TABEL_STIJLEN.bovenbalk}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className={BEHEER_TABEL_STIJLEN.overzichtTitel}>
              Overzicht
            </h2>

            <p className={BEHEER_TABEL_STIJLEN.aantal}>
              {zichtbareRijen.length} van{" "}
              {aantalBronRijen}{" "}
              {rijen.length === 1
                ? "registratie"
                : "registraties"}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(32rem,2fr)_repeat(3,minmax(10rem,1fr))]">
            <input
              value={zoeken}
              onChange={(event) =>
                setZoeken(
                  event.target.value,
                )
              }
              placeholder="Zoeken..."
              className="h-10 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 lg:min-w-[32rem]"
            />

            <select
              value={jaar}
              onChange={(event) =>
                setJaar(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">
                Alle jaren
              </option>

              {jaren.map(
                (waarde) => (
                  <option
                    key={waarde}
                    value={waarde}
                  >
                    {waarde}
                  </option>
                ),
              )}
            </select>

            <select
              value={maand}
              onChange={(event) =>
                setMaand(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
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
                    key={waarde}
                    value={waarde}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={wisFilters}
              disabled={!actieveFilters}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Filters wissen
            </button>
          </div>
        </div>
      </div>

      <NaFinalisatieKaartKolombalk
        kolommen={basiskolommen}
        filters={filters}
        sorteringen={[
          {
            sleutel:
              String(
                sorteerSleutel,
              ),
            richting:
              aflopend
                ? "aflopend"
                : "oplopend",
          },
        ]}
        onFilterWijzigen={(
          sleutel,
          waarde,
        ) => {
          setFilters(
            (huidig) => ({
              ...huidig,
              [sleutel]:
                waarde,
            }),
          );
        }}
        onSorteren={(
          sleutel,
          richting,
        ) => {
          setSorteerSleutel(
            sleutel as keyof NaFinalisatieRij,
          );

          setAflopend(
            richting ===
              "aflopend",
          );
        }}
        onSorteringVerwijderen={() => {
          setSorteerSleutel(
            "datumNaFinalisatie",
          );
          setAflopend(true);
        }}
        onSorteringVerplaatsen={() => {
          // Na finalisatie gebruikt momenteel één server-sortering.
        }}
      />

      {zichtbareRijen.length === 0 ? (
        <div className={BEHEER_TABEL_STIJLEN.leeg}>
          Geen registraties gevonden.
        </div>
      ) : (
        <div className="space-y-2 bg-slate-50/70 p-2 sm:p-3">
          {zichtbareRijen.map(
            (rij) => {
              const geopend =
                openKaartId ===
                rij.id;

              const inhoudId =
                `na-finalisatie-kaart-${rij.id}`;

              const hoofdvelden = [
                {
                  label:
                    "Auditeur",
                  waarde:
                    rij.auditeur ||
                    "—",
                  sterk: true,
                },
                {
                  label:
                    "Naam ADI",
                  waarde:
                    rij.naamAdi ||
                    "—",
                  sterk: false,
                },
                {
                  label:
                    "Geregistreerd",
                  waarde: (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${
                        rij.geregistreerd
                          ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                          : "border-slate-300 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {rij.geregistreerd
                        ? "Ja"
                        : "Nee"}
                    </span>
                  ),
                  sterk: false,
                },
                {
                  label:
                    "Attestnummer",
                  waarde:
                    rij.attestnummer ||
                    "—",
                  sterk: true,
                },
                {
                  label:
                    "Datum na finalisatie",
                  waarde:
                    formatteerDatum(
                      rij.datumNaFinalisatie,
                    ),
                  sterk: false,
                },
                {
                  label:
                    "Inspectielocatie",
                  waarde:
                    rij.inspectielocatie ||
                    "—",
                  sterk: false,
                },
              ];

              const overigeVelden = [
                {
                  label:
                    "Plaatsbezoek",
                  waarde:
                    plaatsbezoekLabel(
                      rij.plaatsbezoek,
                    ) || "—",
                },
                {
                  label:
                    "Type controle",
                  waarde:
                    typeLabel(
                      rij.typeControle,
                    ) || "—",
                },
                {
                  label:
                    "Reden",
                  waarde:
                    rij.reden || "—",
                },
                {
                  label:
                    "Naam bedrijf",
                  waarde:
                    rij.naamBedrijf ||
                    "—",
                },
                {
                  label:
                    "PersoonsID",
                  waarde:
                    rij.persoonsId ||
                    "—",
                },
                {
                  label:
                    "ID",
                  waarde:
                    rij.attestId ||
                    "—",
                },
              ];

              return (
                <article
                  key={rij.id}
                  className={`overflow-visible rounded-xl border bg-white shadow-sm transition ${
                    geopend
                      ? "border-emerald-300 ring-1 ring-emerald-100"
                      : "border-slate-200 hover:border-emerald-200 hover:shadow"
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={
                      geopend
                    }
                    aria-controls={
                      inhoudId
                    }
                    onClick={(
                      event,
                    ) => {
                      if (
                        isInteractief(
                          event.target,
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
                        isInteractief(
                          event.target,
                        ) ||
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
                    className="cursor-pointer rounded-t-xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                  >
                    <div className="flex items-start gap-2">
                      <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {hoofdvelden.map(
                          (veld) => (
                            <div
                              key={
                                veld.label
                              }
                              className="min-w-0"
                            >
                              <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                {
                                  veld.label
                                }
                              </dt>

                              <dd
                                className={`mt-0.5 flex min-w-0 items-start justify-between gap-2 break-words text-sm text-slate-900 ${
                                  veld.sterk
                                    ? "font-bold"
                                    : "font-medium"
                                }`}
                              >
                                <span className="min-w-0 flex-1 break-words">
                                  {
                                    veld.waarde
                                  }
                                </span>

                                {veld.label !==
                                  "Geregistreerd" &&
                                veld.label !==
                                  "Datum na finalisatie" ? (
                                  <CopyButton
                                    waarde={
                                      typeof veld.waarde ===
                                        "string" &&
                                      veld.waarde !==
                                        "—"
                                        ? veld.waarde
                                        : null
                                    }
                                    label={`${veld.label} kopiëren`}
                                  />
                                ) : null}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>

                      <span
                        aria-hidden="true"
                        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-black text-slate-600 shadow-sm transition ${
                          geopend
                            ? "rotate-180 bg-emerald-100 text-emerald-800"
                            : ""
                        }`}
                      >
                        ↓
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

                      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        {overigeVelden.map(
                          (veld) => (
                            <div
                              key={
                                veld.label
                              }
                              className="min-w-0"
                            >
                              <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                {
                                  veld.label
                                }
                              </dt>

                              <dd className="mt-0.5 flex items-start justify-between gap-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
                                <span className="min-w-0 flex-1 break-words">
                                  {
                                    veld.waarde
                                  }
                                </span>

                                {veld.label !==
                                "Plaatsbezoek" ? (
                                  <CopyButton
                                    waarde={
                                      veld.waarde !==
                                        "—"
                                        ? veld.waarde
                                        : null
                                    }
                                    label={`${veld.label} kopiëren`}
                                  />
                                ) : null}
                              </dd>
                            </div>
                          ),
                        )}

                        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                          <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            Opmerking
                          </dt>

                          <dd className="mt-0.5 flex items-start justify-between gap-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
                            <span className="min-w-0 flex-1 break-words">
                              {rij.opmerking ||
                                "—"}
                            </span>

                            <CopyButton
                              waarde={
                                rij.opmerking ||
                                null
                              }
                              label="Opmerking kopiëren"
                            />
                          </dd>
                        </div>

                        {verwijderd ? (
                          <div className="min-w-0">
                            <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                              Verwijderd op
                            </dt>

                            <dd className="mt-0.5 flex items-start justify-between gap-2 break-words text-sm font-medium text-slate-900">
                              <span className="min-w-0 flex-1 break-words">
                                {formatteerDatumTijd(
                                  rij.verwijderdOp,
                                )}
                              </span>

                              <CopyButton
                                waarde={
                                  rij.verwijderdOp
                                    ? formatteerDatumTijd(
                                        rij.verwijderdOp,
                                      )
                                    : null
                                }
                                label="Verwijderd op kopiëren"
                              />
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  ) : null}

                  {geopend ? (
                  <div className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-3 py-2">
                    <div>
                      {rij.linkAttest ? (
                        <a
                          href={
                            rij.linkAttest
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                        >
                          Attest
                        </a>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {verwijderd ? (
                        <NaFinalisatieHerstelKnop
                          id={rij.id}
                        />
                      ) : magBeheren ? (
                        <OpvolgingRijMeerMenu
                          bronType="NA_FINALISATIE"
                          bronId={rij.id}
                          bewerkenHref={`/na-finalisatie/${rij.id}/bewerken`}
                          kinderen={
                            <NaFinalisatieVerwijderKnop
                              id={
                                rij.id
                              }
                            />
                          }
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
      )}

      {gebruiktServer ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            {serverQuery.isEersteKeerLaden ? (
              <span>
                Registraties laden...
              </span>
            ) : serverQuery.fout ? (
              <span className="font-semibold text-red-700">
                {serverQuery.fout}
              </span>
            ) : (
              <span>
                {zichtbareRijen.length} van{" "}
                {serverQuery.aantalTotaal ??
                  zichtbareRijen.length}{" "}
                resultaten geladen
              </span>
            )}
          </div>

          {serverQuery.fout ? (
            <button
              type="button"
              onClick={() => {
                void serverQuery.opnieuwLaden();
              }}
              className={BEHEER_TABEL_STIJLEN.foutKnop}
            >
              Opnieuw proberen
            </button>
          ) : serverQuery.heeftVolgendePagina ? (
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
        </div>
      ) : null}

      <footer className={BEHEER_TABEL_STIJLEN.voet}>
        {verwijderd
          ? "Gebruik Herstellen om een verwijderde registratie opnieuw actief te maken."
          : "Klik op een rij om de registratie te bekijken. Klik op een kolomnaam om te sorteren."}
      </footer>
    </section>
  );
}

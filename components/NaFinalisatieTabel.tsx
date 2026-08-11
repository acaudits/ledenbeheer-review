"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import {
  NaFinalisatieHerstelKnop,
} from "@/components/NaFinalisatieHerstelKnop";
import {
  NaFinalisatieVerwijderKnop,
} from "@/components/NaFinalisatieVerwijderKnop";
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
  const router =
    useRouter();

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

  function sorteer(
    sleutel:
      keyof NaFinalisatieRij,
  ) {
    if (
      sorteerSleutel ===
      sleutel
    ) {
      setAflopend(
        (huidig) => !huidig,
      );

      return;
    }

    setSorteerSleutel(
      sleutel,
    );

    setAflopend(false);
  }

  function wisFilters() {
    setZoeken("");
    setFilters({});
    setJaar("");
    setMaand("");
    setSorteerSleutel(
      "datumNaFinalisatie",
    );
    setAflopend(true);
  }

  function renderCel(
    rij: NaFinalisatieRij,
    kolom: Kolom,
  ) {
    const waarde =
      rij[kolom.sleutel];

    if (
      kolom.sleutel ===
      "verwijderdOp"
    ) {
      return formatteerDatumTijd(
        String(waarde ?? ""),
      );
    }

    if (
      kolom.type === "datum"
    ) {
      return formatteerDatum(
        String(waarde ?? ""),
      );
    }

    if (
      kolom.type === "boolean"
    ) {
      return (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
            waarde
              ? "border-emerald-200 bg-emerald-100 text-emerald-900"
              : "border-slate-300 bg-slate-100 text-slate-700"
          }`}
        >
          {waarde
            ? "Ja"
            : "Nee"}
        </span>
      );
    }

    if (
      kolom.type === "url"
    ) {
      return waarde ? (
        <a
          href={String(waarde)}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-emerald-700 underline hover:text-emerald-900"
        >
          Open attest
        </a>
      ) : (
        "—"
      );
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

    return String(
      waarde ?? "",
    ).trim() || "—";
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
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Overzicht
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              {zichtbareRijen.length} van{" "}
              {aantalBronRijen}{" "}
              {rijen.length === 1
                ? "registratie"
                : "registraties"}
            </h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={zoeken}
              onChange={(event) =>
                setZoeken(
                  event.target.value,
                )
              }
              placeholder="Zoeken..."
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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

      {zichtbareRijen.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm font-medium text-slate-500">
          Geen registraties gevonden.
        </div>
      ) : (
        <div className="max-h-[calc(100vh-240px)] overflow-auto">
          <table className="min-w-[2800px] w-full text-left">
            <thead className="sticky top-0 z-20 bg-slate-100 text-xs font-bold uppercase tracking-wide text-slate-600 shadow-sm">
              <tr>
                {kolommen.map(
                  (kolom) => (
                    <th
                      key={
                        kolom.sleutel
                      }
                      className="min-w-40 border-b border-slate-200 px-3 py-2 align-top"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          sorteer(
                            kolom.sleutel,
                          )
                        }
                        className="flex w-full items-center justify-between gap-2 text-left hover:text-emerald-800"
                      >
                        <span>
                          {kolom.label}
                        </span>

                        {sorteerSleutel ===
                        kolom.sleutel ? (
                          <span>
                            {aflopend
                              ? "↓"
                              : "↑"}
                          </span>
                        ) : null}
                      </button>

                      <input
                        value={
                          filters[
                            String(
                              kolom.sleutel,
                            )
                          ] ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          setFilters(
                            (huidig) => ({
                              ...huidig,
                              [String(
                                kolom.sleutel,
                              )]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Filter"
                        className="mt-2 h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-emerald-600"
                      />
                    </th>
                  ),
                )}

                <th className="sticky right-0 z-30 min-w-56 border-b border-l border-slate-200 bg-slate-100 px-3 py-2">
                  Acties
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {zichtbareRijen.map(
                (rij) => (
                  <tr
                    key={rij.id}
                    role={
                      verwijderd
                        ? undefined
                        : "link"
                    }
                    tabIndex={
                      verwijderd
                        ? undefined
                        : 0
                    }
                    onClick={(
                      event,
                    ) => {
                      if (
                        verwijderd ||
                        isInteractief(
                          event.target,
                        )
                      ) {
                        return;
                      }

                      router.push(
                        `/na-finalisatie/${rij.id}`,
                      );
                    }}
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        verwijderd ||
                        (event.key !==
                          "Enter" &&
                          event.key !==
                            " ")
                      ) {
                        return;
                      }

                      event.preventDefault();

                      router.push(
                        `/na-finalisatie/${rij.id}`,
                      );
                    }}
                    className={`group bg-white align-top transition hover:bg-emerald-50/40 ${
                      verwijderd
                        ? ""
                        : "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                    }`}
                  >
                    {kolommen.map(
                      (kolom) => (
                        <td
                          key={
                            kolom.sleutel
                          }
                          className="max-w-80 whitespace-pre-wrap break-words px-3 py-3 text-xs text-slate-700"
                        >
                          {renderCel(
                            rij,
                            kolom,
                          )}
                        </td>
                      ),
                    )}

                    <td className="sticky right-0 z-10 min-w-56 border-l border-slate-200 bg-white px-3 py-3 group-hover:bg-[#f7fcfa]">
                      {verwijderd ? (
                        <NaFinalisatieHerstelKnop
                          id={rij.id}
                        />
                      ) : magBeheren ? (
                        <div className="flex flex-wrap items-start gap-2">
                          <Link
                            href={`/na-finalisatie/${rij.id}/bewerken`}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Bewerken
                          </Link>

                          <NaFinalisatieVerwijderKnop
                            id={rij.id}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
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
              className="inline-flex h-10 items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:bg-red-100"
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
              className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              {serverQuery
                .isVolgendePaginaLaden
                ? "Resultaten laden..."
                : "Meer resultaten laden"}
            </button>
          ) : null}
        </div>
      ) : null}

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        {verwijderd
          ? "Gebruik Herstellen om een verwijderde registratie opnieuw actief te maken."
          : "Klik op een rij om de registratie te bekijken. Klik op een kolomnaam om te sorteren."}
      </footer>
    </section>
  );
}

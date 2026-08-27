"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  BeheerActieKolomKop,
  BeheerFilterPaneel,
  BeheerLegeToestand,
  BeheerTabel,
  BeheerTabelKader,
  BeheerTabelKolomKop,
  BeheerTabelKop,
  BeheerTabelScroll,
  BeheerTabelVoet,
} from "@/components/BeheerTabelOnderdelen";
import {
  OpvolgingSanctieActies,
} from "@/components/OpvolgingSanctieActies";
import {
  beschikbareBeheerJaren,
  filterEnSorteerBeheerRijen,
  wijzigBeheerSortering,
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

export function OpvolgingSanctiesTabel({
  rijen,
  auditeurs,
}: Props) {
  void auditeurs;

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

  function heeftKolomFilter(
    kolom:
      BeheerTabelKolom,
  ) {
    return (
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
      )
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
          Klik op een kolomnaam om te sorteren en op het filtericoon om te filteren.
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
        <BeheerTabelScroll>
          <BeheerTabel>
            <BeheerTabelKop>
              <tr>
                {kolommen.map(
                  (kolom) => (
                    <BeheerTabelKolomKop
                      key={
                        kolom.sleutel
                      }
                      label={
                        kolom.label
                      }
                      sleutel={
                        kolom.sleutel
                      }
                      sortering={
                        sortering
                      }
                      heeftFilter={heeftKolomFilter(
                        kolom,
                      )}
                      onSorteren={(
                        sleutel,
                      ) => {
                        setSortering(
                          (huidige) =>
                            wijzigBeheerSortering(
                              huidige,
                              sleutel,
                            ),
                        );
                      }}
                      onFilteren={
                        setActieveFilterSleutel
                      }
                    />
                  ),
                )}

                <BeheerActieKolomKop />
              </tr>
            </BeheerTabelKop>

            <tbody className="divide-y divide-slate-100">
              {zichtbareRijen.map(
                (rij) => (
                  <tr
                    key={rij.id}
                    className="group bg-white align-top transition hover:bg-emerald-50/40"
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

                    <td className="sticky right-0 w-20 min-w-20 z-10 has-[details[open]]:z-50 whitespace-nowrap border-l border-slate-200 bg-inherit px-3 py-3 text-left group-hover:bg-[#f7fcfa]">
                      {rij.magBeheren ? (
                        <OpvolgingSanctieActies
                          registratie={{
                            id: rij.id,
                          }}
                        />
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
          </BeheerTabel>
        </BeheerTabelScroll>
      )}
    </BeheerTabelKader>
  );
}

"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  herstelTerreincontrole,
} from "@/app/terreincontroles/dossier-actions";
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
  HerstelButton,
} from "@/components/CertificaatStatusButton";
import {
  OpvolgingSanctieHerstelKnop,
} from "@/components/OpvolgingSanctieHerstelKnop";
import TerreincontroleHerstelKnop from "@/components/TerreincontroleHerstelKnop";
import {
  beschikbareBeheerJaren,
  filterEnSorteerBeheerRijen,
  wijzigBeheerSortering,
  type BeheerDatumFilter,
  type BeheerTabelKolom,
  type BeheerTabelRij,
  type BeheerTabelSortering,
} from "@/lib/beheer-tabel";

export type VerwijderdeHerstelType =
  | "opvolging"
  | "terreincontrole-dossier"
  | "terreincontrole-planning"
  | "persoon"
  | "proces";

export type VerwijderdeBeheerTabelRij =
  BeheerTabelRij & {
    id: number;
    actieNaam?: string;
    magHerstellen?: boolean;
  };

type Props = {
  rijen: VerwijderdeBeheerTabelRij[];
  kolommen: BeheerTabelKolom[];
  herstelType: VerwijderdeHerstelType;
  zoekPlaceholder: string;
  legeTitel: string;
  legeBeschrijving: string;
  resultaatEnkelvoud: string;
  resultaatMeervoud: string;
};

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

function HerstelActie({
  rij,
  herstelType,
}: {
  rij: VerwijderdeBeheerTabelRij;
  herstelType: VerwijderdeHerstelType;
}) {
  if (rij.magHerstellen === false) {
    return (
      <span className="text-xs text-slate-400">
        —
      </span>
    );
  }

  if (herstelType === "opvolging") {
    return (
      <OpvolgingSanctieHerstelKnop
        id={rij.id}
      />
    );
  }

  if (
    herstelType ===
    "terreincontrole-planning"
  ) {
    return (
      <TerreincontroleHerstelKnop
        id={rij.id}
      />
    );
  }

  if (herstelType === "persoon") {
    return (
      <HerstelButton
        id={rij.id}
        soort="persoon"
        naam={rij.actieNaam}
      />
    );
  }

  if (herstelType === "proces") {
    return (
      <HerstelButton
        id={rij.id}
        soort="proces"
        naam={rij.actieNaam}
      />
    );
  }

  const actie =
    herstelTerreincontrole.bind(
      null,
      rij.id,
    );

  return (
    <form action={actie}>
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800"
      >
        Herstellen
      </button>
    </form>
  );
}

export function VerwijderdeBeheerTabel({
  rijen,
  kolommen,
  herstelType,
  zoekPlaceholder,
  legeTitel,
  legeBeschrijving,
  resultaatEnkelvoud,
  resultaatMeervoud,
}: Props) {
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
        kolommen,
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
        waarde.trim().length > 0,
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

        delete volgende[sleutel];

        return volgende;
      },
    );

    setDatumFilters(
      (huidige) => {
        const volgende = {
          ...huidige,
        };

        delete volgende[sleutel];

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
    kolom: BeheerTabelKolom,
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
    rij: VerwijderdeBeheerTabelRij,
    kolom: BeheerTabelKolom,
  ) {
    const waarde =
      rij[kolom.sleutel];

    if (
      kolom.type === "url" &&
      typeof waarde === "string" &&
      waarde
    ) {
      return (
        <a
          href={waarde}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          Openen
        </a>
      );
    }

    if (
      kolom.type === "badge" &&
      waarde
    ) {
      return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {toonWaarde(waarde)}
        </span>
      );
    }

    return toonWaarde(waarde);
  }

  return (
    <BeheerTabelKader
      titel="Overzicht"
      aantalTekst={
        <>
          {zichtbareRijen.length} van{" "}
          {rijen.length}{" "}
          {rijen.length === 1
            ? resultaatEnkelvoud
            : resultaatMeervoud}
        </>
      }
      zoekterm={zoekterm}
      zoekPlaceholder={
        zoekPlaceholder
      }
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
                      actieveKolom.sleutel
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
                              event.target
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
                      actieveKolom.sleutel
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
                              event.target
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
                        key={waarde}
                        value={waarde}
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
                    actieveKolom.sleutel
                  ] ?? ""
                }
                onChange={(
                  event,
                ) => {
                  setFilters(
                    (huidige) => ({
                      ...huidige,
                      [actieveKolom.sleutel]:
                        event.target
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
          titel={legeTitel}
          beschrijving={
            legeBeschrijving
          }
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

                    <td className="sticky right-0 z-10 w-20 min-w-20 whitespace-nowrap border-l border-slate-200 bg-inherit px-3 py-3 text-left group-hover:bg-[#f7fcfa]">
                      <HerstelActie
                        rij={rij}
                        herstelType={
                          herstelType
                        }
                      />
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

"use client";

import NextLink from "next/link";
import {
  type ComponentProps,
  useMemo,
  useState,
} from "react";
import {
  TerreincontroleFactuurSelect as BasisTerreincontroleFactuurSelect,
  TerreincontroleStatusSelect as BasisTerreincontroleStatusSelect,
} from "@/components/TerreincontroleSnelleVelden";

type TerreincontroleStatus =
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null;

export type TerreincontroleRij = {
  id: number;
  auditeur: string | null;
  factuurVerzonden: boolean;
  status: TerreincontroleStatus;

  inspectielocatie: string | null;
  bouwjaar: number | null;
  vloeroppervlakteM2:
    | string
    | null;

  datumPlaatsbezoek:
    | string
    | null;
  uurPlaatsbezoek:
    | string
    | null;

  ovamId: string | null;
  naamAdi: string | null;
  attestUrl: string | null;
  bedrijfsnaam: string | null;

  postcode: string | null;
  gemeente: string | null;
  straat: string | null;
  huisnummer: string | null;
  extraAdresDetails:
    | string
    | null;

  perceelGemeenteCode:
    | string
    | null;
  perceelAfdelingscode:
    | string
    | null;
  perceelSectieCode:
    | string
    | null;

  attestId: string;
  opmerkingen: string | null;
};

type TerreincontrolesTabelProps = {
  rijen: TerreincontroleRij[];
  magBeheren: boolean;
};

function formatteerDatum(
  waarde: string | null,
): string {
  if (!waarde) {
    return "—";
  }

  const datum = new Date(
    waarde,
  );

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

function maakGoogleMapsUrl(
  inspectielocatie:
    | string
    | null,
): string | null {
  const locatie =
    inspectielocatie?.trim();

  if (!locatie) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      locatie,
    )
  );
}

function toonWaarde(
  waarde:
    | string
    | number
    | null,
): string {
  if (
    waarde === null ||
    waarde === ""
  ) {
    return "—";
  }

  return String(waarde);
}

function bevatZoekterm(
  rij: TerreincontroleRij,
  zoekterm: string,
): boolean {
  const tekst = [
    rij.auditeur,
    rij.inspectielocatie,
    rij.bouwjaar,
    rij.vloeroppervlakteM2,
    rij.ovamId,
    rij.naamAdi,
    rij.bedrijfsnaam,
    rij.status,
    rij.postcode,
    rij.gemeente,
    rij.straat,
    rij.huisnummer,
    rij.extraAdresDetails,
    rij.perceelGemeenteCode,
    rij.perceelAfdelingscode,
    rij.perceelSectieCode,
    rij.attestId,
    rij.opmerkingen,
  ]
    .filter(
      (waarde) =>
        waarde !== null &&
        waarde !== "",
    )
    .join(" ")
    .toLocaleLowerCase(
      "nl-BE",
    );

  return tekst.includes(
    zoekterm,
  );
}

export function TerreincontrolesTabel({
  rijen,
  magBeheren,
}: TerreincontrolesTabelProps) {
  function Link(
    props: ComponentProps<typeof NextLink>,
  ) {
    const href =
      typeof props.href === "string"
        ? props.href
        : "";

    if (
      !magBeheren &&
      href.endsWith("/bewerken")
    ) {
      return null;
    }

    return <NextLink {...props} />;
  }

  function TerreincontroleStatusSelect(
    props: ComponentProps<
      typeof BasisTerreincontroleStatusSelect
    >,
  ) {
    if (!magBeheren) {
      return (
        <span className="font-semibold text-slate-700">
          {props.beginwaarde ??
            "Geen status"}
        </span>
      );
    }

    return (
      <BasisTerreincontroleStatusSelect
        {...props}
      />
    );
  }

  function TerreincontroleFactuurSelect(
    props: ComponentProps<
      typeof BasisTerreincontroleFactuurSelect
    >,
  ) {
    if (!magBeheren) {
      return (
        <span className="font-semibold text-slate-700">
          {props.beginwaarde
            ? "Ja"
            : "Nee"}
        </span>
      );
    }

    return (
      <BasisTerreincontroleFactuurSelect
        {...props}
      />
    );
  }
  const [
    zoekopdracht,
    setZoekopdracht,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALLE");

  const zichtbareRijen =
    useMemo(() => {
      const zoekterm =
        zoekopdracht
          .trim()
          .toLocaleLowerCase(
            "nl-BE",
          );

      return rijen.filter(
        (rij) => {
          if (
            statusFilter ===
              "GEEN" &&
            rij.status !== null
          ) {
            return false;
          }

          if (
            statusFilter !==
              "ALLE" &&
            statusFilter !==
              "GEEN" &&
            rij.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            zoekterm &&
            !bevatZoekterm(
              rij,
              zoekterm,
            )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      rijen,
      zoekopdracht,
      statusFilter,
    ]);

  function wisFilters() {
    setZoekopdracht("");
    setStatusFilter("ALLE");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[minmax(260px,1fr)_240px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Zoeken
            </span>

            <input
              type="search"
              value={
                zoekopdracht
              }
              onChange={(
                event,
              ) =>
                setZoekopdracht(
                  event.target
                    .value,
                )
              }
              placeholder="Zoek op locatie, ADI, bedrijf, OVAM-ID of Attest-ID..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </span>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value,
                )
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALLE">
                Alle statussen
              </option>

              <option value="ACTUEEL_ATTEST">
                Actueel attest
              </option>

              <option value="IN_OPMAAK">
                In opmaak
              </option>

              <option value="GEARCHIVEERD_ATTEST">
                Gearchiveerd attest
              </option>

              <option value="GEEN">
                Geen status
              </option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <p className="whitespace-nowrap text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {
                zichtbareRijen.length
              }
            </span>{" "}
            van {rijen.length}
          </p>

          {(zoekopdracht ||
            statusFilter !==
              "ALLE") && (
            <button
              type="button"
              onClick={
                wisFilters
              }
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Filters wissen
            </button>
          )}
        </div>
      </div>

      {zichtbareRijen.length ===
      0 ? (
        <div className="p-10 text-center">
          <p className="font-medium text-slate-900">
            Geen terreincontroles
            gevonden
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Pas de zoekopdracht
            of het statusfilter
            aan.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[4700px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-4 py-3">
                  Google Maps
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Acties
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Auditeur
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Status
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Factuur verzonden
                </th>


                <th className="border-b border-slate-200 px-4 py-3">
                  Inspectielocatie
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Bouwjaar
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Vloeroppervlakte (m²)
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Datum plaatsbezoek
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Uur plaatsbezoek
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Deskundige persoonsid
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Deskundige naam
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Deskundige kwaliteitspagina
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Naam asbestdeskundig bedrijf
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Postcode
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Gemeente
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Straat
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Huisnummer
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Extra adres details
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Perceel gemeente code
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Perceel afdelingscode
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Perceel sectie code
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Liggingsadres
                </th>

                <th className="border-b border-slate-200 px-4 py-3">
                  Opmerkingen
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {zichtbareRijen.map(
                (rij) => {
                  const googleMapsUrl =
                    maakGoogleMapsUrl(
                      rij.inspectielocatie,
                    );

                  return (
                    <tr
                      key={rij.id}
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3">
                        {googleMapsUrl ? (
                          <a
                            href={
                              googleMapsUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800"
                          >
                            Open kaart ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/terreincontroles/${rij.id}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          Bekijken
                        </Link>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {toonWaarde(
                          rij.auditeur,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <TerreincontroleStatusSelect
                          id={rij.id}
                          beginwaarde={
                            rij.status
                          }
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <TerreincontroleFactuurSelect
                          id={rij.id}
                          beginwaarde={
                            rij.factuurVerzonden
                          }
                        />
                      </td>


                      <td className="max-w-80 px-4 py-3">
                        <p className="whitespace-pre-wrap font-medium">
                          {toonWaarde(
                            rij.inspectielocatie,
                          )}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.bouwjaar,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.vloeroppervlakteM2,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {formatteerDatum(
                          rij.datumPlaatsbezoek,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.uurPlaatsbezoek,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {toonWaarde(
                          rij.ovamId,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.naamAdi,
                        )}
                      </td>

                      <td className="max-w-80 px-4 py-3">
                        {rij.attestUrl ? (
                          <a
                            href={
                              rij.attestUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all font-semibold text-blue-700 hover:underline"
                          >
                            Open kwaliteitspagina ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.bedrijfsnaam,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.postcode,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.gemeente,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.straat,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.huisnummer,
                        )}
                      </td>

                      <td className="max-w-64 px-4 py-3">
                        {toonWaarde(
                          rij.extraAdresDetails,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.perceelGemeenteCode,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.perceelAfdelingscode,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {toonWaarde(
                          rij.perceelSectieCode,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {rij.attestId}
                      </td>

                      <td className="max-w-96 px-4 py-3">
                        <p className="whitespace-pre-wrap">
                          {toonWaarde(
                            rij.opmerkingen,
                          )}
                        </p>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

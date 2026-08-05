"use client";

import Link from "next/link";
import {
  Fragment,
  useState,
} from "react";

export type NonConformiteitVoorkomen = {
  sleutel: string;
  typeControle:
    | "Deskcontrole"
    | "Terreincontrole";
  attestnummer: string;
  datumControle: string;
  href: string;
};

export type TopTienNonConformiteitRij = {
  ncId: string;
  parameter: string | null;
  omschrijving: string | null;
  groteImpact: string | null;
  categorie: string | null;
  aantal: number;
  voorkomens:
    NonConformiteitVoorkomen[];
};

function toonWaarde(
  waarde:
    | string
    | number
    | null
    | undefined,
) {
  if (
    waarde === null ||
    waarde === undefined ||
    String(waarde).trim() === ""
  ) {
    return "—";
  }

  return String(waarde);
}

export function TopTienNonConformiteiten({
  rijen,
}: {
  rijen: TopTienNonConformiteitRij[];
}) {
  const [
    geopendeNcIds,
    setGeopendeNcIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  function wisselRij(
    ncId: string,
  ) {
    setGeopendeNcIds(
      (huidigeWaarden) => {
        const volgendeWaarden =
          new Set(huidigeWaarden);

        if (
          volgendeWaarden.has(ncId)
        ) {
          volgendeWaarden.delete(
            ncId,
          );
        } else {
          volgendeWaarden.add(
            ncId,
          );
        }

        return volgendeWaarden;
      },
    );
  }

  if (rijen.length === 0) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <h2 className="text-xl font-bold text-slate-950">
            Top 10 meest gegeven
            non-conformiteiten
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Gebaseerd op het NC-ID van
            deskcontroles en gefinaliseerde
            terreincontroles.
          </p>
        </header>

        <div className="px-6 py-12 text-center">
          <p className="font-bold text-slate-900">
            Geen non-conformiteiten
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Voor dit persoonscertificaat
            zijn nog geen
            non-conformiteiten
            geregistreerd.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-5 sm:px-8">
        <h2 className="text-xl font-bold text-slate-950">
          Top 10 meest gegeven
          non-conformiteiten
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Klik op een rij om de
          attestnummers en datums te
          bekijken waarop deze
          non-conformiteit werd gevonden.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-5 py-3">
                <span className="sr-only">
                  Openen
                </span>
              </th>

              <th className="px-5 py-3">
                NC-ID
              </th>

              <th className="px-5 py-3">
                Parameter
              </th>

              <th className="px-5 py-3">
                Omschrijving
              </th>

              <th className="px-5 py-3">
                Grote impact
              </th>

              <th className="px-5 py-3">
                Categorie
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rijen.map((rij) => {
              const geopend =
                geopendeNcIds.has(
                  rij.ncId,
                );

              const detailId =
                `nc-details-${rij.ncId.replace(
                  /[^a-zA-Z0-9_-]/g,
                  "-",
                )}`;

              return (
                <Fragment key={rij.ncId}>
                  <tr
                    className={`cursor-pointer align-top transition hover:bg-emerald-50 ${
                      geopend
                        ? "bg-emerald-50"
                        : ""
                    }`}
                    onClick={() =>
                      wisselRij(rij.ncId)
                    }
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        aria-expanded={
                          geopend
                        }
                        aria-controls={
                          detailId
                        }
                        onClick={(
                          event,
                        ) => {
                          event.stopPropagation();
                          wisselRij(
                            rij.ncId,
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-400 hover:text-emerald-800"
                      >
                        <span
                          aria-hidden="true"
                          className={`transition-transform ${
                            geopend
                              ? "rotate-90"
                              : ""
                          }`}
                        >
                          ›
                        </span>

                        <span className="sr-only">
                          {geopend
                            ? "Details sluiten"
                            : "Details openen"}
                        </span>
                      </button>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-bold text-slate-950">
                        {rij.ncId}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        {rij.aantal}{" "}
                        {rij.aantal === 1
                          ? "keer"
                          : "keer"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {toonWaarde(
                        rij.parameter,
                      )}
                    </td>

                    <td className="max-w-xl whitespace-pre-wrap px-5 py-4">
                      {toonWaarde(
                        rij.omschrijving,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {toonWaarde(
                        rij.groteImpact,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {toonWaarde(
                        rij.categorie,
                      )}
                    </td>
                  </tr>

                  {geopend ? (
                    <tr
                      id={detailId}
                      className="bg-slate-50"
                    >
                      <td
                        colSpan={6}
                        className="px-6 py-5 sm:px-10"
                      >
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                            <h3 className="font-bold text-slate-950">
                              Gevonden in{" "}
                              {
                                rij.voorkomens
                                  .length
                              }{" "}
                              {rij.voorkomens
                                .length === 1
                                ? "controle"
                                : "controles"}
                            </h3>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[650px] text-left text-sm">
                              <thead className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="px-5 py-3">
                                    Type controle
                                  </th>

                                  <th className="px-5 py-3">
                                    Attestnummer
                                  </th>

                                  <th className="px-5 py-3">
                                    Datum
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {rij.voorkomens.map(
                                  (
                                    voorkomen,
                                  ) => (
                                    <tr
                                      key={
                                        voorkomen.sleutel
                                      }
                                      className="hover:bg-slate-50"
                                    >
                                      <td className="px-5 py-3">
                                        {
                                          voorkomen.typeControle
                                        }
                                      </td>

                                      <td className="px-5 py-3">
                                        <Link
                                          href={
                                            voorkomen.href
                                          }
                                          onClick={(
                                            event,
                                          ) =>
                                            event.stopPropagation()
                                          }
                                          className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                                        >
                                          {
                                            voorkomen.attestnummer
                                          }
                                        </Link>
                                      </td>

                                      <td className="whitespace-nowrap px-5 py-3">
                                        {
                                          voorkomen.datumControle
                                        }
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

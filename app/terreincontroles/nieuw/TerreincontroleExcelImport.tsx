"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  bevestigTerreincontrolesUitExcel,
  leesTerreincontrolesUitExcel,
  type TerreincontroleBevestigState,
  type TerreincontroleExcelRij,
  type TerreincontroleExcelState,
} from "../import-actions";

const TERREINCONTROLE_AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

const beginstatus:
  TerreincontroleExcelState = {};

const bevestigBeginstatus:
  TerreincontroleBevestigState = {};

function LadenKnop() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? "Excelbestand lezen..."
        : "Excelbestand laden"}
    </button>
  );
}

function BevestigKnop({
  uitgeschakeld,
  aantal,
}: {
  uitgeschakeld: boolean;
  aantal: number;
}) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending ||
        uitgeschakeld
      }
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Terreincontroles opslaan..."
        : `${aantal} geselecteerde rij(en) opslaan`}
    </button>
  );
}

function statusLabel(
  status:
    TerreincontroleExcelRij["status"],
): string {
  if (
    status ===
    "GEARCHIVEERD_ATTEST"
  ) {
    return "Gearchiveerd attest";
  }

  if (
    status ===
    "ACTUEEL_ATTEST"
  ) {
    return "Actueel attest";
  }

  if (
    status === "IN_OPMAAK"
  ) {
    return "In opmaak";
  }

  return "Geen status";
}

function toonTekst(
  waarde: string,
): string {
  return waarde.trim() || "—";
}

export default function TerreincontroleExcelImport() {
  const [
    state,
    formAction,
  ] = useActionState(
    leesTerreincontrolesUitExcel,
    beginstatus,
  );

  const [
    bevestigState,
    bevestigFormAction,
  ] = useActionState(
    bevestigTerreincontrolesUitExcel,
    bevestigBeginstatus,
  );

  const [rijen, setRijen] =
    useState<
      TerreincontroleExcelRij[]
    >([]);

  const [
    geselecteerdeSleutels,
    setGeselecteerdeSleutels,
  ] = useState<
    Set<string>
  >(new Set());

  const [
    standaardAuditeur,
    setStandaardAuditeur,
  ] = useState("");

  useEffect(() => {
    const nieuweRijen =
      state.rijen ?? [];

    setRijen(
      nieuweRijen,
    );

    setGeselecteerdeSleutels(
      new Set(
        nieuweRijen.map(
          (rij) =>
            rij.sleutel,
        ),
      ),
    );

    setStandaardAuditeur("");
  }, [state.rijen]);

  useEffect(() => {
    if (
      !bevestigState.succes
    ) {
      return;
    }

    setRijen([]);

    setGeselecteerdeSleutels(
      new Set(),
    );

    setStandaardAuditeur("");
  }, [
    bevestigState.succes,
    bevestigState.message,
  ]);

  const geselecteerdeRijen =
    useMemo(
      () =>
        rijen.filter(
          (rij) =>
            geselecteerdeSleutels.has(
              rij.sleutel,
            ),
        ),
      [
        rijen,
        geselecteerdeSleutels,
      ],
    );

  const allesGeselecteerd =
    rijen.length > 0 &&
    geselecteerdeRijen.length ===
      rijen.length;

  const importGegevens =
    JSON.stringify({
      bestandsnaam:
        state.bestandsnaam ?? "",

      rijen:
        geselecteerdeRijen.map(
          (rij) => ({
            excelRij:
              rij.excelRij,

            auditeur:
              rij.auditeur,

            factuurVerzonden:
              rij.factuurVerzonden,

            opmerkingen:
              rij.opmerkingen,

            inspectielocatie:
              rij.inspectielocatie,

            bouwjaar:
              rij.bouwjaar,

            vloeroppervlakteM2:
              rij.vloeroppervlakteM2,

            datumPlaatsbezoek:
              rij.datumPlaatsbezoek,

            uurPlaatsbezoek:
              rij.uurPlaatsbezoek,

            ovamId:
              rij.ovamId,

            naamAdi:
              rij.naamAdi,

            attestUrl:
              rij.attestUrl,

            bedrijfsnaam:
              rij.bedrijfsnaam,

            status:
              rij.status,

            postcode:
              rij.postcode,

            gemeente:
              rij.gemeente,

            straat:
              rij.straat,

            huisnummer:
              rij.huisnummer,

            extraAdresDetails:
              rij.extraAdresDetails,

            perceelGemeenteCode:
              rij.perceelGemeenteCode,

            perceelAfdelingscode:
              rij.perceelAfdelingscode,

            perceelSectieCode:
              rij.perceelSectieCode,

            attestId:
              rij.attestId,
          }),
        ),
    });

  function selecteerAlles() {
    if (
      allesGeselecteerd
    ) {
      setGeselecteerdeSleutels(
        new Set(),
      );

      return;
    }

    setGeselecteerdeSleutels(
      new Set(
        rijen.map(
          (rij) =>
            rij.sleutel,
        ),
      ),
    );
  }

  function wijzigSelectie(
    sleutel: string,
  ) {
    setGeselecteerdeSleutels(
      (huidige) => {
        const volgende =
          new Set(huidige);

        if (
          volgende.has(
            sleutel,
          )
        ) {
          volgende.delete(
            sleutel,
          );
        } else {
          volgende.add(
            sleutel,
          );
        }

        return volgende;
      },
    );
  }

  function wijzigRij(
    sleutel: string,
    wijzigingen:
      Partial<TerreincontroleExcelRij>,
  ) {
    setRijen(
      (huidigeRijen) =>
        huidigeRijen.map(
          (rij) =>
            rij.sleutel ===
            sleutel
              ? {
                  ...rij,
                  ...wijzigingen,
                }
              : rij,
        ),
    );
  }

  function wijzigStandaardAuditeur(
    waarde: string,
  ) {
    setStandaardAuditeur(
      waarde,
    );

    setRijen(
      (huidigeRijen) =>
        huidigeRijen.map(
          (rij) => ({
            ...rij,
            auditeur: waarde,
          }),
        ),
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">
          Plaatsbezoeken importeren
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Upload een Excelbestand met
          het werkblad
          &quot;Plaatsbezoeken&quot;.
          De gegevens worden eerst als
          voorbeeld getoond.
        </p>

        <form
          action={formAction}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="terreincontroleExcel"
              className="block text-sm font-semibold text-slate-700"
            >
              Excelbestand
            </label>

            <input
              id="terreincontroleExcel"
              name="excelBestand"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="mt-1.5 block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold"
            />

            {state.errors
              ?.excelBestand ? (
              <p className="mt-1.5 text-sm font-medium text-red-600">
                {
                  state.errors
                    .excelBestand
                }
              </p>
            ) : null}
          </div>

          <LadenKnop />
        </form>

        {state.message ? (
          <div
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
              state.succes
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}
      </div>

      {rijen.length > 0 ? (
        <>
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-sm">
                <label
                  htmlFor="standaardAuditeur"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Auditeur voor alle rijen
                </label>

                <select
                  id="standaardAuditeur"
                  value={
                    standaardAuditeur
                  }
                  onChange={(event) =>
                    wijzigStandaardAuditeur(
                      event.target.value,
                    )
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">
                    Kies een auditeur
                  </option>

                  {TERREINCONTROLE_AUDITEURS.map(
                    (auditeur) => (
                      <option
                        key={auditeur}
                        value={auditeur}
                      >
                        {auditeur}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="text-sm font-semibold text-slate-700">
                {
                  geselecteerdeRijen.length
                }{" "}
                van {rijen.length} rijen
                geselecteerd
              </div>
            </div>
          </div>

          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[4800px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-100">
                <tr>
                  <th className="sticky left-0 z-30 border-b border-r border-slate-300 bg-slate-100 px-3 py-3">
                    <label className="flex items-center gap-2 font-bold">
                      <input
                        type="checkbox"
                        checked={
                          allesGeselecteerd
                        }
                        onChange={
                          selecteerAlles
                        }
                        className="size-4 accent-emerald-700"
                      />

                      Selecteer
                    </label>
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Google Maps
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Excelrij
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Auditeur
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Inspectielocatie
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Bouwjaar
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Vloeroppervlakte (m²)
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Datum plaatsbezoek
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Uur plaatsbezoek
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Deskundige persoonsid
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Deskundige naam
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Deskundige kwaliteitspagina
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Naam asbestdeskundig bedrijf
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Status
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Postcode
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Gemeente
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Straat
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Huisnummer
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Extra adres details
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Perceel gemeente code
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Perceel afdelingscode
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Perceel sectie code
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Liggingsadres
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Controle
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rijen.map((rij) => {
                  const geselecteerd =
                    geselecteerdeSleutels.has(
                      rij.sleutel,
                    );

                  return (
                    <tr
                      key={
                        rij.sleutel
                      }
                      className={
                        geselecteerd
                          ? "bg-emerald-50/50"
                          : "bg-white opacity-60"
                      }
                    >
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={
                            geselecteerd
                          }
                          onChange={() =>
                            wijzigSelectie(
                              rij.sleutel,
                            )
                          }
                          className="size-4 accent-emerald-700"
                          aria-label={`Excelrij ${rij.excelRij} selecteren`}
                        />
                      </td>

                      <td className="px-3 py-3 align-top">
                        {rij.googleMapsUrl ? (
                          <a
                            href={
                              rij.googleMapsUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 font-bold text-white hover:bg-blue-800"
                          >
                            Open kaart ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3 align-top font-bold">
                        {rij.excelRij}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <select
                          value={
                            rij.auditeur
                          }
                          onChange={(
                            event,
                          ) =>
                            wijzigRij(
                              rij.sleutel,
                              {
                                auditeur:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          className="h-9 w-52 rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-emerald-600"
                        >
                          <option value="">
                            Kies auditeur
                          </option>

                          {TERREINCONTROLE_AUDITEURS.map(
                            (
                              auditeur,
                            ) => (
                              <option
                                key={
                                  auditeur
                                }
                                value={
                                  auditeur
                                }
                              >
                                {
                                  auditeur
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-72 whitespace-pre-wrap font-medium">
                          {toonTekst(
                            rij.inspectielocatie,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.bouwjaar,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.vloeroppervlakteM2,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {toonTekst(
                          rij.datumPlaatsbezoek,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {toonTekst(
                          rij.uurPlaatsbezoek,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <span className="whitespace-nowrap font-semibold">
                          {toonTekst(
                            rij.ovamId,
                          )}
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-52 font-semibold">
                          {toonTekst(
                            rij.naamAdi,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {rij.attestUrl ? (
                          <a
                            href={
                              rij.attestUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-80 break-all font-semibold text-blue-700 hover:underline"
                          >
                            {
                              rij.attestUrl
                            }
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-64 font-semibold">
                          {toonTekst(
                            rij.bedrijfsnaam,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <select
                          value={
                            rij.status ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            wijzigRij(
                              rij.sleutel,
                              {
                                status:
                                  event
                                    .target
                                    .value
                                    ? (event
                                        .target
                                        .value as TerreincontroleExcelRij["status"])
                                    : null,
                              },
                            )
                          }
                          className="h-9 w-52 rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-emerald-600"
                        >
                          <option value="">
                            Geen status
                          </option>

                          <option value="IN_OPMAAK">
                            In opmaak
                          </option>

                          <option value="ACTUEEL_ATTEST">
                            Actueel attest
                          </option>

                          <option value="GEARCHIVEERD_ATTEST">
                            Gearchiveerd attest
                          </option>
                        </select>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {statusLabel(
                            rij.status,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.postcode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-44">
                          {toonTekst(
                            rij.gemeente,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-52">
                          {toonTekst(
                            rij.straat,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.huisnummer,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-56 whitespace-pre-wrap">
                          {toonTekst(
                            rij.extraAdresDetails,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.perceelGemeenteCode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.perceelAfdelingscode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.perceelSectieCode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <span className="block w-72 break-all font-mono text-[10px]">
                          {rij.attestId ||
                            "Geen Attest-ID gevonden"}
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {rij.waarschuwingen
                          .length ===
                        0 ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                            Geldig
                          </span>
                        ) : (
                          <ul className="w-72 space-y-1 text-[10px] font-medium text-red-700">
                            {rij.waarschuwingen.map(
                              (
                                waarschuwing,
                              ) => (
                                <li
                                  key={
                                    waarschuwing
                                  }
                                >
                                  {
                                    waarschuwing
                                  }
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Selecteer de gewenste
                  plaatsbezoeken en kies
                  voor iedere geselecteerde
                  rij een auditeur.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Het Attest-ID wordt uit
                  Liggingsadres attest-id
                  gelezen. Als dat niet
                  mogelijk is, wordt het
                  automatisch uit de
                  deskundige
                  kwaliteitspagina gehaald.
                </p>
              </div>

              <form
                action={
                  bevestigFormAction
                }
              >
                <input
                  type="hidden"
                  name="importGegevens"
                  value={
                    importGegevens
                  }
                />

                <BevestigKnop
                  uitgeschakeld={
                    geselecteerdeRijen.length ===
                    0
                  }
                  aantal={
                    geselecteerdeRijen.length
                  }
                />
              </form>
            </div>

            {bevestigState.message ? (
              <div
                role="status"
                className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  bevestigState.succes
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {
                  bevestigState.message
                }
              </div>
            ) : null}

            {bevestigState.fouten &&
            bevestigState.fouten
              .length > 0 ? (
              <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3">
                <ul className="space-y-1 text-xs font-medium text-red-800">
                  {bevestigState.fouten.map(
                    (
                      fout,
                      index,
                    ) => (
                      <li
                        key={`${index}-${fout}`}
                      >
                        {fout}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
          </footer>
        </>
      ) : null}
    </section>
  );
}

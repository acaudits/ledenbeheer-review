"use client";

import Link from "next/link";
import {
  useState,
  useTransition,
} from "react";

import {
  analyseerNaFinalisatieBatch,
  importeerNaFinalisatieBatch,
  type NaFinalisatieBulkResultaat,
} from "@/app/na-finalisatie/bulk-import-actions";

const bestandStijl =
  "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold";

export function NaFinalisatieBulkImport() {
  const [
    referentie,
    setReferentie,
  ] = useState<File | null>(
    null,
  );

  const [
    terreinBestanden,
    setTerreinBestanden,
  ] = useState<File[]>([]);

  const [
    resultaat,
    setResultaat,
  ] =
    useState<NaFinalisatieBulkResultaat | null>(
      null,
    );

  const [
    previewBevestigd,
    setPreviewBevestigd,
  ] = useState(false);

  const [
    pending,
    startTransition,
  ] = useTransition();

  function wisPreview() {
    setResultaat(null);
    setPreviewBevestigd(false);
  }

  function maakFormData() {
    const formData =
      new FormData();

    if (referentie) {
      formData.set(
        "referentieBestand",
        referentie,
      );
    }

    for (
      const bestand
      of terreinBestanden
    ) {
      formData.append(
        "terreinBestanden",
        bestand,
      );
    }

    return formData;
  }

  function maakPreview() {
    startTransition(
      async () => {
        const antwoord =
          await analyseerNaFinalisatieBatch(
            maakFormData(),
          );

        setResultaat(
          antwoord,
        );

        setPreviewBevestigd(
          antwoord.succes &&
            antwoord.resultaten.some(
              (rij) =>
                rij.status ===
                "GELDIG",
            ),
        );
      },
    );
  }

  function bevestigImport() {
    startTransition(
      async () => {
        const antwoord =
          await importeerNaFinalisatieBatch(
            maakFormData(),
          );

        setResultaat(
          antwoord,
        );

        setPreviewBevestigd(
          false,
        );
      },
    );
  }

  const aantalGeldig =
    resultaat?.resultaten.filter(
      (rij) =>
        rij.status === "GELDIG",
    ).length ?? 0;

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
        Bulkimport
      </p>

      <h2 className="mt-1 text-xl font-black text-slate-950">
        Na finalisatie in bulk invoeren
      </h2>

      <p className="mt-2 max-w-4xl text-sm text-slate-600">
        Voeg eerst het bestand met het
        werkblad &quot;Na Finalisatie&quot;
        toe. Voeg daarna de
        terreincontrolebestanden toe.
        Je kunt maximaal 500 bestanden
        selecteren, met een totale
        uploadgrootte van maximaal 250 MB.
        Er wordt niets opgeslagen voordat
        je de preview controleert en de
        import bevestigt.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          1. Referentiebestand *
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={
              bestandStijl
            }
            onChange={(
              event,
            ) => {
              setReferentie(
                event.target
                  .files?.[0] ??
                  null,
              );

              wisPreview();
            }}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Gebruik `na finalisatie data.xlsx`.
            Alleen het geschikte werkblad
            wordt gelezen.
          </span>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          2. Terreincontrolebestanden *
          <input
            type="file"
            multiple
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={
              bestandStijl
            }
            onChange={(
              event,
            ) => {
              setTerreinBestanden(
                Array.from(
                  event.target
                    .files ?? [],
                ),
              );

              wisPreview();
            }}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {
              terreinBestanden.length
            }{" "}
            bestand(en) geselecteerd.
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={
            pending ||
            !referentie ||
            terreinBestanden.length ===
              0
          }
          onClick={
            maakPreview
          }
          className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-700 bg-white px-5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          {pending
            ? "Controleren..."
            : "Preview controleren"}
        </button>

        {previewBevestigd &&
        aantalGeldig > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={
              bevestigImport
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
          >
            {pending
              ? "Importeren..."
              : `${aantalGeldig} geldige registraties importeren`}
          </button>
        ) : null}
      </div>

      {resultaat ? (
        <div className="mt-5 space-y-4">
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              resultaat.succes
                ? "border-emerald-200 bg-white text-emerald-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {resultaat.message}

            {resultaat
              .referentieWerkblad ? (
              <span className="mt-1 block text-xs font-normal">
                Werkblad:{" "}
                {
                  resultaat
                    .referentieWerkblad
                }
                . Referentierijen:{" "}
                {
                  resultaat
                    .aantalReferentierijen
                }
                .
              </span>
            ) : null}
          </div>

          {resultaat.resultaten
            .length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">
                      Bestand
                    </th>
                    <th className="px-4 py-3">
                      Attestnummer
                    </th>
                    <th className="px-4 py-3">
                      Bron-ID
                    </th>
                    <th className="px-4 py-3">
                      Datum
                    </th>
                    <th className="px-4 py-3">
                      Status
                    </th>
                    <th className="px-4 py-3">
                      Resultaat
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {resultaat.resultaten.map(
                    (
                      rij,
                      index,
                    ) => (
                      <tr
                        key={`${rij.bestandsnaam}-${index}`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {
                            rij.bestandsnaam
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            rij.attestnummer ||
                            "—"
                          }
                        </td>
                        <td className="px-4 py-3">
                          {rij.bronId ||
                            "—"}
                        </td>
                        <td className="px-4 py-3">
                          {
                            rij.datumNaFinalisatie ||
                            "—"
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              rij.status ===
                                "GEIMPORTEERD" ||
                              rij.status ===
                                "GELDIG"
                                ? "bg-emerald-100 text-emerald-800"
                                : rij.status ===
                                    "OVERGESLAGEN" ||
                                  rij.status ===
                                    "WAARSCHUWING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {
                              rij.status
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rij.registratieId ? (
                            <Link
                              href={`/na-finalisatie/${rij.registratieId}`}
                              className="font-bold text-emerald-700 hover:underline"
                            >
                              {
                                rij.message
                              }
                            </Link>
                          ) : (
                            rij.message
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  importeerDeskcontroleBatch,
  type BulkImportBestandResultaat,
} from "@/app/deskcontroles/bulk-import-actions";

const BATCHGROOTTE = 10;
const MAXIMAAL_AANTAL_BESTANDEN =
  2000;
const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

function csvCel(
  waarde: string | number,
) {
  const tekst =
    String(waarde);

  return `"${tekst.replace(
    /"/g,
    '""',
  )}"`;
}

function statusLabel(
  status:
    BulkImportBestandResultaat["status"],
) {
  if (
    status === "GEIMPORTEERD"
  ) {
    return "Geïmporteerd";
  }

  if (
    status === "OVERGESLAGEN"
  ) {
    return "Overgeslagen";
  }

  return "Mislukt";
}

export default function BulkDeskcontroleImport() {
  const router = useRouter();

  const [
    datumregister,
    setDatumregister,
  ] = useState<File | null>(
    null,
  );

  const [
    bestanden,
    setBestanden,
  ] = useState<File[]>([]);

  const [
    resultaten,
    setResultaten,
  ] = useState<
    BulkImportBestandResultaat[]
  >([]);

  const [
    bezig,
    setBezig,
  ] = useState(false);

  const [
    gestopt,
    setGestopt,
  ] = useState(false);

  const [
    foutmelding,
    setFoutmelding,
  ] = useState("");

  const [
    verwerkt,
    setVerwerkt,
  ] = useState(0);

  const [
    huidigeBatch,
    setHuidigeBatch,
  ] = useState(0);

  const [
    hervatVanaf,
    setHervatVanaf,
  ] = useState(0);

  const annulerenRef =
    useRef(false);

  const totalen =
    useMemo(() => {
      const geimporteerd =
        resultaten.filter(
          (resultaat) =>
            resultaat.status ===
            "GEIMPORTEERD",
        ).length;

      const overgeslagen =
        resultaten.filter(
          (resultaat) =>
            resultaat.status ===
            "OVERGESLAGEN",
        ).length;

      const mislukt =
        resultaten.filter(
          (resultaat) =>
            resultaat.status ===
            "MISLUKT",
        ).length;

      const vaststellingen =
        resultaten
          .filter(
            (resultaat) =>
              resultaat.status ===
              "GEIMPORTEERD",
          )
          .reduce(
            (
              totaal,
              resultaat,
            ) =>
              totaal +
              resultaat
                .aantalVaststellingen,
            0,
          );

      return {
        geimporteerd,
        overgeslagen,
        mislukt,
        vaststellingen,
      };
    }, [resultaten]);

  const totaalBatches =
    Math.ceil(
      bestanden.length /
        BATCHGROOTTE,
    );

  const voortgang =
    bestanden.length > 0
      ? Math.round(
          (verwerkt /
            bestanden.length) *
            100,
        )
      : 0;

  function kiesDatumregister(
    bestand:
      | File
      | undefined,
  ) {
    setFoutmelding("");

    if (!bestand) {
      setDatumregister(null);
      return;
    }

    if (
      !bestand.name
        .toLowerCase()
        .endsWith(".xlsx")
    ) {
      setDatumregister(null);
      setFoutmelding(
        "Het datumregister moet een .xlsx-bestand zijn.",
      );
      return;
    }

    setDatumregister(
      bestand,
    );
  }

  function kiesDeskcontroleBestanden(
    selectie: FileList | null,
  ) {
    setFoutmelding("");
    setResultaten([]);
    setVerwerkt(0);
    setHervatVanaf(0);
    setGestopt(false);

    if (!selectie) {
      setBestanden([]);
      return;
    }

    const gekozen =
      Array.from(selectie)
        .filter(
          (bestand) =>
            bestand.name
              .toLowerCase()
              .endsWith(
                ".xlsx",
              ),
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "nl-BE",
          ),
        );

    if (
      gekozen.length >
      MAXIMAAL_AANTAL_BESTANDEN
    ) {
      setBestanden([]);
      setFoutmelding(
        `Selecteer maximaal ${MAXIMAAL_AANTAL_BESTANDEN} bestanden.`,
      );
      return;
    }

    const teGroot =
      gekozen.find(
        (bestand) =>
          bestand.size >
          MAXIMALE_BESTANDSGROOTTE,
      );

    if (teGroot) {
      setBestanden([]);
      setFoutmelding(
        `${teGroot.name} is groter dan 15 MB.`,
      );
      return;
    }

    if (
      gekozen.length === 0
    ) {
      setBestanden([]);
      setFoutmelding(
        "Er werden geen .xlsx-bestanden geselecteerd.",
      );
      return;
    }

    setBestanden(
      gekozen,
    );
  }

  async function verwerkVanaf(
    startIndex: number,
    bestaandeResultaten:
      BulkImportBestandResultaat[],
  ) {
    if (
      !datumregister ||
      bestanden.length === 0
    ) {
      setFoutmelding(
        "Selecteer eerst het datumregister en de deskcontrolebestanden.",
      );
      return;
    }

    setBezig(true);
    setGestopt(false);
    setFoutmelding("");
    annulerenRef.current =
      false;

    let verzameldeResultaten = [
      ...bestaandeResultaten,
    ];

    for (
      let index = startIndex;
      index < bestanden.length;
      index += BATCHGROOTTE
    ) {
      if (
        annulerenRef.current
      ) {
        setHervatVanaf(
          index,
        );
        setGestopt(true);
        break;
      }

      const batch =
        bestanden.slice(
          index,
          index +
            BATCHGROOTTE,
        );

      setHuidigeBatch(
        Math.floor(
          index /
            BATCHGROOTTE,
        ) + 1,
      );

      const formData =
        new FormData();

      formData.set(
        "datumregister",
        datumregister,
      );

      for (
        const bestand of batch
      ) {
        formData.append(
          "excelBestanden",
          bestand,
        );
      }

      try {
        const resultaat =
          await importeerDeskcontroleBatch(
            formData,
          );

        if (
          !resultaat.succes &&
          resultaat.resultaten
            .length === 0
        ) {
          setFoutmelding(
            resultaat.message,
          );
          setHervatVanaf(
            index,
          );
          setGestopt(true);
          break;
        }

        verzameldeResultaten = [
          ...verzameldeResultaten,
          ...resultaat.resultaten,
        ];

        setResultaten(
          verzameldeResultaten,
        );

        setVerwerkt(
          Math.min(
            index +
              batch.length,
            bestanden.length,
          ),
        );

        setHervatVanaf(
          index +
            batch.length,
        );
      } catch (error) {
        console.error(
          "Bulkbatch mislukt:",
          error,
        );

        setFoutmelding(
          `Batch ${
            Math.floor(
              index /
                BATCHGROOTTE,
            ) + 1
          } kon niet worden verwerkt. Je kunt vanaf deze batch hervatten.`,
        );

        setHervatVanaf(
          index,
        );
        setGestopt(true);
        break;
      }
    }

    setBezig(false);
    router.refresh();
  }

  function startImport() {
    setResultaten([]);
    setVerwerkt(0);
    setHervatVanaf(0);

    void verwerkVanaf(
      0,
      [],
    );
  }

  function hervatImport() {
    void verwerkVanaf(
      hervatVanaf,
      resultaten,
    );
  }

  function stopImport() {
    annulerenRef.current =
      true;
  }

  function downloadRapport() {
    const koppen = [
      "Bestandsnaam",
      "Attestnummer",
      "Finalisatie Datum",
      "Status",
      "Deskcontrole-ID",
      "Aantal vaststellingen",
      "Melding",
    ];

    const regels = [
      koppen
        .map(csvCel)
        .join(";"),
      ...resultaten.map(
        (resultaat) =>
          [
            resultaat.bestandsnaam,
            resultaat.attestnummer,
            resultaat.finalisatieDatum,
            statusLabel(
              resultaat.status,
            ),
            resultaat.deskcontroleId ??
              "",
            resultaat.aantalVaststellingen,
            resultaat.message,
          ]
            .map(csvCel)
            .join(";"),
      ),
    ];

    const blob = new Blob(
      [
        "\uFEFF" +
          regels.join(
            "\r\n",
          ),
      ],
      {
        type: "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;
    link.download =
      `deskcontrole-bulkimport-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(
      url,
    );
  }

  return (
    <section className="border-b border-slate-200 bg-emerald-50/50 px-6 py-6 sm:px-8">
      <div className="rounded-2xl border border-emerald-300 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Bulkimport
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Meerdere deskcontroles tegelijk importeren
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Selecteer het datumregister en daarna alle
            deskcontrolebestanden. De bestanden worden automatisch
            in batches van {BATCHGROOTTE} verwerkt. Je hoeft ze maar
            één keer te selecteren.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <label
              htmlFor="bulk-datumregister"
              className="block text-sm font-bold text-slate-900"
            >
              1. Datumregister
            </label>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Werkblad <strong>OVAM attesten</strong>, kolom A{" "}
              <strong>attestNummer</strong> en kolom B{" "}
              <strong>uitgegevenOp</strong>.
            </p>

            <input
              id="bulk-datumregister"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={bezig}
              onChange={(event) =>
                kiesDatumregister(
                  event.target
                    .files?.[0],
                )
              }
              className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            {datumregister ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                {datumregister.name}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <label
              htmlFor="bulk-deskcontroles"
              className="block text-sm font-bold text-slate-900"
            >
              2. Deskcontrolebestanden
            </label>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Selecteer alle .xlsx-bestanden tegelijk. Gebruik in
              het bestandsvenster eventueel Cmd+A.
            </p>

            <input
              id="bulk-deskcontroles"
              type="file"
              multiple
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={bezig}
              onChange={(event) =>
                kiesDeskcontroleBestanden(
                  event.target.files,
                )
              }
              className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <p className="mt-2 text-xs font-semibold text-slate-700">
              {bestanden.length} bestand(en) geselecteerd
            </p>
          </div>
        </div>

        {foutmelding ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {foutmelding}
          </div>
        ) : null}

        {(bezig ||
          verwerkt > 0 ||
          resultaten.length > 0) ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">
                {verwerkt} van {bestanden.length} verwerkt
              </p>

              <p className="text-xs font-semibold text-slate-500">
                Batch {huidigeBatch || 0} van {totaalBatches}
              </p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{
                  width: `${voortgang}%`,
                }}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <ResultaatVak
                label="Geïmporteerd"
                waarde={
                  totalen.geimporteerd
                }
                kleur="groen"
              />

              <ResultaatVak
                label="Overgeslagen"
                waarde={
                  totalen.overgeslagen
                }
                kleur="oranje"
              />

              <ResultaatVak
                label="Mislukt"
                waarde={
                  totalen.mislukt
                }
                kleur="rood"
              />

              <ResultaatVak
                label="Vaststellingen"
                waarde={
                  totalen.vaststellingen
                }
              />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          {!bezig &&
          !gestopt ? (
            <button
              type="button"
              disabled={
                !datumregister ||
                bestanden.length === 0
              }
              onClick={startImport}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Bulkimport starten
            </button>
          ) : null}

          {bezig ? (
            <button
              type="button"
              onClick={stopImport}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-900"
            >
              Stoppen na huidige batch
            </button>
          ) : null}

          {!bezig &&
          gestopt &&
          hervatVanaf <
            bestanden.length ? (
            <button
              type="button"
              onClick={hervatImport}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white"
            >
              Hervatten vanaf bestand {hervatVanaf + 1}
            </button>
          ) : null}

          {resultaten.length >
          0 ? (
            <button
              type="button"
              onClick={downloadRapport}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700"
            >
              Importverslag downloaden
            </button>
          ) : null}
        </div>

        {resultaten.length >
        0 ? (
          <details className="mt-5 rounded-2xl border border-slate-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-900">
              Resultaten per bestand bekijken
            </summary>

            <div className="max-h-[32rem] overflow-auto border-t border-slate-200">
              <table className="min-w-[1100px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">
                      Bestand
                    </th>
                    <th className="px-4 py-3">
                      Attestnummer
                    </th>
                    <th className="px-4 py-3">
                      Finalisatie
                    </th>
                    <th className="px-4 py-3">
                      Status
                    </th>
                    <th className="px-4 py-3">
                      Vaststellingen
                    </th>
                    <th className="px-4 py-3">
                      Melding
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {resultaten.map(
                    (
                      resultaat,
                      index,
                    ) => (
                      <tr
                        key={`${resultaat.bestandsnaam}-${index}`}
                        className="border-t border-slate-100 align-top"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {resultaat.bestandsnaam}
                        </td>
                        <td className="px-4 py-3">
                          {resultaat.attestnummer ||
                            "—"}
                        </td>
                        <td className="px-4 py-3">
                          {resultaat.finalisatieDatum ||
                            "—"}
                        </td>
                        <td className="px-4 py-3">
                          {statusLabel(
                            resultaat.status,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {
                            resultaat.aantalVaststellingen
                          }
                        </td>
                        <td className="max-w-lg whitespace-pre-wrap px-4 py-3">
                          {resultaat.message}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function ResultaatVak({
  label,
  waarde,
  kleur = "standaard",
}: {
  label: string;
  waarde: number;
  kleur?:
    | "standaard"
    | "groen"
    | "oranje"
    | "rood";
}) {
  const stijl = {
    standaard:
      "border-slate-200 bg-white text-slate-900",
    groen:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    oranje:
      "border-amber-200 bg-amber-50 text-amber-900",
    rood:
      "border-red-200 bg-red-50 text-red-900",
  }[kleur];

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${stijl}`}
    >
      <p className="text-xs font-semibold opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">
        {waarde}
      </p>
    </div>
  );
}

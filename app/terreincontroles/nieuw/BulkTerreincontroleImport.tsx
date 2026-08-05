"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  importeerTerreincontroleBatch,
  type TerreincontroleBulkResultaat,
} from "@/app/terreincontroles/bulk-import-actions";

const BATCHGROOTTE = 10;
const MAXIMAAL_AANTAL_BESTANDEN = 1000;
const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

function csvCel(
  waarde: string | number,
) {
  return `"${String(
    waarde,
  ).replace(/"/g, '""')}"`;
}

function statusLabel(
  status:
    TerreincontroleBulkResultaat["status"],
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

export default function BulkTerreincontroleImport() {
  const router = useRouter();

  const [
    bestanden,
    setBestanden,
  ] = useState<File[]>([]);

  const [
    resultaten,
    setResultaten,
  ] = useState<
    TerreincontroleBulkResultaat[]
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

  function kiesBestanden(
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
              .endsWith(".xlsx"),
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
      TerreincontroleBulkResultaat[],
  ) {
    if (bestanden.length === 0) {
      setFoutmelding(
        "Selecteer eerst de terreincontrolebestanden.",
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
        setHervatVanaf(index);
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
          await importeerTerreincontroleBatch(
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
          setHervatVanaf(index);
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
          "Terreincontrolebulkbatch mislukt:",
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

        setHervatVanaf(index);
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

  function downloadRapport() {
    const regels = [
      [
        "Bestandsnaam",
        "Attestnummer",
        "Status",
        "Terreincontrole-ID",
        "Aantal non-conformiteiten",
        "Melding",
      ]
        .map(csvCel)
        .join(";"),

      ...resultaten.map(
        (resultaat) =>
          [
            resultaat.bestandsnaam,
            resultaat.attestnummer,
            statusLabel(
              resultaat.status,
            ),
            resultaat
              .terreincontroleId ??
              "",
            resultaat
              .aantalVaststellingen,
            resultaat.message,
          ]
            .map(csvCel)
            .join(";"),
      ),
    ];

    const blob = new Blob(
      [
        "\uFEFF" +
          regels.join("\r\n"),
      ],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `terreincontrole-bulkimport-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-3xl border border-emerald-300 bg-emerald-50/60 p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
        Bulkimport
      </p>

      <h2 className="mt-2 text-xl font-bold text-slate-950">
        Meerdere terreincontroles tegelijk importeren
      </h2>

      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
        Selecteer alle terreincontrolebestanden tegelijk.
        Ze worden automatisch in batches van{" "}
        {BATCHGROOTTE}  verwerkt. Non-conformiteiten worden
        per terreincontrole mee geïmporteerd.
      </p>

      <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-500">
        Cel B7 wordt gekoppeld aan een actief
        persoonscertificaat. Cel C7 wordt bij deze
        bulkimport volledig genegeerd.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <label
          htmlFor="bulk-terreincontroles"
          className="block text-sm font-bold text-slate-900"
        >
          Terreincontrolebestanden
        </label>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Selecteer alle .xlsx-bestanden. Gebruik in het
          bestandsvenster eventueel Cmd+A.
        </p>

        <input
          id="bulk-terreincontroles"
          type="file"
          multiple
          disabled={bezig}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) =>
            kiesBestanden(
              event.target.files,
            )
          }
          className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />

        <p className="mt-2 text-xs font-semibold text-slate-700">
          {bestanden.length} bestand(en) geselecteerd
        </p>
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
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap justify-between gap-3">
            <p className="text-sm font-bold">
              {verwerkt} van {bestanden.length} verwerkt
            </p>

            <p className="text-xs font-semibold text-slate-500">
              Batch {huidigeBatch || 0} van {totaalBatches}
            </p>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-600"
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
            />

            <ResultaatVak
              label="Overgeslagen"
              waarde={
                totalen.overgeslagen
              }
            />

            <ResultaatVak
              label="Mislukt"
              waarde={
                totalen.mislukt
              }
            />

            <ResultaatVak
              label="Non-conformiteiten"
              waarde={
                totalen.vaststellingen
              }
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {!bezig &&
        !gestopt ? (
          <button
            type="button"
            disabled={
              bestanden.length === 0
            }
            onClick={startImport}
            className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white disabled:bg-slate-300"
          >
            Bulkimport starten
          </button>
        ) : null}

        {bezig ? (
          <button
            type="button"
            onClick={() => {
              annulerenRef.current =
                true;
            }}
            className="h-11 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-900"
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
            className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white"
          >
            Hervatten vanaf bestand {hervatVanaf + 1}
          </button>
        ) : null}

        {resultaten.length > 0 ? (
          <button
            type="button"
            onClick={downloadRapport}
            className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700"
          >
            Importverslag downloaden
          </button>
        ) : null}
      </div>

      {resultaten.length > 0 ? (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
            Resultaten per bestand bekijken
          </summary>

          <div className="max-h-[32rem] overflow-auto border-t">
            <table className="min-w-[900px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-3">
                    Bestand
                  </th>
                  <th className="px-4 py-3">
                    Attestnummer
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">

                    Non-conformiteiten
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
                      className="border-t align-top"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {resultaat.bestandsnaam}
                      </td>
                      <td className="px-4 py-3">
                        {resultaat.attestnummer ||
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        {statusLabel(
                          resultaat.status,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {
                          resultaat
                            .aantalVaststellingen
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
    </section>
  );
}

function ResultaatVak({
  label,
  waarde,
}: {
  label: string;
  waarde: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-950">
        {waarde}
      </p>
    </div>
  );
}

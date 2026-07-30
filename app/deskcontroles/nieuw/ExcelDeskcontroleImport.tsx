"use client";

import {
  useActionState,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
  importeerDeskcontroleUitExcel,
  type ExcelImportState,
} from "@/app/deskcontroles/import-actions";

const beginStatus: ExcelImportState = {};

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

type ImportKnopProps = {
  kanImporteren: boolean;
};

function ImportKnop({
  kanImporteren,
}: ImportKnopProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending || !kanImporteren
      }
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
    >
      {pending
        ? "Excelbestand verwerken..."
        : "Deskcontrole importeren"}
    </button>
  );
}

export default function ExcelDeskcontroleImport() {
  const [status, formAction] =
    useActionState(
      importeerDeskcontroleUitExcel,
      beginStatus,
    );

  const [
    finalisatieDatum,
    setFinalisatieDatum,
  ] = useState("");

  const [bestandsnaam, setBestandsnaam] =
    useState("");

  const [heeftBestand, setHeeftBestand] =
    useState(false);

  const [clientFout, setClientFout] =
    useState("");

  const kanBestandKiezen =
    finalisatieDatum.length > 0;

  const kanImporteren =
    kanBestandKiezen &&
    heeftBestand &&
    !clientFout;

  function controleerBestand(
    bestand: File | undefined,
  ) {
    setClientFout("");
    setBestandsnaam("");
    setHeeftBestand(false);

    if (!bestand) {
      return;
    }

    if (
      !bestand.name
        .toLocaleLowerCase("nl-BE")
        .endsWith(".xlsx")
    ) {
      setClientFout(
        "Alleen .xlsx-bestanden worden ondersteund.",
      );
      return;
    }

    if (
      bestand.size >
      MAXIMALE_BESTANDSGROOTTE
    ) {
      setClientFout(
        "Het Excelbestand mag maximaal 15 MB groot zijn.",
      );
      return;
    }

    setBestandsnaam(bestand.name);
    setHeeftBestand(true);
  }

  return (
    <section className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Excel-import
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Deskcontrole uit Excel
              toevoegen
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Importeer automatisch de
              deskcontrolegegevens en alle
              vaststellingen uit het tabblad{" "}
              <strong>
                Deskcontrole samenvatting
              </strong>
              .
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            .xlsx
          </span>
        </div>

        <form
          action={formAction}
          className="mt-5 space-y-5"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label
                htmlFor="excel-finalisatieDatum"
                className="block text-sm font-bold text-slate-800"
              >
                1. Finalisatie Datum
              </label>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Deze datum is verplicht.
                Deadline Correctie wordt
                automatisch berekend als
                deze datum plus 30 dagen.
              </p>

              <input
                id="excel-finalisatieDatum"
                name="finalisatieDatum"
                type="date"
                value={finalisatieDatum}
                onChange={(event) => {
                  setFinalisatieDatum(
                    event.target.value,
                  );
                  setClientFout("");
                }}
                required
                aria-invalid={
                  Boolean(
                    status.errors
                      ?.finalisatieDatum,
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />

              {status.errors
                ?.finalisatieDatum ? (
                <p
                  role="alert"
                  className="mt-2 text-sm font-medium text-red-700"
                >
                  {
                    status.errors
                      .finalisatieDatum
                  }
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="excel-bestand"
                className="block text-sm font-bold text-slate-800"
              >
                2. Excelbestand
              </label>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Het bestandsveld wordt pas
                actief nadat je de
                Finalisatie Datum hebt
                ingevuld.
              </p>

              <input
                id="excel-bestand"
                name="excelBestand"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={!kanBestandKiezen}
                required
                onChange={(event) =>
                  controleerBestand(
                    event.target
                      .files?.[0],
                  )
                }
                aria-invalid={Boolean(
                  status.errors
                    ?.excelBestand ||
                    clientFout,
                )}
                className="mt-2 block min-h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:min-h-11 file:border-0 file:bg-emerald-700 file:px-4 file:text-sm file:font-bold file:text-white hover:file:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
              />

              {!kanBestandKiezen ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Vul eerst de Finalisatie
                  Datum in.
                </p>
              ) : null}

              {bestandsnaam &&
              !clientFout ? (
                <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  Geselecteerd:{" "}
                  {bestandsnaam}
                </p>
              ) : null}

              {clientFout ? (
                <p
                  role="alert"
                  className="mt-2 text-sm font-medium text-red-700"
                >
                  {clientFout}
                </p>
              ) : null}

              {status.errors
                ?.excelBestand ? (
                <p
                  role="alert"
                  className="mt-2 text-sm font-medium text-red-700"
                >
                  {
                    status.errors
                      .excelBestand
                  }
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">
              De importer gebruikt:
            </h3>

            <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-2">
              <li>
                • Alleen tabblad
                “Deskcontrole
                samenvatting”
              </li>

              <li>
                • A5 voor
                attestnummer
              </li>

              <li>
                • A8 voor de
                attesthyperlink
              </li>

              <li>
                • B7 voor de
                OVAM-ID
              </li>

              <li>
                • C7 voor het
                KBO-nummer
              </li>

              <li>
                • E13 voor Datum
                controle
              </li>

              <li>
                • G13 voor
                Auditeur
              </li>

              <li>
                • Vanaf rij 16
                kolommen A t/m H
              </li>
            </ul>
          </div>

          {status.message ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {status.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              De deskcontrole en de
              vaststellingen worden samen
              opgeslagen. Bij een fout
              wordt niets gedeeltelijk
              geïmporteerd.
            </p>

            <ImportKnop
              kanImporteren={
                kanImporteren
              }
            />
          </div>
        </form>
      </div>
    </section>
  );
}


"use client";

import {
  useActionState,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  importeerTerreincontroleUitExcel,
  type TerreincontroleImportState,
} from "@/app/terreincontroles/import-actions";

const beginstatus:
  TerreincontroleImportState = {};

function ImportKnop() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "Importeren..."
        : "Excelbestand importeren"}
    </button>
  );
}

export default function TerreincontroleExcelImport() {
  const [status, actie] =
    useActionState(
      importeerTerreincontroleUitExcel,
      beginstatus,
    );

  const [
    geselecteerdeBestandsnaam,
    setGeselecteerdeBestandsnaam,
  ] = useState("");

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
        Excel-import
      </p>

      <h2 className="mt-2 text-xl font-bold text-slate-950">
        Terreincontrole uit Excel importeren
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Alleen het werkblad{" "}
        <strong>
          Terreincontrole samenvatting
        </strong>{" "}

        wordt verwerkt. De terreincontrole en alle
        non-conformiteiten worden samen opgeslagen.
      </p>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-600">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Alleen bestanden met extensie .xlsx.
          </li>
          <li>
            Maximale bestandsgrootte: 15 MB.
          </li>
          <li>
            Het PersoonsID en ondernemingsnummer moeten al in de webapp bestaan.
          </li>
          <li>
            De status begint na import op Geen.
          </li>
        </ul>
      </div>

      <form
        action={actie}
        className="mt-5 space-y-4"
      >
        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            Excelbestand
          </span>

          <input
            type="file"
            name="excelBestand"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={(event) =>
              setGeselecteerdeBestandsnaam(
                event.target.files?.[0]
                  ?.name ?? "",
              )
            }
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:font-bold file:text-emerald-800"
          />

          {geselecteerdeBestandsnaam ? (
            <span className="mt-2 block text-xs text-slate-500">
              Geselecteerd:{" "}
              {
                geselecteerdeBestandsnaam
              }
            </span>
          ) : null}
        </label>

        {status.message ? (
          <div
            className={
              status.succes
                ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
                : "rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            }
          >
            <p>{status.message}</p>

            {status.errors
              ?.excelBestand ? (
              <p className="mt-1 font-normal">
                {
                  status.errors
                    .excelBestand
                }
              </p>
            ) : null}
          </div>
        ) : null}

        <ImportKnop />
      </form>
    </section>
  );
}

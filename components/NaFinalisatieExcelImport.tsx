"use client";

import {
  useActionState,
  useState,
} from "react";
import {
  useFormStatus,
} from "react-dom";

import {
  importeerNaFinalisatieUitExcel,
} from "@/app/na-finalisatie/import-actions";

const invoerStijl =
  "mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const tekstvakStijl =
  "mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function ImportKnop() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? "Importeren..."
        : "Excelbestand importeren"}
    </button>
  );
}

export function NaFinalisatieExcelImport() {
  const [
    status,
    formulierActie,
  ] = useActionState(
    importeerNaFinalisatieUitExcel,
    {},
  );

  const [
    typeControle,
    setTypeControle,
  ] = useState("");

  const redenVerplicht =
    typeControle === "DEELS" ||
    typeControle ===
      "ENKEL_OPENBARE_WEG";

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
        Excel-import
      </p>

      <h2 className="mt-1 text-xl font-black text-slate-950">
        Importeren uit terreincontrolebestand
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Gebruik hetzelfde Excelbestand als bij Terreincontroles. Het werkblad moet &quot;Terreincontrole samenvatting&quot; heten.
      </p>

      <form
        action={formulierActie}
        className="mt-5 space-y-5"
      >
        {status.message ? (
          <div
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              status.succes
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Geregistreerd? *
            <select
              name="geregistreerd"
              required
              defaultValue=""
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies Ja of Nee
              </option>
              <option value="JA">
                Ja
              </option>
              <option value="NEE">
                Nee
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Datum na finalisatie *
            <input
              name="datumNaFinalisatie"
              type="date"
              required
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Plaatsbezoek *
            <select
              name="plaatsbezoek"
              required
              defaultValue=""
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies een plaatsbezoek
              </option>
              <option value="SPONTAAN">
                Spontaan
              </option>
              <option value="TELEFONISCHE_AFSPRAAK">
                Telefonische afspraak
              </option>
              <option value="EMAILAFSPRAAK">
                E-mailafspraak
              </option>
              <option value="KLACHT">
                Klacht
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Type controle *
            <select
              name="typeControle"
              required
              value={typeControle}
              onChange={(event) =>
                setTypeControle(
                  event.target.value,
                )
              }
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies een type
              </option>
              <option value="GEHEEL">
                Geheel
              </option>
              <option value="DEELS">
                Deels
              </option>
              <option value="ENKEL_OPENBARE_WEG">
                Enkel van openbare weg
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Reden
            {redenVerplicht
              ? " *"
              : ""}
            <textarea
              name="reden"
              required={
                redenVerplicht
              }
              maxLength={5000}
              className={tekstvakStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-3">
            Opmerking *
            <textarea
              name="opmerking"
              required
              maxLength={5000}
              className={tekstvakStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-3">
            Excelbestand *
            <input
              name="excelBestand"
              type="file"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
            />

            {status.errors
              ?.excelBestand ? (
              <span className="mt-1 block text-xs font-semibold text-red-700">
                {
                  status.errors
                    .excelBestand
                }
              </span>
            ) : null}
          </label>
        </div>

        <div className="flex justify-end">
          <ImportKnop />
        </div>
      </form>
    </section>
  );
}

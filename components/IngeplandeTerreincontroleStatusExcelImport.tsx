"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  importeerIngeplandeTerreincontroleStatussen,
  type StatusExcelImportState,
} from "@/app/terreincontroles-inplannen/status-import-actions";

const beginstatus:
  StatusExcelImportState = {};

function ImportKnop() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? "Statussen importeren..."
        : "Statusbestand uploaden"}
    </button>
  );
}

export function IngeplandeTerreincontroleStatusExcelImport() {
  const router = useRouter();

  const formulierRef =
    useRef<HTMLFormElement>(
      null,
    );

  const [
    state,
    formAction,
  ] = useActionState(
    importeerIngeplandeTerreincontroleStatussen,
    beginstatus,
  );

  useEffect(() => {
    if (!state.succes) {
      return;
    }

    formulierRef.current?.reset();
    router.refresh();
  }, [
    state.succes,
    state.message,
    router,
  ]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-950">
            Statussen uit Excel bijwerken
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Upload het resultaatbestand.
            Het werkblad moet
            &quot;Resultaten&quot; heten.
            Kolom A bevat inputId en kolom B
            bevat de nieuwe status.
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Toegestaan: IN_OPMAAK,
            GEARCHIVEERD_ATTEST en
            ACTUEEL_ATTEST.
          </p>
        </div>

        <form
          ref={formulierRef}
          action={formAction}
          className="flex flex-col gap-2"
        >
          <div>
            <label
              htmlFor="ingeplandeStatusExcelBestand"
              className="block text-xs font-semibold text-slate-700"
            >
              Excelbestand
            </label>

            <input
              id="ingeplandeStatusExcelBestand"
              name="excelBestand"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="mt-1 block h-10 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold"
            />
          </div>

          <ImportKnop />
        </form>
      </div>

      {state.message ? (
        <div
          role="status"
          className={`mt-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            state.succes
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {state.errors
        ?.excelBestand ? (
        <p className="mt-2 text-sm font-medium text-red-700">
          {
            state.errors
              .excelBestand
          }
        </p>
      ) : null}

      {state.succes &&
      state.resultaat ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          <ResultaatVak
            label="Excelrijen"
            waarde={
              state.resultaat
                .totaalExcel
            }
          />

          <ResultaatVak
            label="Aangepast"
            waarde={
              state.resultaat
                .aangepast
            }
            kleur="groen"
          />

          <ResultaatVak
            label="Ongewijzigd"
            waarde={
              state.resultaat
                .ongewijzigd
            }
          />

          <ResultaatVak
            label="Niet gevonden"
            waarde={
              state.resultaat
                .nietGevonden
            }
            kleur="oranje"
          />

          <ResultaatVak
            label="Ongeldig"
            waarde={
              state.resultaat
                .ongeldigeRijen
            }
            kleur="rood"
          />
        </div>
      ) : null}
    </div>
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
  const kleurStijl = {
    standaard:
      "border-slate-200 bg-slate-50 text-slate-900",
    groen:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    oranje:
      "border-amber-200 bg-amber-50 text-amber-900",
    rood:
      "border-red-200 bg-red-50 text-red-900",
  }[kleur];

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${kleurStijl}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-0.5 text-lg font-bold">
        {waarde}
      </p>
    </div>
  );
}

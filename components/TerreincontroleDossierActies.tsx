"use client";

import Link from "next/link";

import {
  voegTerreincontroleVaststellingToe,
  verwijderTerreincontrole,
  verwijderTerreincontroleVaststelling,
  wijzigTerreincontroleStatus,
} from "@/app/terreincontroles/dossier-actions";

type Status =
  | "GEEN"
  | "IN_OPMAAK"
  | "GEACTUALISEERD"
  | "AFGEROND";

type Props = {
  id: number;
  status: Status;
};

const invoer =
  "mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600";

const tekstvak =
  "mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600";

export function TerreincontroleDossierActies({
  id,
  status,
}: Props) {
  const statusActie =
    wijzigTerreincontroleStatus.bind(
      null,
      id,
    );

  const vaststellingActie =
    voegTerreincontroleVaststellingToe.bind(
      null,
      id,
    );

  const verwijderActie =
    verwijderTerreincontrole.bind(
      null,
      id,
    );

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <form
          action={statusActie}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="text-sm font-bold text-slate-700">
            Status
            <select
              name="status"
              defaultValue={status}
              className={`${invoer} min-w-52`}
            >
              <option value="GEEN">
                Geen
              </option>
              <option value="IN_OPMAAK">
                In opmaak
              </option>
              <option value="GEACTUALISEERD">
                Geactualiseerd
              </option>
              <option value="AFGEROND">
                Afgerond
              </option>
            </select>
          </label>

          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white"
          >
            Status opslaan
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/terreincontroles/${id}/bewerken`}
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
          >
            Bewerken
          </Link>

          <form
            action={verwijderActie}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "Deze terreincontrole naar Verwijderd verplaatsen?",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              className="h-10 rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-bold text-red-700"
            >
              Verwijderen
            </button>
          </form>
        </div>
      </div>

      <details className="rounded-2xl border border-slate-200">
        <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-slate-800">
          Vaststelling handmatig toevoegen
        </summary>

        <form
          action={vaststellingActie}
          className="grid gap-4 border-t border-slate-200 p-5 sm:grid-cols-2"
        >
          <label className="text-sm font-semibold text-slate-700">
            NC-ID
            <input
              name="ncId"
              required
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Parameter
            <input
              name="parameter"
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Vastgesteld door CI
            <input
              name="vastgesteldDoorCi"
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Grote impact
            <input
              name="groteImpact"
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Categorie
            <input
              name="categorie"
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Omschrijving
            <textarea
              name="omschrijving"
              className={tekstvak}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Verduidelijking
            <textarea
              name="verduidelijking"
              className={tekstvak}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Motivatie aanpassing
            <textarea
              name="motivatieAanpassing"
              className={tekstvak}
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="h-10 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white"
            >
              Vaststelling toevoegen
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}

export function VerwijderTerreincontroleVaststellingKnop({
  terreincontroleId,
  vaststellingId,
}: {
  terreincontroleId: number;
  vaststellingId: number;
}) {
  const actie =
    verwijderTerreincontroleVaststelling.bind(
      null,
      terreincontroleId,
      vaststellingId,
    );

  return (
    <form
      action={actie}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Deze vaststelling verwijderen?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-700"
      >
        Verwijderen
      </button>
    </form>
  );
}

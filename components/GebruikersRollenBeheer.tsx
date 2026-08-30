"use client";

import {
  useRef,
  useState,
} from "react";

import {
  wijzigGebruikerRollen,
} from "@/app/gebruikers/actions";
import {
  GEBRUIKERSROLLEN,
  rolLabel,
  type GebruikersrolWaarde,
} from "@/lib/autorisatie";

type Props = {
  gebruikerId: number;
  rollen: readonly GebruikersrolWaarde[];
  eigenAccount: boolean;
};

function badgeStijl(
  rol: GebruikersrolWaarde,
) {
  switch (rol) {
    case "BEHEERDER":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "ADMINISTRATIEF":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "AUDITEUR":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "INTERNE_AUDITEUR":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "KLACHTENBEHANDELAAR":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "BEGELEIDER":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "HELPDESK":
      return "border-teal-200 bg-teal-50 text-teal-700";

    case "FACTURATIE":
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

export function GebruikersRollenBeheer({
  gebruikerId,
  rollen: opgeslagenRollen,
  eigenAccount,
}: Props) {
  const dialoogRef =
    useRef<HTMLDialogElement>(null);

  const [rollen, setRollen] =
    useState<GebruikersrolWaarde[]>(
      [...opgeslagenRollen],
    );

  function openDialoog() {
    setRollen(
      [...opgeslagenRollen],
    );

    dialoogRef.current
      ?.showModal();
  }

  function sluitDialoog() {
    setRollen(
      [...opgeslagenRollen],
    );

    dialoogRef.current
      ?.close();
  }

  function wijzigRol(
    rol: GebruikersrolWaarde,
    geselecteerd: boolean,
  ) {
    setRollen((huidige) => {
      if (geselecteerd) {
        return Array.from(
          new Set([
            ...huidige,
            rol,
          ]),
        );
      }

      return huidige.filter(
        (huidigeRol) =>
          huidigeRol !== rol,
      );
    });
  }

  return (
    <>
      <div className="flex max-w-sm flex-wrap items-center gap-1.5">
        {opgeslagenRollen.map(
          (rol) => (
            <span
              key={rol}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${badgeStijl(
                rol,
              )}`}
            >
              {rolLabel(rol)}
            </span>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={openDialoog}
        className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
      >
        Rollen beheren
      </button>

      <dialog
        ref={dialoogRef}
        aria-labelledby={`rollen-titel-${gebruikerId}`}
        onCancel={(event) => {
          event.preventDefault();
          sluitDialoog();
        }}
        onClick={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            sluitDialoog();
          }
        }}
        className="m-auto w-[min(92vw,640px)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
      >
        <form
          action={
            wijzigGebruikerRollen
          }
          onSubmit={() => {
            dialoogRef.current
              ?.close();
          }}
        >
          <input
            type="hidden"
            name="id"
            value={gebruikerId}
          />

          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2
                id={`rollen-titel-${gebruikerId}`}
                className="text-lg font-black text-slate-950"
              >
                Rollen beheren
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Selecteer één of meerdere
                rollen voor deze gebruiker.
              </p>
            </div>

            <button
              type="button"
              onClick={sluitDialoog}
              aria-label="Venster sluiten"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              ×
            </button>
          </header>

          <div className="p-5 sm:p-6">
            <div className="grid gap-2 sm:grid-cols-2">
              {GEBRUIKERSROLLEN.map(
                (rol) => {
                  const geselecteerd =
                    rollen.includes(
                      rol,
                    );

                  const vergrendeld =
                    eigenAccount &&
                    rol ===
                      "BEHEERDER";

                  return (
                    <label
                      key={rol}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition ${
                        geselecteerd
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                      } ${
                        vergrendeld
                          ? "cursor-not-allowed opacity-75"
                          : "cursor-pointer"
                      }`}
                    >
                      {vergrendeld ? (
                        <input
                          type="hidden"
                          name="rollen"
                          value={
                            rol
                          }
                        />
                      ) : null}

                      <input
                        type="checkbox"
                        name={
                          vergrendeld
                            ? undefined
                            : "rollen"
                        }
                        value={rol}
                        checked={
                          geselecteerd
                        }
                        disabled={
                          vergrendeld
                        }
                        onChange={(
                          event,
                        ) => {
                          wijzigRol(
                            rol,
                            event.target
                              .checked,
                          );
                        }}
                        className="size-4 shrink-0 rounded border-slate-300 accent-emerald-700"
                      />

                      <span className="min-w-0 flex-1">
                        {rolLabel(rol)}
                      </span>

                      {vergrendeld ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                          Verplicht
                        </span>
                      ) : null}
                    </label>
                  );
                },
              )}
            </div>

            {rollen.length === 0 ? (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
              >
                Selecteer minimaal één rol.
              </p>
            ) : null}

            <p className="mt-4 text-xs leading-5 text-slate-500">
              De nieuwe rollen hebben
              voorlopig nog geen eigen
              applicatiemachtigingen.
            </p>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={sluitDialoog}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Annuleren
            </button>

            <button
              type="submit"
              disabled={
                rollen.length === 0
              }
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rollen opslaan
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

"use client";

import {
  useRouter,
} from "next/navigation";
import {
  createPortal,
} from "react-dom";
import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  bewerkOpvolgingSanctie,
  verwijderOpvolgingSanctie,
} from "@/app/opvolging-sancties/actions";

type Auditeur = {
  id: number;
  email: string;
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
};

type Registratie = {
  id: number;
  auditeurGebruikerId: number | null;
  opvolgingAfgerond: boolean;
  datumAfgerond: string;
  afgerondDoorGebruikerId:
    number | null;
  opmerkingen: string;
};

type Props = {
  registratie: Registratie;
  auditeurs: Auditeur[];
};

function auditeurLabel(
  auditeur: Auditeur,
) {
  const volledigeNaam = [
    auditeur.voornaam,
    auditeur.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    volledigeNaam ||
    auditeur.naam?.trim() ||
    auditeur.email
  );
}

export function OpvolgingSanctieActies({
  registratie,
  auditeurs,
}: Props) {
  const router =
    useRouter();

  const menuRef =
    useRef<HTMLDetailsElement>(null);

  const [
    dialoogOpen,
    setDialoogOpen,
  ] = useState(false);

  const [
    afgerond,
    setAfgerond,
  ] = useState(
    registratie.opvolgingAfgerond,
  );

  const [
    fout,
    setFout,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  function sluitMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  function openDialoog() {
    sluitMenu();
    setAfgerond(
      registratie.opvolgingAfgerond,
    );
    setFout("");
    setDialoogOpen(true);
  }

  function sluitDialoog() {
    if (isBezig) {
      return;
    }

    setFout("");
    setDialoogOpen(false);
  }

  function verzend(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    setFout("");

    startTransition(async () => {
      const resultaat =
        await bewerkOpvolgingSanctie(
          registratie.id,
          formData,
        );

      if (!resultaat.succes) {
        setFout(
          resultaat.melding,
        );
        return;
      }

      setDialoogOpen(false);
      router.refresh();
    });
  }

  function verwijder() {
    const bevestigd =
      window.confirm(
        "Weet je zeker dat je deze opvolging wilt verwijderen?",
      );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(async () => {
      const resultaat =
        await verwijderOpvolgingSanctie(
          registratie.id,
        );

      if (!resultaat.succes) {
        setFout(
          resultaat.melding,
        );
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <div
        className="relative inline-block"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <details
          ref={menuRef}
          className="group"
          data-opvolging-rij-meer-menu="true"
          onToggle={(event) => {
            const geopendMenu =
              event.currentTarget;

            if (!geopendMenu.open) {
              return;
            }

            document
              .querySelectorAll<HTMLDetailsElement>(
                'details[data-opvolging-rij-meer-menu="true"][open]',
              )
              .forEach((menu) => {
                if (
                  menu !== geopendMenu
                ) {
                  menu.open = false;
                }
              });
          }}
        >
          <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Meer
          </summary>

          <div className="absolute right-full top-0 z-50 mr-1 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <button
              type="button"
              onClick={
                openDialoog
              }
              disabled={isBezig}
              className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Bewerken
            </button>

            <button
              type="button"
              onClick={verwijder}
              disabled={isBezig}
              className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isBezig
                ? "Bezig..."
                : "Verwijderen"}
            </button>
          </div>
        </details>

        {!dialoogOpen &&
        fout ? (
          <p
            role="alert"
            className="mt-1 max-w-60 text-xs font-semibold text-red-700"
          >
            {fout}
          </p>
        ) : null}
      </div>

      {dialoogOpen
        ? createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              sluitDialoog();
            }
          }}
        >
          <form
            onSubmit={verzend}
            className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Opvolging bewerken
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Alleen actieve gebruikers met de rol Auditeur kunnen geselecteerd worden.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  sluitDialoog
                }
                disabled={isBezig}
                aria-label="Venster sluiten"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div>
              <label
                htmlFor={`auditeur-${registratie.id}`}
                className="mb-1.5 block text-sm font-bold text-slate-800"
              >
                Auditeur
              </label>

              <select
                id={`auditeur-${registratie.id}`}
                name="auditeurGebruikerId"
                defaultValue={
                  registratie.auditeurGebruikerId ??
                  ""
                }
                disabled={isBezig}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">
                  Niet gekoppeld
                </option>

                {auditeurs.map(
                  (auditeur) => (
                    <option
                      key={
                        auditeur.id
                      }
                      value={
                        auditeur.id
                      }
                    >
                      {auditeurLabel(
                        auditeur,
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor={`opmerkingen-${registratie.id}`}
                className="mb-1.5 block text-sm font-bold text-slate-800"
              >
                Opmerkingen
              </label>

              <textarea
                id={`opmerkingen-${registratie.id}`}
                name="opmerkingen"
                defaultValue={
                  registratie.opmerkingen
                }
                maxLength={10_000}
                rows={5}
                disabled={isBezig}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                name="opvolgingAfgerond"
                type="checkbox"
                checked={afgerond}
                onChange={(
                  event,
                ) => {
                  setAfgerond(
                    event.target
                      .checked,
                  );
                }}
                disabled={isBezig}
                className="size-5 cursor-pointer accent-emerald-700"
              />

              <span className="font-bold text-slate-800">
                Opvolging afgerond
              </span>
            </label>

            {afgerond ? (
              <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`datum-afgerond-${registratie.id}`}
                    className="mb-1.5 block text-sm font-bold text-slate-800"
                  >
                    Datum afgerond
                  </label>

                  <input
                    id={`datum-afgerond-${registratie.id}`}
                    name="datumAfgerond"
                    type="date"
                    required
                    defaultValue={
                      registratie.datumAfgerond
                    }
                    disabled={isBezig}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`afgerond-door-${registratie.id}`}
                    className="mb-1.5 block text-sm font-bold text-slate-800"
                  >
                    Afgerond door
                  </label>

                  <select
                    id={`afgerond-door-${registratie.id}`}
                    name="afgerondDoorGebruikerId"
                    required
                    defaultValue={
                      registratie.afgerondDoorGebruikerId ??
                      ""
                    }
                    disabled={isBezig}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">
                      Selecteer een auditeur
                    </option>

                    {auditeurs.map(
                      (auditeur) => (
                        <option
                          key={
                            auditeur.id
                          }
                          value={
                            auditeur.id
                          }
                        >
                          {auditeurLabel(
                            auditeur,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            ) : null}

            {fout ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
              >
                {fout}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={
                  sluitDialoog
                }
                disabled={isBezig}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuleren
              </button>

              <button
                type="submit"
                disabled={isBezig}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isBezig
                  ? "Opslaan..."
                  : "Opslaan"}
              </button>
            </div>
          </form>
        </div>,
          document.body,
        )
        : null}
    </>
  );
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { wijzigDeskcontroleOpmerkingen } from "@/app/deskcontroles/opmerkingen-actions";
import { DESKCONTROLES_QUERY_SLEUTEL } from "@/hooks/useDeskcontrolesQuery";

type DeskcontroleOpmerkingenDialogProps = {
  id: number;
  tekst?: string | null;
};

export function DeskcontroleOpmerkingenDialog({
  id,
  tekst,
}: DeskcontroleOpmerkingenDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titelId = useId();

  const oorspronkelijkeTekst = tekst ?? "";

  const [huidigeTekst, setHuidigeTekst] = useState(oorspronkelijkeTekst);
  const [concept, setConcept] = useState(oorspronkelijkeTekst);
  const [bewerken, setBewerken] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [melding, setMelding] = useState("");

  function openen() {
    setConcept(huidigeTekst);
    setBewerken(false);
    setFout("");
    setMelding("");
    dialogRef.current?.showModal();
  }

  function sluiten() {
    if (bezig) {
      return;
    }

    dialogRef.current?.close();
  }

  function startBewerken() {
    setConcept(huidigeTekst);
    setFout("");
    setMelding("");
    setBewerken(true);
  }

  function annuleerBewerken() {
    if (bezig) {
      return;
    }

    setConcept(huidigeTekst);
    setFout("");
    setMelding("");
    setBewerken(false);
  }

  async function opslaan() {
    if (concept.length > 5000) {
      setFout("Opmerkingen mogen maximaal 5000 tekens bevatten.");
      return;
    }

    setBezig(true);
    setFout("");
    setMelding("");

    try {
      const resultaat = await wijzigDeskcontroleOpmerkingen(id, concept);

      if (!resultaat.succes) {
        setFout(
          resultaat.melding ?? "De opmerkingen konden niet worden opgeslagen.",
        );
        return;
      }

      const opgeslagenTekst = resultaat.opmerkingen ?? concept.trim();

      setHuidigeTekst(opgeslagenTekst);
      setConcept(opgeslagenTekst);
      setBewerken(false);
      setMelding(resultaat.melding ?? "De opmerkingen zijn opgeslagen.");

      await queryClient.invalidateQueries({
        queryKey: DESKCONTROLES_QUERY_SLEUTEL,
      });

      router.refresh();
    } catch (error) {
      console.error("Deskcontroleopmerkingen opslaan mislukt:", error);

      setFout(
        error instanceof Error
          ? error.message
          : "De opmerkingen konden niet worden opgeslagen.",
      );
    } finally {
      setBezig(false);
    }
  }

  const knopTekst = huidigeTekst.trim() || "Opmerking toevoegen";

  return (
    <>
      <button
        type="button"
        onClick={openen}
        title={
          huidigeTekst.trim()
            ? "Opmerkingen bekijken of bewerken"
            : "Opmerkingen toevoegen"
        }
        aria-label={
          huidigeTekst.trim()
            ? "Opmerkingen bekijken of bewerken"
            : "Opmerkingen toevoegen"
        }
        className={`max-w-72 truncate text-left underline decoration-dotted underline-offset-4 transition ${
          huidigeTekst.trim()
            ? "text-slate-700 decoration-slate-300 hover:text-emerald-800 hover:decoration-emerald-500"
            : "text-slate-400 decoration-slate-300 hover:text-emerald-700"
        }`}
      >
        {knopTekst}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titelId}
        onClose={() => {
          setConcept(huidigeTekst);
          setBewerken(false);
          setFout("");
          setMelding("");
        }}
        onCancel={(event) => {
          if (bezig) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !bezig) {
            sluiten();
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-left shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
      >
        <section>
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Deskcontrole #{id}
              </p>

              <h2
                id={titelId}
                className="mt-1 text-lg font-bold text-slate-950"
              >
                {bewerken ? "Opmerkingen bewerken" : "Volledige opmerkingen"}
              </h2>
            </div>

            <button
              type="button"
              onClick={sluiten}
              disabled={bezig}
              aria-label="Venster sluiten"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ×
            </button>
          </header>

          <div className="max-h-[65vh] overflow-y-auto px-5 py-5 sm:px-6">
            {bewerken ? (
              <div>
                <label
                  htmlFor={`${titelId}-tekst`}
                  className="text-sm font-bold text-slate-800"
                >
                  Opmerkingen
                </label>

                <textarea
                  id={`${titelId}-tekst`}
                  value={concept}
                  onChange={(event) => {
                    setConcept(event.target.value);
                    setFout("");
                    setMelding("");
                  }}
                  disabled={bezig}
                  maxLength={5000}
                  rows={10}
                  autoFocus
                  placeholder="Schrijf hier de opmerkingen..."
                  className="mt-2 min-h-48 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-100"
                />

                <div className="mt-2 flex justify-between gap-4 text-xs text-slate-500">
                  <span>Een leeg veld verwijdert de huidige opmerkingen.</span>

                  <span>{concept.length}/5000</span>
                </div>
              </div>
            ) : huidigeTekst.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {huidigeTekst}
              </p>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Er zijn nog geen opmerkingen toegevoegd.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Klik op Bewerken om opmerkingen toe te voegen.
                </p>
              </div>
            )}

            {fout ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {fout}
              </p>
            ) : null}

            {melding ? (
              <p
                role="status"
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              >
                {melding}
              </p>
            ) : null}
          </div>

          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
            {bewerken ? (
              <>
                <button
                  type="button"
                  onClick={annuleerBewerken}
                  disabled={bezig}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuleren
                </button>

                <button
                  type="button"
                  onClick={opslaan}
                  disabled={bezig || concept.length > 5000}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bezig ? "Opslaan..." : "Opmerkingen opslaan"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={sluiten}
                  disabled={bezig}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sluiten
                </button>

                <button
                  type="button"
                  onClick={startBewerken}
                  disabled={bezig}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {huidigeTekst.trim() ? "Bewerken" : "Opmerking toevoegen"}
                </button>
              </>
            )}
          </footer>
        </section>
      </dialog>
    </>
  );
}

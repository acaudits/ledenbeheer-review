"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { wijzigDeskcontroleOpmerkingen } from "@/app/deskcontroles/opmerkingen-actions";

type DeskcontroleOpmerkingenDialogProps = {
  id: number;
  tekst?: string | null;
};

export function DeskcontroleOpmerkingenDialog({
  id,
  tekst,
}: DeskcontroleOpmerkingenDialogProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const oorspronkelijkeTekst = tekst ?? "";

  const [open, setOpen] = useState(false);
  const [bewerken, setBewerken] = useState(false);
  const [opmerkingen, setOpmerkingen] = useState(oorspronkelijkeTekst);
  const [opgeslagenTekst, setOpgeslagenTekst] =
    useState(oorspronkelijkeTekst);
  const [melding, setMelding] = useState("");
  const [foutmelding, setFoutmelding] = useState("");
  const [isBezig, startTransition] = useTransition();

  useEffect(() => {
    setOpmerkingen(oorspronkelijkeTekst);
    setOpgeslagenTekst(oorspronkelijkeTekst);
  }, [oorspronkelijkeTekst]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function sluitMetEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBezig) {
        setOpen(false);
        setBewerken(false);
        setOpmerkingen(opgeslagenTekst);
        setMelding("");
        setFoutmelding("");
      }
    }

    document.addEventListener("keydown", sluitMetEscape);

    return () => {
      document.removeEventListener("keydown", sluitMetEscape);
    };
  }, [open, isBezig, opgeslagenTekst]);

  useEffect(() => {
    if (open && bewerken) {
      textareaRef.current?.focus();
    }
  }, [open, bewerken]);

  function openDialog() {
    setOpmerkingen(opgeslagenTekst);
    setMelding("");
    setFoutmelding("");
    setBewerken(false);
    setOpen(true);
  }

  function sluitDialog() {
    if (isBezig) {
      return;
    }

    setOpen(false);
    setBewerken(false);
    setOpmerkingen(opgeslagenTekst);
    setMelding("");
    setFoutmelding("");
  }

  function annuleerBewerken() {
    if (isBezig) {
      return;
    }

    setOpmerkingen(opgeslagenTekst);
    setBewerken(false);
    setMelding("");
    setFoutmelding("");
  }

  function opslaan() {
    setMelding("");
    setFoutmelding("");

    if (opmerkingen.length > 5000) {
      setFoutmelding(
        "Opmerkingen mogen maximaal 5000 tekens bevatten.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const resultaat =
          await wijzigDeskcontroleOpmerkingen(id, opmerkingen);

        if (!resultaat.succes) {
          setFoutmelding(
            resultaat.melding ??
              "De opmerkingen konden niet worden opgeslagen.",
          );
          return;
        }

        const nieuweTekst = resultaat.opmerkingen ?? "";

        setOpmerkingen(nieuweTekst);
        setOpgeslagenTekst(nieuweTekst);
        setBewerken(false);
        setMelding(
          resultaat.melding ?? "De opmerkingen zijn opgeslagen.",
        );

        router.refresh();
      } catch (fout) {
        setFoutmelding(
          fout instanceof Error
            ? fout.message
            : "De opmerkingen konden niet worden opgeslagen.",
        );
      }
    });
  }

  const tabelTekst = opgeslagenTekst.trim();

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={[
          "block max-w-64 truncate text-left text-sm",
          tabelTekst
            ? "text-slate-700 underline decoration-dotted underline-offset-2 hover:text-slate-950"
            : "text-slate-400 hover:text-slate-700",
        ].join(" ")}
        title={
          tabelTekst
            ? "Opmerkingen bekijken of bewerken"
            : "Opmerkingen toevoegen"
        }
      >
        {tabelTekst || "Opmerking toevoegen"}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              sluitDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`deskcontrole-opmerkingen-titel-${id}`}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  id={`deskcontrole-opmerkingen-titel-${id}`}
                  className="text-lg font-semibold text-slate-950"
                >
                  Opmerkingen
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Deskcontrole #{id}
                </p>
              </div>

              <button
                type="button"
                onClick={sluitDialog}
                disabled={isBezig}
                aria-label="Dialoog sluiten"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5">
              {bewerken ? (
                <div>
                  <label
                    htmlFor={`deskcontrole-opmerkingen-${id}`}
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Opmerkingen bewerken
                  </label>

                  <textarea
                    ref={textareaRef}
                    id={`deskcontrole-opmerkingen-${id}`}
                    value={opmerkingen}
                    onChange={(event) => {
                      setOpmerkingen(event.target.value);
                      setMelding("");
                      setFoutmelding("");
                    }}
                    disabled={isBezig}
                    rows={12}
                    maxLength={5000}
                    className="min-h-72 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                    placeholder="Voer hier de opmerkingen in..."
                  />

                  <div className="mt-1 flex justify-end text-xs text-slate-500">
                    {opmerkingen.length}/5000
                  </div>
                </div>
              ) : (
                <div className="max-h-[55vh] min-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                  {opgeslagenTekst.trim() || (
                    <span className="text-slate-400">
                      Er zijn nog geen opmerkingen toegevoegd.
                    </span>
                  )}
                </div>
              )}

              {foutmelding ? (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {foutmelding}
                </p>
              ) : null}

              {melding ? (
                <p
                  role="status"
                  className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                >
                  {melding}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              {bewerken ? (
                <>
                  <button
                    type="button"
                    onClick={annuleerBewerken}
                    disabled={isBezig}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Annuleren
                  </button>

                  <button
                    type="button"
                    onClick={opslaan}
                    disabled={isBezig}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBezig ? "Opslaan..." : "Opslaan"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={sluitDialog}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Sluiten
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMelding("");
                      setFoutmelding("");
                      setBewerken(true);
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    {opgeslagenTekst.trim()
                      ? "Bewerken"
                      : "Opmerking toevoegen"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


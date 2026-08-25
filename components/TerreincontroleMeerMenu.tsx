"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  markeerTerreincontroleAfwezig,
} from "@/app/terreincontroles-inplannen/afwezig-acties";
import {
  verwijderTerreincontrole,
} from "@/app/terreincontroles-inplannen/verwijder-acties";
import {
  OpvolgingSanctieKnop,
} from "@/components/OpvolgingSanctieKnop";
import {
  AFWEZIGE_TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useAfwezigeTerreincontrolesQuery";
import {
  INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useIngeplandeTerreincontrolesQuery";

type Props = {
  id: number;
};

export default function TerreincontroleMeerMenu({
  id,
}: Props) {
  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const menuRef =
    useRef<HTMLDetailsElement>(
      null,
    );

  const [
    dialoogOpen,
    setDialoogOpen,
  ] = useState(false);

  const [
    reden,
    setReden,
  ] = useState("");

  const [
    fout,
    setFout,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  async function vernieuwLijsten() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
      }),
      queryClient.invalidateQueries({
        queryKey:
          AFWEZIGE_TERREINCONTROLES_QUERY_SLEUTEL,
      }),
    ]);

    router.refresh();
  }

  function sluitMeerMenu() {
    if (menuRef.current) {
      menuRef.current.open =
        false;
    }
  }

  function openAfwezigDialoog() {
    setFout("");
    setReden("");
    setDialoogOpen(true);
  }

  function sluitAfwezigDialoog() {
    if (isBezig) {
      return;
    }

    setFout("");
    setDialoogOpen(false);
  }

  function bevestigAfwezig() {
    const genormaliseerdeReden =
      reden.trim();

    if (!genormaliseerdeReden) {
      setFout(
        "Vul een reden voor de afwezigheid in.",
      );

      return;
    }

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await markeerTerreincontroleAfwezig(
            id,
            genormaliseerdeReden,
          );

        if (!resultaat.succes) {
          setFout(
            resultaat.message ??
              "Afwezig registreren mislukt.",
          );

          return;
        }

        setDialoogOpen(false);
        setReden("");

        await vernieuwLijsten();
      },
    );
  }

  function verwijder() {
    const bevestigd =
      window.confirm(
        "Weet je zeker dat je deze terreincontrole wilt verwijderen? Je kunt deze later nog herstellen.",
      );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await verwijderTerreincontrole(
            id,
          );

        if (!resultaat.succes) {
          setFout(
            resultaat.message ??
              "Verwijderen mislukt.",
          );

          return;
        }

        await vernieuwLijsten();
      },
    );
  }

  return (
    <>
      <div
        className="relative"
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <details
          ref={menuRef}
          className="group"
          data-terreincontrole-meer-menu="true"
          onToggle={(event) => {
            const geopendMenu =
              event.currentTarget;

            if (!geopendMenu.open) {
              return;
            }

            document
              .querySelectorAll<HTMLDetailsElement>(
                'details[data-terreincontrole-meer-menu="true"][open]',
              )
              .forEach((menu) => {
                if (
                  menu !==
                  geopendMenu
                ) {
                  menu.open = false;
                }
              });
          }}
        >
          <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Meer
          </summary>

          <div className="absolute right-full top-0 z-[80] mr-2 min-w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <Link
              href={`/terreincontroles-inplannen/${id}/bewerken`}
              className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Bewerken
            </Link>

            <OpvolgingSanctieKnop
              bronType="INGEPLANDE_TERREINCONTROLE"
              bronId={id}
              sluitMeerMenu={
                sluitMeerMenu
              }
            />

            <button
              type="button"
              onClick={
                openAfwezigDialoog
              }
              disabled={isBezig}
              className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Afwezig
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
          <p className="mt-1 max-w-52 text-xs font-semibold text-red-700">
            {fout}
          </p>
        ) : null}
      </div>

      {dialoogOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              sluitAfwezigDialoog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`afwezig-titel-${id}`}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2
              id={`afwezig-titel-${id}`}
              className="text-xl font-black text-slate-950"
            >
              Afwezig registreren
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Leg verplicht uit waarom deze persoon afwezig was.
            </p>

            <div className="mt-5">
              <label
                htmlFor={`afwezig-reden-${id}`}
                className="block text-sm font-bold text-slate-800"
              >
                Reden
              </label>

              <textarea
                id={`afwezig-reden-${id}`}
                value={reden}
                onChange={(
                  event,
                ) => {
                  setReden(
                    event.target.value,
                  );

                  if (fout) {
                    setFout("");
                  }
                }}
                required
                maxLength={1000}
                autoFocus
                rows={6}
                disabled={isBezig}
                className="mt-1.5 block w-full max-w-full box-border resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                placeholder="Beschrijf de reden van de afwezigheid..."
              />
            </div>

            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {reden.length}/1000
              </p>

              {fout ? (
                <p className="text-right text-xs font-semibold text-red-700">
                  {fout}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  sluitAfwezigDialoog
                }
                disabled={isBezig}
                className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuleren
              </button>

              <button
                type="button"
                onClick={
                  bevestigAfwezig
                }
                disabled={
                  isBezig ||
                  !reden.trim()
                }
                className="h-10 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBezig
                  ? "Bevestigen..."
                  : "Bevestigen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

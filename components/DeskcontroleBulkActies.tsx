"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { wijzigMeerdereDeskcontroleStatussen } from "@/app/deskcontroles/snelle-acties";

type DeskcontroleBulkActiesProps = {
  geselecteerdeIds: number[];
  naSucces: () => void;
};

const statussen = [
  {
    waarde: "GEEN",
    label: "Geen status",
  },
  {
    waarde: "IN_OPMAAK",
    label: "In opmaak",
  },
  {
    waarde: "GEACTUALISEERD",
    label: "Geactualiseerd",
  },
  {
    waarde: "AFGEROND",
    label: "Afgerond",
  },
] as const;

export function DeskcontroleBulkActies({
  geselecteerdeIds,
  naSucces,
}: DeskcontroleBulkActiesProps) {
  const router = useRouter();

  const [status, setStatus] =
    useState("IN_OPMAAK");

  const [melding, setMelding] =
    useState<string | null>(null);

  const [isBezig, startTransition] =
    useTransition();

  const aantal =
    geselecteerdeIds.length;

  function wijzigStatus() {
    if (aantal === 0 || isBezig) {
      return;
    }

    const statusLabel =
      statussen.find(
        (item) => item.waarde === status,
      )?.label ?? status;

    const bevestigd = window.confirm(
      `Wil je de status van ${aantal} ${
        aantal === 1
          ? "deskcontrole"
          : "deskcontroles"
      } wijzigen naar “${statusLabel}”?`,
    );

    if (!bevestigd) {
      return;
    }

    setMelding(null);

    startTransition(async () => {
      try {
        const resultaat =
          await wijzigMeerdereDeskcontroleStatussen(
            geselecteerdeIds,
            status,
          );

        setMelding(
          resultaat.melding ??
            (resultaat.succes
              ? "De wijziging is uitgevoerd."
              : "De wijziging is mislukt."),
        );

        if (!resultaat.succes) {
          return;
        }

        naSucces();
        router.refresh();

        window.dispatchEvent(
          new Event(
            "meldingen-gewijzigd",
          ),
        );
      } catch (fout) {
        console.error(
          "Bulkstatuswijziging mislukt:",
          fout,
        );

        setMelding(
          "De statuswijziging kon niet worden uitgevoerd.",
        );
      }
    });
  }

  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-950">
            {aantal}{" "}
            {aantal === 1
              ? "deskcontrole geselecteerd"
              : "deskcontroles geselecteerd"}
          </p>

          <p className="mt-0.5 text-xs text-emerald-800">
            Alleen actieve controles kunnen worden aangepast.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="bulk-status">
            Nieuwe status
          </label>

          <select
            id="bulk-status"
            value={status}
            disabled={isBezig}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600"
          >
            {statussen.map((item) => (
              <option
                key={item.waarde}
                value={item.waarde}
              >
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={
              aantal === 0 || isBezig
            }
            onClick={wijzigStatus}
            className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBezig
              ? "Bezig…"
              : "Status toepassen"}
          </button>

          <button
            type="button"
            disabled={isBezig}
            onClick={naSucces}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Selectie wissen
          </button>
        </div>
      </div>

      {melding ? (
        <p
          role="status"
          className="mt-3 text-sm font-semibold text-emerald-950"
        >
          {melding}
        </p>
      ) : null}
    </div>
  );
}

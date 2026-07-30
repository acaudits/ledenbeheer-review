"use client";

import {
  herstelDeskcontrole,
  verwijderDeskcontrole,
} from "@/app/deskcontroles/status-actions";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

type VerwijderButtonProps = {
  id: number;
  naam: string;
};

type HerstelButtonProps = {
  id: number;
  naam: string;
};

export function VerwijderDeskcontroleButton({
  id,
  naam,
}: VerwijderButtonProps) {
  const router = useRouter();

  const [bezig, startTransition] =
    useTransition();

  const [fout, setFout] =
    useState("");

  function verwijderen() {
    const bevestigd = window.confirm(
      `Wil je deskcontrole “${naam}” verwijderen?\n\nDe deskcontrole wordt naar de verwijderde lijst verplaatst en kan later worden hersteld.`,
    );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(async () => {
      const resultaat =
        await verwijderDeskcontrole(id);

      if (!resultaat.succes) {
        setFout(resultaat.melding);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={verwijderen}
        disabled={bezig}
        title={`Deskcontrole ${naam} verwijderen`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
          aria-hidden="true"
        >
          <path
            d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 14h10l1-14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {bezig
          ? "Verwijderen..."
          : "Verwijderen"}
      </button>

      {fout && (
        <p
          role="alert"
          className="mt-1 max-w-52 whitespace-normal text-left text-xs font-medium text-red-600"
        >
          {fout}
        </p>
      )}
    </div>
  );
}

export function HerstelDeskcontroleButton({
  id,
  naam,
}: HerstelButtonProps) {
  const router = useRouter();

  const [bezig, startTransition] =
    useTransition();

  const [fout, setFout] =
    useState("");

  function herstellen() {
    const bevestigd = window.confirm(
      `Wil je deskcontrole “${naam}” herstellen?`,
    );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(async () => {
      const resultaat =
        await herstelDeskcontrole(id);

      if (!resultaat.succes) {
        setFout(resultaat.melding);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={herstellen}
        disabled={bezig}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
          aria-hidden="true"
        >
          <path
            d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7M4 4v4.7h4.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {bezig
          ? "Herstellen..."
          : "Herstellen"}
      </button>

      {fout && (
        <p
          role="alert"
          className="mt-1 max-w-52 whitespace-normal text-left text-xs font-medium text-red-600"
        >
          {fout}
        </p>
      )}
    </div>
  );
}


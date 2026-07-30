"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { herstelDeskcontrole } from "@/app/deskcontroles/status-actions";

type DeskcontroleHerstelButtonProps = {
  id: number;
};

export function DeskcontroleHerstelButton({
  id,
}: DeskcontroleHerstelButtonProps) {
  const router = useRouter();
  const [isBezig, startTransition] = useTransition();
  const [foutmelding, setFoutmelding] = useState("");

  function herstellen() {
    const bevestigd = window.confirm(
      "Wil je deze deskcontrole opnieuw herstellen?",
    );

    if (!bevestigd) {
      return;
    }

    setFoutmelding("");

    startTransition(async () => {
      try {
        await herstelDeskcontrole(id);
        router.refresh();
      } catch (fout) {
        setFoutmelding(
          fout instanceof Error
            ? fout.message
            : "De deskcontrole kon niet worden hersteld.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={herstellen}
        disabled={isBezig}
        className="inline-flex items-center rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBezig ? "Herstellen..." : "Herstellen"}
      </button>

      {foutmelding ? (
        <p className="max-w-48 text-xs text-red-600">
          {foutmelding}
        </p>
      ) : null}
    </div>
  );
}


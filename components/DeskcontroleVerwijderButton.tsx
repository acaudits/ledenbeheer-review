"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verwijderDeskcontrole } from "@/app/deskcontroles/status-actions";

type DeskcontroleVerwijderButtonProps = {
  id: number;
};

export function DeskcontroleVerwijderButton({
  id,
}: DeskcontroleVerwijderButtonProps) {
  const router = useRouter();
  const [isBezig, startTransition] = useTransition();
  const [foutmelding, setFoutmelding] = useState("");

  function verwijderen() {
    const bevestigd = window.confirm(
      "Weet je zeker dat je deze deskcontrole wilt verwijderen? Je kunt deze later herstellen.",
    );

    if (!bevestigd) {
      return;
    }

    setFoutmelding("");

    startTransition(async () => {
      try {
        await verwijderDeskcontrole(id);
        router.refresh();
      } catch (fout) {
        setFoutmelding(
          fout instanceof Error
            ? fout.message
            : "De deskcontrole kon niet worden verwijderd.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={verwijderen}
        disabled={isBezig}
        className="inline-flex items-center rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBezig ? "Verwijderen..." : "Verwijderen"}
      </button>

      {foutmelding ? (
        <p className="max-w-48 text-xs text-red-600">
          {foutmelding}
        </p>
      ) : null}
    </div>
  );
}


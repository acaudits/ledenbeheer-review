"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

import {
  verwijderNaFinalisatie,
} from "@/app/na-finalisatie/actions";

export function NaFinalisatieVerwijderKnop({
  id,
}: {
  id: number;
}) {
  const router =
    useRouter();

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  const [
    fout,
    setFout,
  ] = useState("");

  function verwijderen() {
    if (
      !window.confirm(
        "Weet je zeker dat je deze registratie wilt verwijderen? Je kunt deze later herstellen.",
      )
    ) {
      return;
    }

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await verwijderNaFinalisatie(
            id,
          );

        if (
          !resultaat.succes
        ) {
          setFout(
            resultaat.message ??
              "Verwijderen mislukt.",
          );

          return;
        }

        router.push(
          "/na-finalisatie",
        );

        router.refresh();
      },
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={isBezig}
        onClick={verwijderen}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
      >
        {isBezig
          ? "Verwijderen..."
          : "Verwijderen"}
      </button>

      {fout ? (
        <p className="mt-2 max-w-xs text-xs font-semibold text-red-700">
          {fout}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  useRouter,
} from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

import {
  herstelNaFinalisatie,
} from "@/app/na-finalisatie/actions";
import {
  NA_FINALISATIE_QUERY_SLEUTEL,
} from "@/hooks/useNaFinalisatieQuery";

export function NaFinalisatieHerstelKnop({
  id,
}: {
  id: number;
}) {
  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  const [
    fout,
    setFout,
  ] = useState("");

  function herstellen() {
    if (
      !window.confirm(
        "Wil je deze registratie herstellen?",
      )
    ) {
      return;
    }

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await herstelNaFinalisatie(
            id,
          );

        if (
          !resultaat.succes
        ) {
          setFout(
            resultaat.message ??
              "Herstellen mislukt.",
          );

          return;
        }

        await queryClient.invalidateQueries({
          queryKey:
            NA_FINALISATIE_QUERY_SLEUTEL,
        });

        router.refresh();
      },
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={isBezig}
        onClick={herstellen}
        className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
      >
        {isBezig
          ? "Herstellen..."
          : "Herstellen"}
      </button>

      {fout ? (
        <p className="mt-1 max-w-xs text-xs font-semibold text-red-700">
          {fout}
        </p>
      ) : null}
    </div>
  );
}

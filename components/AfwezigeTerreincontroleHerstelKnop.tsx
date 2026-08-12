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
  herstelAfwezigeTerreincontrole,
} from "@/app/terreincontroles-inplannen/afwezig-acties";
import {
  AFWEZIGE_TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useAfwezigeTerreincontrolesQuery";
import {
  INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useIngeplandeTerreincontrolesQuery";

type Props = {
  id: number;
};

export default function AfwezigeTerreincontroleHerstelKnop({
  id,
}: Props) {
  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const [
    fout,
    setFout,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  function herstel() {
    const bevestigd =
      window.confirm(
        "Wil je deze terreincontrole terugzetten naar de actieve planning?",
      );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await herstelAfwezigeTerreincontrole(
            id,
          );

        if (!resultaat.succes) {
          setFout(
            resultaat.message ??
              "Herstellen mislukt.",
          );

          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              AFWEZIGE_TERREINCONTROLES_QUERY_SLEUTEL,
          }),
          queryClient.invalidateQueries({
            queryKey:
              INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
          }),
        ]);

        router.refresh();
      },
    );
  }

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={herstel}
        disabled={isBezig}
        className="inline-flex h-8 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50"
      >
        {isBezig
          ? "Herstellen..."
          : "Herstellen"}
      </button>

      {fout ? (
        <p className="mt-1 max-w-52 text-xs font-semibold text-red-700">
          {fout}
        </p>
      ) : null}
    </div>
  );
}

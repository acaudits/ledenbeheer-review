"use client";

import {
  BEHEER_KNOP_KLASSEN,
} from "@/components/BeheerOverzichtHeader";
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
  herstelTerreincontrole,
} from "@/app/terreincontroles-inplannen/verwijder-acties";
import {
  INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useIngeplandeTerreincontrolesQuery";

type Props = {
  id: number;
};

export default function TerreincontroleHerstelKnop({
  id,
}: Props) {
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

  function herstel() {
    const bevestigd =
      window.confirm(
        "Wil je deze terreincontrole herstellen?",
      );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await herstelTerreincontrole(
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

        await queryClient
          .invalidateQueries({
            queryKey:
              INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
          });

        router.refresh();
      },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={herstel}
        disabled={isBezig}
        className={`${BEHEER_KNOP_KLASSEN.primair} disabled:cursor-wait disabled:opacity-60`}
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


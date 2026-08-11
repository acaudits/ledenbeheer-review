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
  verwijderTerreincontrole,
} from "@/app/terreincontroles/dossier-actions";
import {
  TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useTerreincontrolesQuery";

type Props = {
  id: number;
};

export function TerreincontroleDossierVerwijderKnop({
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
    foutmelding,
    setFoutmelding,
  ] = useState("");

  function verwijderen() {
    const bevestigd =
      window.confirm(
        "Weet je zeker dat je deze terreincontrole wilt verwijderen? Je kunt deze later herstellen.",
      );

    if (!bevestigd) {
      return;
    }

    setFoutmelding("");

    startTransition(
      async () => {
        try {
          await verwijderTerreincontrole(
            id,
          );

          await queryClient
            .invalidateQueries({
              queryKey:
                TERREINCONTROLES_QUERY_SLEUTEL,
            });

          router.refresh();
        } catch (fout) {
          setFoutmelding(
            fout instanceof Error
              ? fout.message
              : "De terreincontrole kon niet worden verwijderd.",
          );
        }
      },
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={
          verwijderen
        }
        disabled={
          isBezig
        }
        className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBezig
          ? "Verwijderen..."
          : "Verwijderen"}
      </button>

      {foutmelding ? (
        <p className="max-w-48 text-xs font-semibold text-red-600">
          {foutmelding}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
  useTransition,
} from "react";

import {
  verwijderTerreincontrole,
} from "@/app/terreincontroles/verwijder-acties";

type Props = {
  id: number;
};

export default function TerreincontroleVerwijderKnop({
  id,
}: Props) {
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
          "/terreincontroles",
        );

        router.refresh();
      },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={verwijder}
        disabled={isBezig}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
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


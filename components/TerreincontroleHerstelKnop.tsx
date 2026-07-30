"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
  useTransition,
} from "react";

import {
  herstelTerreincontrole,
} from "@/app/terreincontroles/verwijder-acties";

type Props = {
  id: number;
};

export default function TerreincontroleHerstelKnop({
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
        className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
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


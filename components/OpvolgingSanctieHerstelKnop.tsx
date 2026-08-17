"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
  useTransition,
} from "react";

import {
  herstelOpvolgingSanctie,
} from "@/app/opvolging-sancties/actions";

type Props = {
  id: number;
};

export function OpvolgingSanctieHerstelKnop({
  id,
}: Props) {
  const router =
    useRouter();

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
        "Wil je deze opvolging opnieuw activeren?",
      );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(async () => {
      const resultaat =
        await herstelOpvolgingSanctie(
          id,
        );

      if (!resultaat.succes) {
        setFout(
          resultaat.melding,
        );
        return;
      }

      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={herstel}
        disabled={isBezig}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50"
      >
        {isBezig
          ? "Herstellen..."
          : "Herstellen"}
      </button>

      {fout ? (
        <p
          role="alert"
          className="mt-2 max-w-56 text-xs font-semibold text-red-700"
        >
          {fout}
        </p>
      ) : null}
    </div>
  );
}

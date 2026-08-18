"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  verwijderOpvolgingSanctie,
} from "@/app/opvolging-sancties/actions";

type Props = {
  registratie: {
    id: number;
  };
};

export function OpvolgingSanctieActies({
  registratie,
}: Props) {
  const router =
    useRouter();

  const menuRef =
    useRef<HTMLDetailsElement>(null);

  const [
    fout,
    setFout,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  function sluitMenu() {
    if (menuRef.current) {
      menuRef.current.open =
        false;
    }
  }

  function verwijder() {
    const bevestigd =
      window.confirm(
        "Weet je zeker dat je deze opvolging wilt verwijderen?",
      );

    if (!bevestigd) {
      return;
    }

    setFout("");

    startTransition(async () => {
      const resultaat =
        await verwijderOpvolgingSanctie(
          registratie.id,
        );

      if (!resultaat.succes) {
        setFout(
          resultaat.melding,
        );
        return;
      }

      sluitMenu();
      router.refresh();
    });
  }

  return (
    <div
      className="relative inline-block"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <details
        ref={menuRef}
        className="group"
        data-opvolging-rij-meer-menu="true"
        onToggle={(event) => {
          const geopendMenu =
            event.currentTarget;

          if (!geopendMenu.open) {
            return;
          }

          document
            .querySelectorAll<HTMLDetailsElement>(
              'details[data-opvolging-rij-meer-menu="true"][open]',
            )
            .forEach((menu) => {
              if (
                menu !== geopendMenu
              ) {
                menu.open = false;
              }
            });
        }}
      >
        <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
          Meer
        </summary>

        <div className="absolute right-full top-0 z-50 mr-2 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <Link
            href={`/opvolging-sancties/${registratie.id}`}
            onClick={sluitMenu}
            className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Bewerken
          </Link>

          <button
            type="button"
            disabled={isBezig}
            onClick={verwijder}
            className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {isBezig
              ? "Verwijderen..."
              : "Verwijderen"}
          </button>

          {fout ? (
            <p className="mt-1 max-w-56 px-3 py-2 text-xs font-semibold text-red-700">
              {fout}
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}

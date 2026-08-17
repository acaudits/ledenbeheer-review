"use client";

import Link from "next/link";
import {
  useRef,
  type ReactNode,
} from "react";

import {
  OpvolgingSanctieKnop,
} from "@/components/OpvolgingSanctieKnop";
import type {
  OpvolgingBron,
} from "@/lib/opvolging-sancties";

type Props = {
  bronType: OpvolgingBron;
  bronId: number;
  bewerkenHref: string;
  kinderen: ReactNode;
};

export function OpvolgingRijMeerMenu({
  bronType,
  bronId,
  bewerkenHref,
  kinderen,
}: Props) {
  const menuRef =
    useRef<HTMLDetailsElement>(null);

  function sluitMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
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

        <div className="absolute bottom-full right-0 z-[80] mb-1 min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <Link
            href={bewerkenHref}
            className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Bewerken
          </Link>

          <OpvolgingSanctieKnop
            bronType={bronType}
            bronId={bronId}
            sluitMeerMenu={sluitMenu}
          />

          <div className="mt-1 border-t border-slate-200 pt-1">
            {kinderen}
          </div>
        </div>
      </details>
    </div>
  );
}

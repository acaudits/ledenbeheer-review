import Link from "next/link";

import { DeskcontroleMeerMenu } from "@/components/DeskcontroleMeerMenu";

type DeskcontroleOverzichtHeaderProps = {
  aantal: number;
};

export function DeskcontroleOverzichtHeader({
  aantal,
}: DeskcontroleOverzichtHeaderProps) {
  return (
    <header className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Deskcontroles
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Deskcontrole opvolging
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            {aantal} actieve{" "}
            {aantal === 1
              ? "deskcontrole"
              : "deskcontroles"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/deskcontroles/nieuw"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-5"
              aria-hidden="true"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            Nieuwe deskcontrole
          </Link>

          <DeskcontroleMeerMenu />
        </div>
      </div>
    </header>
  );
}


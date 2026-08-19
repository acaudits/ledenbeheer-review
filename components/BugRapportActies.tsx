"use client";

import Link from "next/link";
import {
  verwijderBugRapport,
} from "@/app/bug-rapporteren/actions";

export function BugRapportActies({
  id,
}: {
  id: number;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
        Meer
      </summary>

      <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        <Link
          href={`/bug-rapporteren/${id}/bewerken`}
          className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Bewerken
        </Link>

        <form
          action={verwijderBugRapport}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Weet je zeker dat je dit bugrapport wilt verwijderen?",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="id"
            value={id}
          />

          <button
            type="submit"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Verwijderen
          </button>
        </form>
      </div>
    </details>
  );
}

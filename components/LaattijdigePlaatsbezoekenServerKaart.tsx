"use client";

import {
  LaattijdigePlaatsbezoekenKaart,
} from "@/components/LaattijdigePlaatsbezoekenKaart";
import {
  useLaattijdigePlaatsbezoekenKaartQuery,
} from "@/hooks/useLaattijdigePlaatsbezoekenQuery";

export function LaattijdigePlaatsbezoekenServerKaart() {
  const query =
    useLaattijdigePlaatsbezoekenKaartQuery();

  if (
    query.isLaden &&
    query.rijen.length === 0
  ) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">
          Kaartgegevens laden...
        </p>
      </section>
    );
  }

  if (
    query.fout &&
    query.rijen.length === 0
  ) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="font-bold text-red-900">
          {query.fout}
        </p>

        <button
          type="button"
          onClick={() => {
            void query.opnieuwLaden();
          }}
          className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800"
        >
          Kaart opnieuw laden
        </button>
      </section>
    );
  }

  return (
    <LaattijdigePlaatsbezoekenKaart
      rijen={query.rijen}
    />
  );
}

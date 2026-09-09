import {
  type ReactNode,
} from "react";

type Props = {
  titel: string;
  beschrijving: string;
  aantal: number;
  aantalLabelEnkelvoud: string;
  aantalLabelMeervoud: string;
  accent:
    | "emerald"
    | "sky"
    | "amber"
    | "purple"
    | "brown";
  children: ReactNode;
};

const accentStijlen = {
  emerald: {
    icoon:
      "border-emerald-200 bg-emerald-100 text-emerald-800",
    aantal:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    openen:
      "group-open:border-emerald-300 group-open:bg-emerald-50",
  },

  sky: {
    icoon:
      "border-sky-200 bg-sky-100 text-sky-800",
    aantal:
      "border-sky-200 bg-sky-50 text-sky-900",
    openen:
      "group-open:border-sky-300 group-open:bg-sky-50",
  },

  amber: {
    icoon:
      "border-amber-200 bg-amber-100 text-amber-800",
    aantal:
      "border-amber-200 bg-amber-50 text-amber-900",
    openen:
      "group-open:border-amber-300 group-open:bg-amber-50",
  },

  purple: {
    icoon:
      "border-purple-200 bg-purple-100 text-purple-800",
    aantal:
      "border-purple-200 bg-purple-50 text-purple-900",
    openen:
      "group-open:border-purple-300 group-open:bg-purple-50",
  },

  brown: {
    icoon:
      "border-[#d6a46f] bg-[#f5e6d3] text-[#78350f]",
    aantal:
      "border-[#d6a46f] bg-[#fff7ed] text-[#78350f]",
    openen:
      "group-open:border-[#d6a46f] group-open:bg-[#fff7ed]",
  },
} as const;

const iconen = {
  emerald: "D",
  sky: "T",
  amber: "I",
  purple: "N",
  brown: "O",
} as const;

export function PersoonsDossierSectieKaart({
  titel,
  beschrijving,
  aantal,
  aantalLabelEnkelvoud,
  aantalLabelMeervoud,
  accent,
  children,
}: Props) {
  const stijlen =
    accentStijlen[accent];

  return (
    <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <summary
        className={`flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6 ${stijlen.openen}`}
      >
        <span
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${stijlen.icoon}`}
        >
          {iconen[accent]}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-slate-950 sm:text-lg">
            {titel}
          </span>

          <span className="mt-0.5 block text-xs leading-5 text-slate-500 sm:text-sm">
            {beschrijving}
          </span>
        </span>

        <span
          className={`hidden shrink-0 rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex ${stijlen.aantal}`}
        >
          {aantal}{" "}
          {aantal === 1
            ? aantalLabelEnkelvoud
            : aantalLabelMeervoud}
        </span>

        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 shadow-sm transition-transform group-open:rotate-180"
        >
          ↓
        </span>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/40 p-3 sm:p-5">
        {children}
      </div>
    </details>
  );
}

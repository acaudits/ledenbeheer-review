import Link from "next/link";
import type {
  ReactNode,
} from "react";

type HeaderProps = {
  bovenTitel: string;
  titel: string;
  omschrijving?: ReactNode;
  acties?: ReactNode;
};

type ActieLinkProps = {
  href: string;
  kinderen: ReactNode;
  variant?:
    | "primair"
    | "secundair"
    | "neutraal"
    | "gevaar";
  plusIcoon?: boolean;
};

const basisKnop =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4";

const knopStijlen = {
  primair:
    "bg-emerald-700 text-white hover:bg-emerald-600 focus:ring-emerald-200",
  secundair:
    "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:ring-emerald-100",
  neutraal:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-100",
  gevaar:
    "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-100",
} as const;

export const BEHEER_KNOP_KLASSEN = {
  primair: `${basisKnop} ${knopStijlen.primair}`,
  secundair: `${basisKnop} ${knopStijlen.secundair}`,
  neutraal: `${basisKnop} ${knopStijlen.neutraal}`,
  gevaar: `${basisKnop} ${knopStijlen.gevaar}`,
} as const;

export function BeheerOverzichtHeader({
  bovenTitel,
  titel,
  omschrijving,
  acties,
}: HeaderProps) {
  return (
    <header className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            {bovenTitel}
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {titel}
          </h1>

          {omschrijving ? (
            <div className="mt-1.5 text-sm text-slate-500">
              {omschrijving}
            </div>
          ) : null}
        </div>

        {acties ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            {acties}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function BeheerActieLink({
  href,
  kinderen,
  variant = "neutraal",
  plusIcoon = false,
}: ActieLinkProps) {
  return (
    <Link
      href={href}
      className={BEHEER_KNOP_KLASSEN[variant]}
    >
      {plusIcoon ? (
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
      ) : null}

      {kinderen}
    </Link>
  );
}

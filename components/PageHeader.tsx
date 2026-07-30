import Link from "next/link";

type PageHeaderProps = {
  titel: string;
  beschrijving?: string;
  bovenTitel?: string;
  actieTekst?: string;
  actieHref?: string;
  secundaireActieTekst?: string;
  secundaireActieHref?: string;
  compact?: boolean;
};

export function PageHeader({
  titel,
  beschrijving,
  bovenTitel = "Certificaten CRM",
  actieTekst,
  actieHref,
  secundaireActieTekst,
  secundaireActieHref,
  compact = false,
}: PageHeaderProps) {
  return (
    <header
      className={
        compact
          ? "mb-3 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between"
          : "mb-7 flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between"
      }
    >
      <div className="min-w-0">
        {!compact && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            {bovenTitel}
          </p>
        )}

        <h1
          className={
            compact
              ? "text-2xl font-bold tracking-tight text-slate-950"
              : "text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          }
        >
          {titel}
        </h1>

        {beschrijving && (
          <p
            className={
              compact
                ? "mt-1 max-w-3xl text-sm leading-5 text-slate-500"
                : "mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base"
            }
          >
            {beschrijving}
          </p>
        )}
      </div>

      {(actieTekst ||
        secundaireActieTekst) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {secundaireActieTekst &&
            secundaireActieHref && (
              <Link
                href={secundaireActieHref}
                className={
                  compact
                    ? "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    : "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="size-4"
                >
                  <path
                    d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 14h10l1-14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {secundaireActieTekst}
              </Link>
            )}

          {actieTekst && actieHref && (
            <Link
              href={actieHref}
              className={
                compact
                  ? "inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/20"
                  : "inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/20"
              }
            >
              <span className="mr-1.5 text-base leading-none">
                +
              </span>

              {actieTekst}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

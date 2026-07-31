import Link from "next/link";

type DeskcontroleContextActiesProps = {
  id: number;
  linkAttest: string | null;
  oneDrive: string | null;
  certificatiePlatform: string | null;
  deadlineSanctie: string;
  deadlineCorrectie: string;
  magBeheren: boolean;
  verwijderd: boolean;
};

function normaliseerExterneUrl(
  waarde: string | null,
) {
  const invoer = waarde?.trim();

  if (!invoer) {
    return null;
  }

  try {
    const url = new URL(invoer);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

type ExterneActieProps = {
  href: string | null;
  titel: string;
  omschrijving: string;
  kleur:
    | "sky"
    | "emerald"
    | "violet";
};

function ExterneActie({
  href,
  titel,
  omschrijving,
  kleur,
}: ExterneActieProps) {
  const stijlen = {
    sky: "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-300 hover:bg-sky-100",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100",
    violet:
      "border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100",
  };

  if (!href) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70">
        <p className="font-bold text-slate-700">
          {titel}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Niet beschikbaar
        </p>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-2xl border p-4 transition ${stijlen[kleur]}`}
    >
      <p className="font-bold">
        {titel} ↗
      </p>

      <p className="mt-1 text-sm opacity-80">
        {omschrijving}
      </p>
    </a>
  );
}

export function DeskcontroleContextActies({
  id,
  linkAttest,
  oneDrive,
  certificatiePlatform,
  deadlineSanctie,
  deadlineCorrectie,
  magBeheren,
  verwijderd,
}: DeskcontroleContextActiesProps) {
  const attestUrl =
    normaliseerExterneUrl(
      linkAttest,
    );

  const oneDriveUrl =
    normaliseerExterneUrl(
      oneDrive,
    );

  const certificatiePlatformUrl =
    normaliseerExterneUrl(
      certificatiePlatform,
    );

  const heeftDeadline =
    Boolean(deadlineSanctie) ||
    Boolean(deadlineCorrectie);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Contextuele acties
        </p>

        <h2 className="mt-1 text-lg font-bold text-slate-950">
          Documenten en opvolging
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Open de gekoppelde externe bronnen of ga direct naar de deadline-opvolging.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ExterneActie
          href={attestUrl}
          titel="OVAM-attest"
          omschrijving="Open het gekoppelde attest."
          kleur="sky"
        />

        <ExterneActie
          href={oneDriveUrl}
          titel="OneDrive"
          omschrijving="Open de gekoppelde controledocumenten."
          kleur="emerald"
        />

        <ExterneActie
          href={
            certificatiePlatformUrl
          }
          titel="Certificatieplatform"
          omschrijving="Open het certificatieplatform."
          kleur="violet"
        />
      </div>

      {heeftDeadline ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-bold text-amber-950">
                Deadline-opvolging
              </p>

              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-amber-900">
                <span>
                  Sanctie:{" "}
                  <strong>
                    {deadlineSanctie ||
                      "Niet ingesteld"}
                  </strong>
                </span>

                <span>
                  Correctie:{" "}
                  <strong>
                    {deadlineCorrectie ||
                      "Niet ingesteld"}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {magBeheren &&
              !verwijderd ? (
                <>
                  <a
                    href="#snelle-acties"
                    className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"
                  >
                    Open snelle acties
                  </a>

                  <Link
                    href={`/deskcontroles/${id}/bewerken`}
                    className="inline-flex items-center rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800"
                  >
                    Deadlines aanpassen
                  </Link>
                </>
              ) : (
                <Link
                  href="/meldingen"
                  className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"
                >
                  Bekijk meldingen
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

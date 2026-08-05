import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

function formatteerDatum(
  datum: Date,
) {
  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

function maandLabel(
  sleutel: string,
) {
  const [
    jaar,
    maand,
  ] = sleutel
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(
      Date.UTC(
        jaar,
        maand - 1,
        1,
      ),
    ),
  );
}

function plaatsbezoekLabel(
  waarde: string,
) {
  switch (waarde) {
    case "SPONTAAN":
      return "Spontaan";

    case "TELEFONISCHE_AFSPRAAK":
      return "Telefonische afspraak";

    case "EMAILAFSPRAAK":
      return "E-mailafspraak";

    case "KLACHT":
      return "Klacht";

    default:
      return waarde;
  }
}

export async function MijnOverzichtNaFinalisatie({
  auditeur,
  datumVanaf,
}: {
  auditeur: string;
  datumVanaf: Date | null;
}) {
  const genormaliseerdeAuditeur =
    auditeur.trim();

  const registraties =
    genormaliseerdeAuditeur
      ? await prisma.naFinalisatie.findMany({
          where: {
            verwijderdOp: null,
            geregistreerd: true,
            auditeur: {
              equals:
                genormaliseerdeAuditeur,
              mode: "insensitive",
            },
            ...(datumVanaf
              ? {
                  datumNaFinalisatie:
                    {
                      gte:
                        datumVanaf,
                    },
                }
              : {}),
          },
          orderBy: [
            {
              datumNaFinalisatie:
                "desc",
            },
            {
              id: "desc",
            },
          ],
          select: {
            id: true,
            attestnummer: true,
            datumNaFinalisatie:
              true,
            plaatsbezoek: true,
            typeControle: true,
            naamAdi: true,
            inspectielocatie:
              true,
          },
        })
      : [];

  const perMaand =
    new Map<string, number>();

  for (
    const registratie of
    registraties
  ) {
    const sleutel =
      `${registratie.datumNaFinalisatie.getUTCFullYear()}-` +
      `${String(
        registratie.datumNaFinalisatie.getUTCMonth() +
          1,
      ).padStart(2, "0")}`;

    perMaand.set(
      sleutel,
      (perMaand.get(sleutel) ??
        0) + 1,
    );
  }

  const maanden =
    Array.from(
      perMaand.entries(),
    ).sort(([a], [b]) =>
      b.localeCompare(a),
    );

  const geheel =
    registraties.filter(
      (registratie) =>
        registratie.typeControle ===
        "GEHEEL",
    ).length;

  const deels =
    registraties.filter(
      (registratie) =>
        registratie.typeControle ===
        "DEELS",
    ).length;

  const openbareWeg =
    registraties.filter(
      (registratie) =>
        registratie.typeControle ===
        "ENKEL_OPENBARE_WEG",
    ).length;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Na finalisatie
        </p>

        <h2 className="mt-1 text-xl font-black text-slate-950">
          Geregistreerde controles na
          finalisatie
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Alleen actieve registraties
          met Geregistreerd = Ja voor{" "}
          {genormaliseerdeAuditeur ||
            "de geselecteerde gebruiker"}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal geregistreerd
          </p>

          <p className="mt-2 text-3xl font-black">
            {registraties.length}
          </p>
        </article>

        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Geheel
          </p>

          <p className="mt-2 text-3xl font-black">
            {geheel}
          </p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Deels
          </p>

          <p className="mt-2 text-3xl font-black">
            {deels}
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Enkel openbare weg
          </p>

          <p className="mt-2 text-3xl font-black">
            {openbareWeg}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-black text-slate-950">
            Controles per maand
          </h3>

          {maanden.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Geen geregistreerde
              controles binnen deze
              periode.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {maanden.map(
                ([
                  sleutel,
                  aantal,
                ]) => (
                  <div
                    key={sleutel}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm font-semibold capitalize text-slate-700">
                      {maandLabel(
                        sleutel,
                      )}
                    </span>

                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-900">
                      {aantal}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-black text-slate-950">
            Recente registraties
          </h3>

          {registraties.length ===
          0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Geen recente
              registraties.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {registraties
                .slice(0, 5)
                .map(
                  (registratie) => (
                    <div
                      key={
                        registratie.id
                      }
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/na-finalisatie/${registratie.id}`}
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        {
                          registratie.attestnummer
                        }
                      </Link>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatteerDatum(
                          registratie.datumNaFinalisatie,
                        )}
                        {" · "}
                        {plaatsbezoekLabel(
                          registratie.plaatsbezoek,
                        )}
                        {" · "}
                        {registratie.naamAdi ??
                          registratie.inspectielocatie ??
                          "—"}
                      </p>
                    </div>
                  ),
                )}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

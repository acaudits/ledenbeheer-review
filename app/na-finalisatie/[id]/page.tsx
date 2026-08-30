import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  NaFinalisatieVerwijderKnop,
} from "@/components/NaFinalisatieVerwijderKnop";
import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

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

function typeLabel(
  waarde: string,
) {
  switch (waarde) {
    case "GEHEEL":
      return "Geheel";
    case "DEELS":
      return "Deels";
    case "ENKEL_OPENBARE_WEG":
      return "Enkel van openbare weg";
    default:
      return waarde;
  }
}

function Waarde({
  label,
  waarde,
  breed = false,
}: {
  label: string;
  waarde:
    | string
    | number
    | null
    | undefined;
  breed?: boolean;
}) {
  return (
    <div
      className={
        breed
          ? "sm:col-span-2"
          : ""
      }
    >
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
        {waarde === null ||
        waarde === undefined ||
        String(waarde).trim() ===
          ""
          ? "—"
          : String(waarde)}
      </dd>
    </div>
  );
}

export default async function NaFinalisatieDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const {
    id: idTekst,
  } = await params;

  const id =
    Number(idTekst);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const registratie =
    await prisma.naFinalisatie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
    });

  if (!registratie) {
    notFound();
  }

  const magBeheren =
    heeftMachtiging(
      gebruiker.rollen,
      "TERREINCONTROLES_BEHEREN",
    );

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href="/na-finalisatie"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
        >
          ← Terug naar overzicht
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Na finalisatie
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {registratie.attestnummer}
            </h1>
          </div>

          {magBeheren ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/na-finalisatie/${id}/bewerken`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Bewerken
              </Link>

              <NaFinalisatieVerwijderKnop
                id={id}
              />
            </div>
          ) : null}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Waarde
            label="Auditeur"
            waarde={
              registratie.auditeur
            }
          />

          <Waarde
            label="Naam ADI"
            waarde={
              registratie.naamAdi
            }
          />

          <Waarde
            label="Geregistreerd?"
            waarde={
              registratie.geregistreerd
                ? "Ja"
                : "Nee"
            }
          />

          <Waarde
            label="Attestnummer"
            waarde={
              registratie.attestnummer
            }
          />

          <Waarde
            label="Datum na finalisatie"
            waarde={formatteerDatum(
              registratie.datumNaFinalisatie,
            )}
          />

          <Waarde
            label="Plaatsbezoek"
            waarde={plaatsbezoekLabel(
              registratie.plaatsbezoek,
            )}
          />

          <Waarde
            label="Type controle"
            waarde={typeLabel(
              registratie.typeControle,
            )}
          />

          <Waarde
            label="PersoonsID"
            waarde={
              registratie.persoonsId
            }
          />

          <Waarde
            label="ID"
            waarde={
              registratie.attestId
            }
          />

          <Waarde
            label="Naam bedrijf"
            waarde={
              registratie.naamBedrijf
            }
          />

          <Waarde
            label="Inspectielocatie"
            waarde={
              registratie.inspectielocatie
            }
            breed
          />

          <Waarde
            label="Reden"
            waarde={
              registratie.reden
            }
            breed
          />

          <Waarde
            label="Opmerking"
            waarde={
              registratie.opmerking
            }
            breed
          />

          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Link Attest
            </dt>

            <dd className="mt-1 break-all text-sm">
              <a
                href={
                  registratie.linkAttest
                }
                target="_blank"
                rel="noreferrer"
                className="font-bold text-emerald-700 underline hover:text-emerald-900"
              >
                Open attest
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

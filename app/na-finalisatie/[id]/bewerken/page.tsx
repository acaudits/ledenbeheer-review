import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  NaFinalisatieFormulier,
} from "@/components/NaFinalisatieFormulier";
import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

function gebruikersnaam(
  gebruiker: {
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
    email: string;
  },
) {
  return (
    gebruiker.naam?.trim() ||
    [
      gebruiker.voornaam,
      gebruiker.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.email
  );
}

export default async function BewerkNaFinalisatiePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
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

  const [
    registratie,
    gebruikers,
  ] = await Promise.all([
    prisma.naFinalisatie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
    }),

    prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rollen: { hasSome: [
            "AUDITEUR",
            "BEHEERDER",
          ],
        },
      },
      orderBy: [
        {
          naam: "asc",
        },
        {
          email: "asc",
        },
      ],
      select: {
        naam: true,
        voornaam: true,
        achternaam: true,
        email: true,
      },
    }),
  ]);

  if (!registratie) {
    notFound();
  }

  const auditeurs = Array.from(
    new Set([
      registratie.auditeur,
      ...gebruikers.map(
        gebruikersnaam,
      ),
    ]),
  ).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href={`/na-finalisatie/${id}`}
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
        >
          ← Terug naar detail
        </Link>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Na finalisatie
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Registratie bewerken
        </h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <NaFinalisatieFormulier
          modus="bewerken"
          id={id}
          auditeurs={auditeurs}
          waarden={{
            auditeur:
              registratie.auditeur,
            naamAdi:
              registratie.naamAdi,
            geregistreerd:
              registratie.geregistreerd,
            linkAttest:
              registratie.linkAttest,
            attestnummer:
              registratie.attestnummer,
            attestId:
              registratie.attestId,
            datumNaFinalisatie:
              registratie.datumNaFinalisatie
                .toISOString()
                .slice(0, 10),
            plaatsbezoek:
              registratie.plaatsbezoek,
            typeControle:
              registratie.typeControle,
            reden:
              registratie.reden,
            opmerking:
              registratie.opmerking,
            inspectielocatie:
              registratie.inspectielocatie,
            naamBedrijf:
              registratie.naamBedrijf,
            persoonsId:
              registratie.persoonsId,
          }}
        />
      </section>
    </div>
  );
}

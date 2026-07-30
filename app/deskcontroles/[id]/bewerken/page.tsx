import Link from "next/link";
import { notFound } from "next/navigation";

import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import DeskcontroleBewerkFormulier from "./DeskcontroleBewerkFormulier";

export const dynamic = "force-dynamic";

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    fout?: string;
  }>;
};

function datumVoorInput(
  datum: Date | null,
): string {
  return datum
    ? datum.toISOString().slice(0, 10)
    : "";
}

export default async function BewerkDeskcontrolePage({
  params,
  searchParams,
}: PaginaProps) {
  await vereisIngelogdeGebruiker();

  const { id: idTekst } =
    await params;

  const { fout } =
    await searchParams;

  const id = Number(idTekst);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const deskcontrole =
    await prisma.deskcontrole.findUnique({
      where: {
        id,
      },
    });

  if (
    !deskcontrole ||
    deskcontrole.verwijderdOp
  ) {
    notFound();
  }

  const [
    leden,
    procescertificaten,
  ] = await Promise.all([
    prisma.lid.findMany({
      where: {
        OR: [
          {
            verwijderdOp: null,
          },
          {
            id: deskcontrole.lidId,
          },
        ],
      },

      orderBy: {
        naamPersoon: "asc",
      },

      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
        certificaatnummer: true,
        certificatiePlatform: true,
        verwijderdOp: true,
      },
    }),

    prisma.procescertificaat.findMany({
      where:
        deskcontrole.procescertificaatId ===
        null
          ? {
              verwijderdOp: null,
            }
          : {
              OR: [
                {
                  verwijderdOp: null,
                },
                {
                  id: deskcontrole
                    .procescertificaatId,
                },
              ],
            },

      orderBy: {
        naamBedrijf: "asc",
      },

      select: {
        id: true,
        naamBedrijf: true,
        kboNummer: true,
        certificaatnummer: true,
        verwijderdOp: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/deskcontroles"
        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
      >
        ← Terug naar deskcontroles
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            Deskcontrole opvolging
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Deskcontrole bewerken
          </h1>

          <p className="mt-2 text-sm text-emerald-100">
            {deskcontrole.attestnummer ??
              "Geen attestnummer"}
          </p>
        </header>

        <DeskcontroleBewerkFormulier
          id={deskcontrole.id}
          fout={fout}
          deskcontrole={{
            auditeur:
              deskcontrole.auditeur ??
              "",

            lidId:
              deskcontrole.lidId,

            procescertificaatId:
              deskcontrole
                .procescertificaatId ??
              0,

            linkAttest:
              deskcontrole.linkAttest ??
              "",

            attestnummer:
              deskcontrole.attestnummer ??
              "",

            status:
              deskcontrole.status,

            mailSanctieVerzonden:
              deskcontrole
                .mailSanctieVerzonden ??
              false,

            typeControle:
              deskcontrole.typeControle ??
              "NIEUWE_CONTROLE",

            mailCorrectieVerzonden:
              deskcontrole
                .mailCorrectieVerzonden ??
              false,

            oneDrive:
              deskcontrole.oneDrive,

            voorwaardelijkeOpheffing:
              deskcontrole
                .voorwaardelijkeOpheffing ??
              false,

            opmerkingen:
              deskcontrole.opmerkingen,

            datumControle:
              datumVoorInput(
                deskcontrole.datumControle,
              ),

            adres:
              deskcontrole.adres,

            finalisatieDatum:
              datumVoorInput(
                deskcontrole
                  .finalisatieDatum,
              ),
          }}
          leden={leden.map((lid) => ({
            id: lid.id,

            naamPersoon:
              lid.naamPersoon,

            ovamId:
              lid.ovamId,

            certificaatnummer:
              lid.certificaatnummer,

            certificatiePlatform:
              lid.certificatiePlatform,

            verwijderd:
              Boolean(
                lid.verwijderdOp,
              ),
          }))}
          procescertificaten={procescertificaten.map(
            (certificaat) => ({
              id: certificaat.id,

              naamBedrijf:
                certificaat.naamBedrijf,

              kboNummer:
                certificaat.kboNummer,

              certificaatnummer:
                certificaat
                  .certificaatnummer,

              verwijderd:
                Boolean(
                  certificaat
                    .verwijderdOp,
                ),
            }),
          )}
        />
      </section>
    </div>
  );
}

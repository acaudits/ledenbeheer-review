import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  OpvolgingSanctieDetailFormulier,
} from "@/components/OpvolgingSanctieDetailFormulier";
import {
  OpvolgingSanctieMailverkeer,
} from "@/components/OpvolgingSanctieMailverkeer";
import {
  opvolgingBronLabel,
} from "@/lib/opvolging-sancties";
import {
  splitsOpvolgingMailConversatie,
} from "@/lib/opvolging-mail-conversatie";
import {
  vereisOpvolgingSanctieBeheer,
} from "@/lib/opvolging-sanctie-toegang";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

function datumInvoer(
  datum: Date | null,
) {
  return datum
    ?.toISOString()
    .slice(0, 10) ?? "";
}

function gebruikersLabel(
  gebruiker: {
    email: string;
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
  },
) {
  return (
    [
      gebruiker.voornaam,
      gebruiker.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

export default async function OpvolgingSanctieDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
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
    await prisma.opvolgingSanctie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
      include: {
        mails: {
          orderBy: [
            {
              verzondenOp:
                "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            id: true,
            bestandsnaam: true,
            bestandstype: true,
            afzenderNaam: true,
            afzenderEmail: true,
            ontvangers: true,
            cc: true,
            onderwerp: true,
            verzondenOp: true,
            tekstInhoud: true,
            bijlagen: true,
            internVerzonden: true,
          },
        },
      },
    });

  if (!registratie) {
    notFound();
  }

  await vereisOpvolgingSanctieBeheer(
    registratie.bronType,
  );

  const auditeurs =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rol: "AUDITEUR",
      },
      select: {
        id: true,
        email: true,
        naam: true,
        voornaam: true,
        achternaam: true,
      },
      orderBy: [
        {
          voornaam: "asc",
        },
        {
          achternaam: "asc",
        },
        {
          email: "asc",
        },
      ],
    });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href="/opvolging-sancties"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
        >
          ← Terug naar overzicht
        </Link>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          {opvolgingBronLabel(
            registratie.bronType,
          )}
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Opvolging/sanctie bewerken
        </h1>

        <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="font-bold text-slate-500">
              Registratie-ID
            </dt>
            <dd>{registratie.id}</dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Bron
            </dt>
            <dd>
              {opvolgingBronLabel(
                registratie.bronType,
              )}
            </dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Bron-ID
            </dt>
            <dd>{registratie.bronId}</dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Aangemaakt
            </dt>
            <dd>
              {registratie.aangemaaktOp.toLocaleString(
                "nl-BE",
              )}
            </dd>
          </div>

          <div>
            <dt className="font-bold text-slate-500">
              Bijgewerkt
            </dt>
            <dd>
              {registratie.bijgewerktOp.toLocaleString(
                "nl-BE",
              )}
            </dd>
          </div>
        </dl>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <OpvolgingSanctieDetailFormulier
          id={id}
          auditeurs={auditeurs.map(
            (auditeur) => ({
              id: auditeur.id,
              label:
                gebruikersLabel(
                  auditeur,
                ),
            }),
          )}
          waarden={{
            auditeur:
              registratie.auditeur ??
              "",
            auditeurGebruikerId:
              registratie.auditeurGebruikerId,
            naamAdi:
              registratie.naamAdi ??
              "",
            opvolgingAfgerond:
              registratie.opvolgingAfgerond,
            datumAfgerond:
              datumInvoer(
                registratie.datumAfgerond,
              ),
            afgerondDoorGebruikerId:
              registratie.afgerondDoorGebruikerId,
            linkAttest:
              registratie.linkAttest ??
              "",
            attestnummer:
              registratie.attestnummer ??
              "",
            reden:
              registratie.reden,
            bedrijfsnaam:
              registratie.bedrijfsnaam ??
              "",
            ovamId:
              registratie.ovamId ??
              "",
            datumVaststelling:
              datumInvoer(
                registratie.datumVaststelling,
              ),
            opmerkingen:
              registratie.opmerkingen ??
              "",
            ncCategorie:
              registratie.ncCategorie,
            sanctieBegindatum:
              datumInvoer(
                registratie.sanctieBegindatum,
              ),
            sanctieEinddatum:
              datumInvoer(
                registratie.sanctieEinddatum,
              ),
            sanctieDoorgezet:
              registratie.sanctieDoorgezet,
            redenNietDoorzetten:
              registratie.redenNietDoorzetten ??
              "",
          }}
        />
      </section>

      <OpvolgingSanctieMailverkeer
        opvolgingId={id}
        mails={splitsOpvolgingMailConversatie(
          registratie.mails,
        )}
      />
    </div>
  );
}

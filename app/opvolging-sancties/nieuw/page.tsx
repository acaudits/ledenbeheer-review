import Link from "next/link";

import {
  OpvolgingSanctieDetailFormulier,
} from "@/components/OpvolgingSanctieDetailFormulier";
import {
  vereisOpvolgingSanctieBeheer,
} from "@/lib/opvolging-sanctie-toegang";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

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

export default async function NieuweOpvolgingSanctiePage() {
  await vereisOpvolgingSanctieBeheer(
    "HANDMATIG",
  );

  const auditeurs =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rollen: {
          has: "AUDITEUR",
        },
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
          Handmatige invoer
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Opvolging/sanctie toevoegen
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Voeg een opvolgingsregistratie toe zonder gekoppelde controle.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <OpvolgingSanctieDetailFormulier
          modus="nieuw"
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
            auditeur: "",
            auditeurGebruikerId:
              null,
            naamAdi: "",
            opvolgingAfgerond:
              false,
            datumAfgerond: "",
            afgerondDoorGebruikerId:
              null,
            linkAttest: "",
            attestnummer: "",
            reden: "",
            bedrijfsnaam: "",
            ovamId: "",
            datumVaststelling: "",
            opmerkingen: "",
            ncCategorie: "CAT_0",
            sanctieBegindatum: "",
            sanctieEinddatum: "",
            sanctieDoorgezet:
              null,
            redenNietDoorzetten:
              "",
          }}
        />
      </section>
    </div>
  );
}

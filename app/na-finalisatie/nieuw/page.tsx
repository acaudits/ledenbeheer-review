import Link from "next/link";

import {
  NaFinalisatieBulkImport,
} from "@/components/NaFinalisatieBulkImport";
import {
  NaFinalisatieFormulier,
} from "@/components/NaFinalisatieFormulier";
import {
  NaFinalisatieExcelImport,
} from "@/components/NaFinalisatieExcelImport";
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

export default async function NieuweNaFinalisatiePage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const isBeheerder =
    gebruiker.rollen.includes("BEHEERDER");

  const gebruikers =
    await prisma.toegestaneGebruiker.findMany({
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
    });

  const auditeurs = Array.from(
    new Set(
      gebruikers
        .map(gebruikersnaam)
        .filter(Boolean),
    ),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Na finalisatie
        </p>

        <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Nieuwe registratie
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Importeer een terreincontrolebestand of voer de registratie handmatig in.
            </p>
          </div>

          <Link
            href="/na-finalisatie"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Terug naar overzicht
          </Link>
        </div>
      </header>

      <NaFinalisatieExcelImport />

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Of handmatig invoeren
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <NaFinalisatieFormulier
          auditeurs={auditeurs}
        />
      </section>

      {isBeheerder ? (
        <>
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Of in bulk importeren
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <NaFinalisatieBulkImport />
        </>
      ) : null}
    </div>
  );
}

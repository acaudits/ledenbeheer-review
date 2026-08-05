import Link from "next/link";

import {
  NaFinalisatieTabel,
  type NaFinalisatieRij,
} from "@/components/NaFinalisatieTabel";
import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export default async function VerwijderdeNaFinalisatiePage() {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const registraties =
    await prisma.naFinalisatie.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      orderBy: [
        {
          verwijderdOp: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  const rijen:
    NaFinalisatieRij[] =
    registraties.map(
      (registratie) => ({
        id: registratie.id,
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
        datumNaFinalisatie:
          registratie.datumNaFinalisatie.toISOString(),
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
        attestId:
          registratie.attestId,
        verwijderdOp:
          registratie.verwijderdOp?.toISOString() ??
          null,
      }),
    );

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href="/na-finalisatie"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
        >
          ← Terug naar Na finalisatie
        </Link>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Controlebeheer
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Verwijderde registraties
        </h1>

        <p className="mt-1.5 text-sm text-slate-500">
          {registraties.length}{" "}
          {registraties.length === 1
            ? "verwijderde registratie"
            : "verwijderde registraties"}
        </p>
      </header>

      <NaFinalisatieTabel
        rijen={rijen}
        magBeheren
        verwijderd
      />
    </div>
  );
}

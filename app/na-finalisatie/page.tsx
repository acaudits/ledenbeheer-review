import Link from "next/link";

import {
  NaFinalisatieBulkImport,
} from "@/components/NaFinalisatieBulkImport";
import {
  NaFinalisatieTabel,
  type NaFinalisatieRij,
} from "@/components/NaFinalisatieTabel";
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

export default async function NaFinalisatiePage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  const registraties =
    await prisma.naFinalisatie.findMany({
      where: {
        verwijderdOp: null,
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
    });

  const geregistreerd =
    registraties.filter(
      (registratie) =>
        registratie.geregistreerd,
    ).length;

  const spontaan =
    registraties.filter(
      (registratie) =>
        registratie.plaatsbezoek ===
        "SPONTAAN",
    ).length;

  const afspraakOfKlacht =
    registraties.filter(
      (registratie) =>
        registratie.plaatsbezoek !==
        "SPONTAAN",
    ).length;

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
      }),
    );

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Controlebeheer
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Na finalisatie
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              {registraties.length} actieve{" "}
              {registraties.length ===
              1
                ? "registratie"
                : "registraties"}
            </p>
          </div>

          {magBeheren ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/na-finalisatie/nieuw"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
              >
                Nieuwe registratie
              </Link>

              <Link
                href="/na-finalisatie/verwijderd"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Verwijderde
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal registraties
          </p>
          <p className="mt-2 text-3xl font-black">
            {registraties.length}
          </p>
        </article>

        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Geregistreerd
          </p>
          <p className="mt-2 text-3xl font-black">
            {geregistreerd}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Niet geregistreerd
          </p>
          <p className="mt-2 text-3xl font-black">
            {registraties.length -
              geregistreerd}
          </p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Spontaan
          </p>
          <p className="mt-2 text-3xl font-black">
            {spontaan}
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Afspraak of klacht
          </p>
          <p className="mt-2 text-3xl font-black">
            {afspraakOfKlacht}
          </p>
        </article>
      </section>

      {magBeheren ? (
        <NaFinalisatieBulkImport />
      ) : null}

      <NaFinalisatieTabel
        rijen={rijen}
        magBeheren={magBeheren}
      />
    </div>
  );
}

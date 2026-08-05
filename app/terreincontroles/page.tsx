import Link from "next/link";

import {
  TerreincontroleDossiersTabel,
  type TerreincontroleDossierRij,
} from "@/components/TerreincontroleDossiersTabel";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function datum(datum: Date) {
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

function statusLabel(
  status: string,
) {
  if (status === "IN_OPMAAK") {
    return "In opmaak";
  }

  if (
    status === "GEACTUALISEERD"
  ) {
    return "Geactualiseerd";
  }

  if (status === "AFGEROND") {
    return "Afgerond";
  }

  return "Geen";
}

export default async function TerreincontrolesPage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  const magExporteren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_EXPORTEREN",
    );

  const dossiers =
    await prisma.terreincontroleDossier.findMany({
      where: {
        verwijderdOp: null,
      },
      orderBy: [
        {
          datumControle: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  const aantalVaststellingen =
    await prisma.terreincontroleVaststelling.count({
      where: {
        terreincontroleDossier: {
          is: {
            verwijderdOp: null,
          },
        },
      },
    });

  const rijen:
    TerreincontroleDossierRij[] =
    dossiers.map((dossier) => ({
      id: dossier.id,
      auditeur: dossier.auditeur,
      naamAdi: dossier.naamAdi,
      linkAttest:
        dossier.linkAttest,
      attestnummer:
        dossier.attestnummer,
      status: statusLabel(
        dossier.status,
      ),
      certificatiePlatform:
        dossier.certificatiePlatform ??
        "",
      opmerkingen:
        dossier.opmerkingen ?? "",
      datumControle: datum(
        dossier.datumControle,
      ),
      adres: dossier.adres ?? "",
      persoonsId:
        dossier.persoonsId,
      bedrijfsnaam:
        dossier.bedrijfsnaam,
      ondernemingsnummer:
        formatteerOndernemingsnummer(
          dossier.ondernemingsnummer,
        ),
      persoonscertificaat:
        dossier
          .persoonscertificaatNummer,
      procescertificaat:
        dossier
          .procescertificaatNummer,
      attestId: dossier.attestId,
    }));

  return (
    <div className="space-y-4">
      <header className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Controlebeheer
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Terreincontroles
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            {dossiers.length} actieve{" "}
            {dossiers.length === 1
              ? "terreincontrole"
              : "terreincontroles"}
          </p>
          </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {magBeheren ? (
            <Link
              href="/terreincontroles/nieuw"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Nieuwe terreincontrole
            </Link>
          ) : null}

          {magExporteren ? (
            <>
              <a
                href="/terreincontroles/export"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
              >
                Exporteren naar Excel
              </a>

              <a
                href="/terreincontroles/export-openstaand"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
              >
                Excel Geen / In opmaak
              </a>
            </>
          ) : null}

          {magBeheren ? (
            <Link
              href="/terreincontroles/verwijderd"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Verwijderde
            </Link>
          ) : null}
        </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal terreincontroles
          </p>

          <p className="mt-2 text-3xl font-black">
            {dossiers.length}
          </p>
        </article>

        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left text-sky-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal non-conformiteiten
          </p>

          <p className="mt-2 text-3xl font-black">
            {aantalVaststellingen}
          </p>
        </article>
      </section>

      <TerreincontroleDossiersTabel
        rijen={rijen}
        magBeheren={magBeheren}
      />
    </div>
  );
}

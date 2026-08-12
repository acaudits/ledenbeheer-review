import Link from "next/link";
import { notFound } from "next/navigation";

import { bewerkTerreincontrole } from "@/app/terreincontroles/dossier-actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const invoer =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const tekstvak =
  "mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

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

export default async function BewerkTerreincontrolePage({
  params,
}: Props) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const { id: idWaarde } =
    await params;

  const id = Number(idWaarde);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const [
    dossier,
    auditeurs,
    leden,
    processen,
  ] = await Promise.all([
    prisma.terreincontroleDossier.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
    }),

    prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rol: "AUDITEUR",
      },
      orderBy: [
        { naam: "asc" },
        { email: "asc" },
      ],
      select: {
        id: true,
        naam: true,
        voornaam: true,
        achternaam: true,
        email: true,
      },
    }),

    prisma.lid.findMany({
      where: {
        verwijderdOp: null,
      },
      orderBy: {
        naamPersoon: "asc",
      },
      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
        certificaatnummer: true,
      },
    }),

    prisma.procescertificaat.findMany({
      where: {
        verwijderdOp: null,
      },
      orderBy: {
        naamBedrijf: "asc",
      },
      select: {
        id: true,
        naamBedrijf: true,
        kboNummer: true,
        certificaatnummer: true,
      },
    }),
  ]);

  if (!dossier) {
    notFound();
  }

  const actie =
    bewerkTerreincontrole.bind(
      null,
      id,
    );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href={`/terreincontroles/${id}`}
        className="text-sm font-bold text-emerald-700"
      >
        ← Terug naar terreincontrole
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-950">
          Terreincontrole bewerken
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {dossier.attestnummer}
        </p>

        <form
          action={actie}
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <label className="text-sm font-semibold text-slate-700">
            Auditeur
            <select
              name="auditeurGebruikerId"
              required
              defaultValue={
                dossier.auditeurGebruikerId ??
                ""
              }
              className={invoer}
            >
              <option value="" disabled>
                Kies een auditeur
              </option>
              {auditeurs.map(
                (auditeur) => (
                  <option
                    key={auditeur.id}
                    value={auditeur.id}
                  >
                    {gebruikersnaam(
                      auditeur,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Naam ADI / Persoonscertificaat
            <select
              name="lidId"
              required
              defaultValue={
                dossier.lidId
              }
              className={invoer}
            >
              {leden.map((lid) => (
                <option
                  key={lid.id}
                  value={lid.id}
                >
                  {lid.naamPersoon} ·{" "}
                  {lid.ovamId} ·{" "}
                  {lid.certificaatnummer}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Bedrijfsnaam / Procescertificaat
            <select
              name="procescertificaatId"
              required
              defaultValue={
                dossier.procescertificaatId ??
                ""
              }
              className={invoer}
            >
              <option value="" disabled>
                Kies een procescertificaat
              </option>

              {processen.map(
                (proces) => (
                  <option
                    key={proces.id}
                    value={proces.id}
                  >
                    {proces.naamBedrijf} ·{" "}
                    {proces.kboNummer} ·{" "}
                    {
                      proces.certificaatnummer
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Link Attest
            <input
              name="linkAttest"
              type="url"
              required
              defaultValue={
                dossier.linkAttest
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Attestnummer
            <input
              name="attestnummer"
              required
              defaultValue={
                dossier.attestnummer
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Datum controle
            <input
              name="datumControle"
              type="date"
              required
              defaultValue={dossier.datumControle
                .toISOString()
                .slice(0, 10)}
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Adres
            <input
              name="adres"
              maxLength={1000}
              defaultValue={
                dossier.adres ?? ""
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Opmerkingen
            <textarea
              name="opmerkingen"
              maxLength={5000}
              defaultValue={
                dossier.opmerkingen ??
                ""
              }
              className={tekstvak}
            />
          </label>

          <div className="flex justify-end gap-3 sm:col-span-2">
            <Link
              href={`/terreincontroles/${id}`}
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700"
            >
              Annuleren
            </Link>

            <button
              type="submit"
              className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white"
            >
              Wijzigingen opslaan
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

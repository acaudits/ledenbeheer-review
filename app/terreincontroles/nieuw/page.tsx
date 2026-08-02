import Link from "next/link";

import { maakTerreincontroleAan } from "@/app/terreincontroles/actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TerreincontroleExcelImport from "./TerreincontroleExcelImport";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    fout?: string;
  }>;
};

const invoerStijl =
  "mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const tekstvakStijl =
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

export default async function NieuweTerreincontrolePage({
  searchParams,
}: Props) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const { fout } =
    await searchParams;

  const [
    auditeurs,
    leden,
    procescertificaten,
  ] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/terreincontroles"
        className="text-sm font-bold text-emerald-700"
      >
        ← Terug naar terreincontroles
      </Link>

      <TerreincontroleExcelImport />

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Of handmatig invoeren
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">
          Handmatige invoer
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-950">
          Nieuwe terreincontrole
        </h1>

        {fout ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {fout}
          </div>
        ) : null}

        <form
          action={
            maakTerreincontroleAan
          }
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <label className="text-sm font-semibold text-slate-700">
            Auditeur
            <select
              name="auditeurGebruikerId"
              required
              defaultValue=""
              className={invoerStijl}
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
              defaultValue=""
              className={invoerStijl}
            >
              <option value="" disabled>
                Kies een persoon
              </option>

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
              defaultValue=""
              className={invoerStijl}
            >
              <option value="" disabled>
                Kies een bedrijf
              </option>

              {procescertificaten.map(
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
              placeholder="https://asbestinventaris.ovam.be/asbestinventaris/..."
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Attestnummer
            <input
              name="attestnummer"
              required
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Status
            <select
              name="status"
              defaultValue="GEEN"
              required
              className={invoerStijl}
            >
              <option value="GEEN">
                Geen
              </option>
              <option value="IN_OPMAAK">
                In opmaak
              </option>
              <option value="GEACTUALISEERD">
                Geactualiseerd
              </option>
              <option value="AFGEROND">
                Afgerond
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Datum controle
            <input
              name="datumControle"
              type="date"
              required
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Adres
            <input
              name="adres"
              maxLength={1000}
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Opmerkingen
            <textarea
              name="opmerkingen"
              maxLength={5000}
              className={tekstvakStijl}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
            <Link
              href="/terreincontroles"
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700"
            >
              Annuleren
            </Link>

            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Terreincontrole opslaan
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

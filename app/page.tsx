import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [aantalPersoonscertificaten, aantalProcescertificaten] =
    await Promise.all([
      prisma.lid.count({
        where: {
          verwijderdOp: null,
        },
      }),
      prisma.procescertificaat.count({
        where: {
          verwijderdOp: null,
        },
      }),
    ]);

  const totaal = aantalPersoonscertificaten + aantalProcescertificaten;

  return (
    <>
      <PageHeader
        titel="Dashboard"
        beschrijving="Beheer persoonscertificaten en procescertificaten vanuit één centrale omgeving."
      />

      <section className="mb-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Alle certificaten
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totaal}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <p className="text-sm font-medium text-emerald-800">
            Persoonscertificaten
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {aantalPersoonscertificaten}
          </p>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
          <p className="text-sm font-medium text-teal-800">
            Procescertificaten
          </p>
          <p className="mt-2 text-3xl font-bold text-teal-950">
            {aantalProcescertificaten}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="h-1.5 bg-emerald-600" />

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <svg viewBox="0 0 24 24" fill="none" className="size-6">
                <path
                  d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-sm font-semibold text-emerald-700">
              {aantalPersoonscertificaten} geregistreerd
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Persoonscertificaten
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Beheer persoonsgegevens, OVAM-ID&apos;s,
              certificaatnummers en certificatieplatformen.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/persoonscertificaten"
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Bekijk overzicht
              </Link>

              <Link
                href="/persoonscertificaten/nieuw"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
              >
                Nieuw toevoegen
              </Link>
            </div>
          </div>
        </article>

        <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="h-1.5 bg-teal-700" />

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <svg viewBox="0 0 24 24" fill="none" className="size-6">
                <path
                  d="M4 20V8h16v12M8 8V4h8v4M8 12h2m4 0h2M8 16h2m4 0h2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-sm font-semibold text-teal-700">
              {aantalProcescertificaten} geregistreerd
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Procescertificaten
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Beheer bedrijven, KBO-nummers, certificaatnummers en
              OneDrive-documenten.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/procescertificaten"
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Bekijk overzicht
              </Link>

              <Link
                href="/procescertificaten/nieuw"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50"
              >
                Nieuw toevoegen
              </Link>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

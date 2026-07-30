import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LidFormulier from "./LidFormulier";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nieuw persoonscertificaat | SKH CRM",
};

export default async function NieuwPersoonscertificaatPage() {
  const resultaten = await prisma.procescertificaat.findMany({
    select: {
      naamBedrijf: true,
    },
    orderBy: {
      naamBedrijf: "asc",
    },
  });

  const bedrijven = Array.from(
    new Set(
      resultaten
        .map((resultaat) => resultaat.naamBedrijf.trim())
        .filter(Boolean),
    ),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/persoonscertificaten"
        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
      >
        ← Terug naar persoonscertificaten
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-100">
            SKH · Persoonscertificaten
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuw persoonscertificaat
          </h1>

          <p className="mt-2 text-emerald-100">
            Registreer de contact-, bedrijfs- en certificatiegegevens.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <LidFormulier bedrijven={bedrijven} />
        </div>
      </section>
    </div>
  );
}

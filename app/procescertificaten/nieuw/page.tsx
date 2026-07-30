import Link from "next/link";
import { vereisMachtiging } from "@/lib/auth";
import ProcescertificaatFormulier from "./ProcescertificaatFormulier";

export const metadata = {
  title: "Nieuw procescertificaat | SKH CRM",
};

export default async function NieuwProcescertificaatPage() {
  await vereisMachtiging("CERTIFICATEN_BEHEREN");

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/procescertificaten"
        className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
      >
        ← Terug naar procescertificaten
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-100">
            SKH · Procescertificaten
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuw procescertificaat
          </h1>

          <p className="mt-2 max-w-2xl text-emerald-100">
            Registreer het bedrijf en de bijbehorende
            certificatiegegevens.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <ProcescertificaatFormulier />
        </div>
      </section>
    </div>
  );
}

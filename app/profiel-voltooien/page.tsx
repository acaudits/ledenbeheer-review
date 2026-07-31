import { redirect } from "next/navigation";

import { ProfielFormulier } from "@/app/profiel/ProfielFormulier";
import { vereisIngelogdeGebruiker } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfielVoltooienPage() {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  if (gebruiker.profielVoltooidOp) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="mb-7 text-center">
          <img
            src="/skh-logo.svg"
            alt="SKH"
            className="mx-auto mb-6 h-20 w-44 object-contain"
          />

          <h1 className="text-2xl font-bold text-slate-950">
            Voltooi je profiel
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Vul je gegevens aan voordat je de applicatie gebruikt.
          </p>
        </div>

        <ProfielFormulier
          voornaam={gebruiker.voornaam ?? ""}
          achternaam={gebruiker.achternaam ?? ""}
          email={gebruiker.email}
          eersteInstelling
        />
      </section>
    </main>
  );
}

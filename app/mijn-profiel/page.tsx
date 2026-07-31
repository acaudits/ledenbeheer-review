import { ProfielFormulier } from "@/app/profiel/ProfielFormulier";
import { PageHeader } from "@/components/PageHeader";
import { vereisIngelogdeGebruiker } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MijnProfielPage() {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titel="Mijn profiel"
        beschrijving="Beheer je persoonlijke gegevens en loginadres."
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ProfielFormulier
          voornaam={gebruiker.voornaam ?? ""}
          achternaam={gebruiker.achternaam ?? ""}
          email={gebruiker.email}
        />
      </section>
    </div>
  );
}

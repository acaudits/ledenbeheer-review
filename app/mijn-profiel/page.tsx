import { ProfielFormulier } from "@/app/profiel/ProfielFormulier";
import { PageHeader } from "@/components/PageHeader";
import { PushMeldingen } from "@/components/PushMeldingen";
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

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">
          Pushmeldingen
        </h2>

        <p className="mt-2 mb-5 text-sm leading-6 text-slate-600">
          Ontvang een melding op dit toestel wanneer
          een rode laattijdige plaatsbezoekmelding
          wordt geregistreerd.
        </p>

        <PushMeldingen
          publiekeSleutel={
            process.env
              .NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
            ""
          }
          toegelaten={
            gebruiker.rollen.includes("BEHEERDER") ||
            gebruiker.rollen.includes("AUDITEUR")
          }
        />
      </section>
    </div>
  );
}

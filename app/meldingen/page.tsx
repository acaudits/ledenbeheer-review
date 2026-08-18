import {
  MeldingenLijst,
} from "@/components/MeldingenLijst";
import {
  PageHeader,
} from "@/components/PageHeader";
import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function MeldingenPage() {
  await vereisIngelogdeGebruiker();

  return (
    <div className="space-y-4">
      <PageHeader
        bovenTitel="Persoonlijk"
        titel="Meldingen"
        beschrijving="Bekijk deadlinewaarschuwingen en beheer welke meldingen je al gelezen hebt."
      />

      <MeldingenLijst />
    </div>
  );
}

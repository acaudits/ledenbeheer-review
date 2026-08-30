import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  AfwezigeTerreincontroleAantalTekst,
  AfwezigeTerreincontroleDashboard,
} from "@/components/AfwezigeTerreincontroleDashboard";
import {
  AfwezigeTerreincontrolesTabel,
} from "@/components/AfwezigeTerreincontrolesTabel";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisMachtiging,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function AfwezigeTerreincontrolesPage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rollen,
      "TERREINCONTROLES_BEHEREN",
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Afwezigen"
        omschrijving={
          <AfwezigeTerreincontroleAantalTekst />
        }
        acties={
          <BeheerActieLink
            href="/terreincontroles-inplannen"
            variant="neutraal"
            kinderen="← Terug naar planning"
          />
        }
      />

      <AfwezigeTerreincontroleDashboard />

      <AfwezigeTerreincontrolesTabel
        magBeheren={magBeheren}
      />
    </div>
  );
}

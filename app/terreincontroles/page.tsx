import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  TerreincontroleAantalTekst,
  TerreincontroleDashboard,
} from "@/components/TerreincontroleDashboard";
import {
  TerreincontroleDossiersTabel,
} from "@/components/TerreincontroleDossiersTabel";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisMachtiging,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function TerreincontrolesPage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  const magExporteren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_EXPORTEREN",
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Terreincontroles"
        omschrijving={
          <TerreincontroleAantalTekst />
        }
        acties={
          <>
            {magBeheren ? (
              <BeheerActieLink
                href="/terreincontroles/nieuw"
                variant="primair"
                plusIcoon
                kinderen="Nieuwe terreincontrole"
              />
            ) : null}

            {magExporteren ? (
              <BeheerActieLink
                href="/terreincontroles/export"
                variant="secundair"
                kinderen="Exporteren naar Excel"
              />
            ) : null}

            {magBeheren ? (
              <BeheerActieLink
                href="/terreincontroles/verwijderd"
                variant="neutraal"
                kinderen="Verwijderde"
              />
            ) : null}
          </>
        }
      />

      <TerreincontroleDashboard />

      <TerreincontroleDossiersTabel
        rijen={[]}
        magBeheren={magBeheren}
        serverModus
      />
    </div>
  );
}

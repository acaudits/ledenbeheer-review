import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  IngeplandeTerreincontroleAantalTekst,
  IngeplandeTerreincontroleDashboard,
} from "@/components/IngeplandeTerreincontroleDashboard";
import { IngeplandeTerreincontroleMeerMenu } from "@/components/IngeplandeTerreincontroleMeerMenu";
import { TerreincontrolesTabel } from "@/components/TerreincontrolesTabel";
import { heeftMachtiging } from "@/lib/autorisatie";
import { vereisMachtiging } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TerreincontrolesPage() {
  const gebruiker = await vereisMachtiging("TERREINCONTROLES_BEKIJKEN");

  const magBeheren = heeftMachtiging(gebruiker.rol, "TERREINCONTROLES_BEHEREN");

  const magExporteren = heeftMachtiging(
    gebruiker.rol,
    "TERREINCONTROLES_EXPORTEREN",
  );

  const magStatussenImporteren = heeftMachtiging(
    gebruiker.rol,
    "TERREINCONTROLES_STATUS_IMPORTEREN",
  );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        titel="Inplannen terreincontrole"
        omschrijving={<IngeplandeTerreincontroleAantalTekst />}
        acties={
          <>
            {magBeheren ? (
              <BeheerActieLink
                href="/terreincontroles-inplannen/nieuw"
                variant="primair"
                plusIcoon
                kinderen="Nieuwe terreincontrole"
              />
            ) : null}

            <IngeplandeTerreincontroleMeerMenu
              magBeheren={magBeheren}
              magExporteren={magExporteren}
              magStatussenImporteren={magStatussenImporteren}
            />
          </>
        }
      />

      <IngeplandeTerreincontroleDashboard />

      <TerreincontrolesTabel rijen={[]} magBeheren={magBeheren} serverModus />
    </div>
  );
}

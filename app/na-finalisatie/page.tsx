import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  NaFinalisatieAantalTekst,
  NaFinalisatieDashboard,
} from "@/components/NaFinalisatieDashboard";
import {
  NaFinalisatieTabel,
} from "@/components/NaFinalisatieTabel";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisMachtiging,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function NaFinalisatiePage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Na finalisatie"
        omschrijving={
          <NaFinalisatieAantalTekst />
        }
        acties={
          magBeheren ? (
            <>
              <BeheerActieLink
                href="/na-finalisatie/nieuw"
                variant="primair"
                plusIcoon
                kinderen="Nieuwe registratie"
              />

              <BeheerActieLink
                href="/na-finalisatie/verwijderd"
                variant="neutraal"
                kinderen="Verwijderde"
              />
            </>
          ) : undefined
        }
      />

      <NaFinalisatieDashboard />

      <NaFinalisatieTabel
        rijen={[]}
        magBeheren={magBeheren}
        serverModus
      />
    </div>
  );
}

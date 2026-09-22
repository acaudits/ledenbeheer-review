import {
  LaattijdigePlaatsbezoekenKop,
} from "@/components/LaattijdigePlaatsbezoekenKop";
import {
  LaattijdigePlaatsbezoekenTabel,
} from "@/components/LaattijdigePlaatsbezoekenTabel";
import {
  vereisMachtiging,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

export default async function LaattijdigePlaatsbezoekenPage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const isBeheerder =
    gebruiker.rollen.includes(
      "BEHEERDER",
    );

  return (
    <div className="space-y-4">
      <LaattijdigePlaatsbezoekenKop
        toonFormuliergebruik={
          isBeheerder
        }
      />

      <LaattijdigePlaatsbezoekenTabel
        serverModus
      />
    </div>
  );
}

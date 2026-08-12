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
  await vereisMachtiging(
    "TERREINCONTROLES_BEKIJKEN",
  );

  return (
    <div>
      <LaattijdigePlaatsbezoekenKop />

      <LaattijdigePlaatsbezoekenTabel
        serverModus
      />
    </div>
  );
}

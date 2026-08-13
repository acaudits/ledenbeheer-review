import { PaginaInOntwikkeling } from "@/components/PaginaInOntwikkeling";
import { vereisMachtiging } from "@/lib/auth";

export default async function KennisAuditeursPage() {
  await vereisMachtiging("CERTIFICATEN_BEKIJKEN");

  return <PaginaInOntwikkeling titel="Kennis auditeurs" />;
}

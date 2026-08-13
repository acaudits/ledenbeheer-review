import { PaginaInOntwikkeling } from "@/components/PaginaInOntwikkeling";
import { vereisMachtiging } from "@/lib/auth";

export default async function OpvolgingSanctiesPage() {
  await vereisMachtiging("CERTIFICATEN_BEKIJKEN");

  return <PaginaInOntwikkeling titel="Opvolging/sancties" />;
}

import { PaginaInOntwikkeling } from "@/components/PaginaInOntwikkeling";
import { vereisMachtiging } from "@/lib/auth";

export default async function BegeleidingStartersPage() {
  await vereisMachtiging("CERTIFICATEN_BEKIJKEN");

  return <PaginaInOntwikkeling titel="Begeleiding starters" />;
}

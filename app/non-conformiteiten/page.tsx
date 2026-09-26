import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NonConformiteitenLijst } from "@/components/NonConformiteitenLijst";
import { heeftMachtiging } from "@/lib/autorisatie";
import { vereisIngelogdeGebruiker } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Non-conformiteiten",
};

export default async function NonConformiteitenPage() {
  const gebruiker = await vereisIngelogdeGebruiker();

  const magBekijken =
    heeftMachtiging(gebruiker.rollen, "DESKCONTROLES_BEKIJKEN") ||
    heeftMachtiging(gebruiker.rollen, "TERREINCONTROLES_BEKIJKEN");

  if (!magBekijken) {
    redirect("/");
  }

  return (
    <main className="min-w-0 p-3 sm:p-5 lg:p-6">
      <NonConformiteitenLijst />
    </main>
  );
}

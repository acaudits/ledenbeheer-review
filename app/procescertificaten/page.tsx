import { PageHeader } from "@/components/PageHeader";
import {
  CertificatenTabel,
  type CertificaatKolom,
} from "@/components/CertificatenTabel";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";

export const dynamic = "force-dynamic";

const kolommen: CertificaatKolom[] = [
  {
    sleutel: "bedrijf",
    label: "Bedrijf",
  },
  {
    sleutel: "kboNummer",
    label: "Ondernemingsnummer / EU-btw-nummer",
  },
  {
    sleutel: "certificaatnummer",
    label: "Certificaatnummer",
  },
  {
    sleutel: "uitgereiktOp",
    label: "Uitgereikt op",
    type: "datum",
  },
  {
    sleutel: "oneDrive",
    label: "OneDrive",
    type: "url",
  },
  {
    sleutel: "opmerking",
    label: "Opmerking",
  },
  {
    sleutel: "ondernemingstype",
    label: "Type",
    type: "badge",
  },
];

export default async function ProcescertificatenPage() {
  const gebruiker = await vereisMachtiging("CERTIFICATEN_BEKIJKEN");

  const magBeheren = heeftMachtiging(gebruiker.rol, "CERTIFICATEN_BEHEREN");

  return (
    <div className="space-y-4">
      <PageHeader
        compact
        titel="Procescertificaten"
        beschrijving="Actieve procescertificaten"
        actieTekst={magBeheren ? "Nieuw procescertificaat" : undefined}
        actieHref={magBeheren ? "/procescertificaten/nieuw" : undefined}
        secundaireActieTekst={magBeheren ? "Verwijderde" : undefined}
        secundaireActieHref={
          magBeheren ? "/procescertificaten/verwijderd" : undefined
        }
      />

      <CertificatenTabel
        rijen={[]}
        serverModus
        kaartWeergave
        kolommen={kolommen}
        zoekPlaceholder="Zoeken in procescertificaten..."
        legeTitel="Nog geen procescertificaten"
        legeBeschrijving="Voeg het eerste procescertificaat toe om de lijst op te bouwen."
        nieuwHref="/procescertificaten/nieuw"
        nieuwTekst="Nieuw procescertificaat"
        bewerkBasisHref="/procescertificaten"
        soort="proces"
        magBeheren={magBeheren}
      />
    </div>
  );
}

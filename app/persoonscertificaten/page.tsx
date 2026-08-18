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
    sleutel: "naamPersoon",
    label: "Naam persoon",
  },
  {
    sleutel: "controleTargetStatus",
    label: "Target",
    type: "statusbol",
  },
  {
    sleutel: "telefoonnummer",
    label: "Telefoonnummer",
  },
  {
    sleutel: "mailadres",
    label: "Mailadres",
  },
  {
    sleutel: "ovamId",
    label: "OVAM-ID",
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
    sleutel: "bedrijf",
    label: "Bedrijf",
  },
  {
    sleutel: "aansluiting",
    label: "Aansluiting",
  },
  {
    sleutel: "opmerking",
    label: "Opmerking",
  },
  {
    sleutel: "certificatiePlatform",
    label: "Certificatieplatform",
    type: "url",
  },
];

export default async function PersoonscertificatenPage() {
  const gebruiker = await vereisMachtiging(
    "CERTIFICATEN_BEKIJKEN",
  );

  const magBeheren = heeftMachtiging(
    gebruiker.rol,
    "CERTIFICATEN_BEHEREN",
  );

  return (
    <div className="space-y-4">
      <PageHeader
        compact
        titel="Persoonscertificaten"
        beschrijving="Actieve persoonscertificaten"
        actieTekst={
          magBeheren
            ? "Nieuw persoonscertificaat"
            : undefined
        }
        actieHref={
          magBeheren
            ? "/persoonscertificaten/nieuw"
            : undefined
        }
        secundaireActieTekst={
          magBeheren ? "Verwijderde" : undefined
        }
        secundaireActieHref={
          magBeheren
            ? "/persoonscertificaten/verwijderd"
            : undefined
        }
      />

      <CertificatenTabel
        rijen={[]}
        serverModus
        kolommen={kolommen}
        zoekPlaceholder="Zoeken in persoonscertificaten..."
        legeTitel="Nog geen persoonscertificaten"
        legeBeschrijving="Voeg het eerste persoonscertificaat toe om de lijst op te bouwen."
        nieuwHref="/persoonscertificaten/nieuw"
        nieuwTekst="Nieuw persoonscertificaat"
        bewerkBasisHref="/persoonscertificaten"
        detailBasisHref="/persoonscertificaten"
        soort="persoon"
        magBeheren={magBeheren}
      />
    </div>
  );
}

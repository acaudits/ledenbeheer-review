import { PageHeader } from "@/components/PageHeader";
import {
  CertificatenTabel,
  type CertificaatKolom,
} from "@/components/CertificatenTabel";
import { prisma } from "@/lib/prisma";
import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";

export const dynamic = "force-dynamic";

function formatteerDatum(datum: Date | null) {
  if (!datum) {
    return "";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(datum);
}

const kolommen: CertificaatKolom[] = [
  {
    sleutel: "naamPersoon",
    label: "Naam persoon",
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
  const gebruiker = await vereisIngelogdeGebruiker();

  const magBeheren = heeftMachtiging(
    gebruiker.rol,
    "CERTIFICATEN_BEHEREN",
  );

  const leden = await prisma.lid.findMany({
    where: {
      verwijderdOp: null,
    },
    orderBy: {
      naamPersoon: "asc",
    },
  });

  const rijen = leden.map((lid) => ({
    id: lid.id,
    naamPersoon: lid.naamPersoon,
    telefoonnummer: lid.telefoonnummer,
    mailadres: lid.mailadres,
    ovamId: lid.ovamId,
    certificaatnummer:
      lid.certificaatnummer,
    uitgereiktOp: formatteerDatum(
      lid.uitgereiktOp,
    ),
    bedrijf: lid.bedrijf,
    aansluiting: lid.aansluiting,
    opmerking: lid.opmerking,
    certificatiePlatform:
      lid.certificatiePlatform,
  }));

  return (
    <>
      <PageHeader
        compact
        titel="Persoonscertificaten"
        beschrijving={`${leden.length} actieve persoonscertificaten`}
        actieTekst={
          magBeheren ? "Nieuw persoonscertificaat" : undefined
        }
        actieHref={
          magBeheren ? "/persoonscertificaten/nieuw" : undefined
        }
        secundaireActieTekst={
          magBeheren ? "Verwijderde" : undefined
        }
        secundaireActieHref={
          magBeheren ? "/persoonscertificaten/verwijderd" : undefined
        }
      />

      <CertificatenTabel
        rijen={rijen}
        kolommen={kolommen}
        zoekPlaceholder="Zoeken in persoonscertificaten..."
        legeTitel="Nog geen persoonscertificaten"
        legeBeschrijving="Voeg het eerste persoonscertificaat toe om de lijst op te bouwen."
        nieuwHref="/persoonscertificaten/nieuw"
        nieuwTekst="Nieuw persoonscertificaat"
        bewerkBasisHref="/persoonscertificaten"
        soort="persoon"
        magBeheren={magBeheren}
      />
    </>
  );
}

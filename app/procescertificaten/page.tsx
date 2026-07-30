import { PageHeader } from "@/components/PageHeader";
import {
  CertificatenTabel,
  type CertificaatKolom,
} from "@/components/CertificatenTabel";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";
import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";

export const dynamic = "force-dynamic";

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

const kolommen: CertificaatKolom[] = [
  {
    sleutel: "bedrijf",
    label: "Bedrijf",
  },
  {
    sleutel: "kboNummer",
    label:
      "Ondernemingsnummer / EU-btw-nummer",
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
  const gebruiker = await vereisIngelogdeGebruiker();

  const magBeheren = heeftMachtiging(
    gebruiker.rol,
    "CERTIFICATEN_BEHEREN",
  );

  const procescertificaten =
    await prisma.procescertificaat.findMany({
      where: {
        verwijderdOp: null,
      },
      orderBy: {
        naamBedrijf: "asc",
      },
    });

  const rijen =
    procescertificaten.map(
      (certificaat) => ({
        id: certificaat.id,
        bedrijf:
          certificaat.naamBedrijf,
        kboNummer:
          formatteerOndernemingsnummer(
            certificaat.kboNummer,
          ),
        certificaatnummer:
          certificaat.certificaatnummer,
        uitgereiktOp:
          formatteerDatum(
            certificaat.uitgereiktOp,
          ),
        oneDrive:
          certificaat.oneDrive,
        opmerking:
          certificaat.opmerking,
        ondernemingstype:
          certificaat.ondernemingstype ===
          "EENMANSZAAK"
            ? "Eenmanszaak"
            : "Bedrijf",
      }),
    );

  return (
    <>
      <PageHeader
        compact
        titel="Procescertificaten"
        beschrijving={`${procescertificaten.length} actieve procescertificaten`}
        actieTekst={
          magBeheren ? "Nieuw procescertificaat" : undefined
        }
        actieHref={
          magBeheren ? "/procescertificaten/nieuw" : undefined
        }
        secundaireActieTekst={
          magBeheren ? "Verwijderde" : undefined
        }
        secundaireActieHref={
          magBeheren ? "/procescertificaten/verwijderd" : undefined
        }
      />

      <CertificatenTabel
        rijen={rijen}
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
    </>
  );
}

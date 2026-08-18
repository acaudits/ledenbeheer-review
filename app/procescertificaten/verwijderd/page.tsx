import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  VerwijderdeBeheerTabel,
  type VerwijderdeBeheerTabelRij,
} from "@/components/VerwijderdeBeheerTabel";
import {
  vereisMachtiging,
} from "@/lib/auth";
import type {
  BeheerTabelKolom,
} from "@/lib/beheer-tabel";
import {
  formatteerOndernemingsnummer,
} from "@/lib/ondernemingsnummer";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const kolommen:
  BeheerTabelKolom[] = [
    {
      sleutel: "naamBedrijf",
      label: "Bedrijf",
    },
    {
      sleutel: "ondernemingsnummer",
      label:
        "Ondernemingsnummer / EU-btw-nummer",
    },
    {
      sleutel: "certificaatnummer",
      label: "Certificaatnummer",
    },
    {
      sleutel: "type",
      label: "Type",
      type: "badge",
    },
    {
      sleutel: "verwijderdOp",
      label: "Verwijderd op",
      type: "datum",
    },
  ];

function datum(
  waarde: Date | null,
) {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(waarde);
}

export default async function VerwijderdeProcescertificatenPage() {
  await vereisMachtiging(
    "CERTIFICATEN_BEHEREN",
  );

  const certificaten =
    await prisma.procescertificaat.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      orderBy: {
        verwijderdOp: "desc",
      },
    });

  const rijen:
    VerwijderdeBeheerTabelRij[] =
    certificaten.map(
      (certificaat) => ({
        id: certificaat.id,
        naamBedrijf:
          certificaat.naamBedrijf,
        ondernemingsnummer:
          formatteerOndernemingsnummer(
            certificaat.kboNummer,
          ),
        certificaatnummer:
          certificaat.certificaatnummer,
        type:
          certificaat.ondernemingstype ===
          "EENMANSZAAK"
            ? "Eenmanszaak"
            : "Bedrijf",
        verwijderdOp:
          datum(
            certificaat.verwijderdOp,
          ),
        actieNaam:
          certificaat.naamBedrijf,
      }),
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Procescertificaten"
        titel="Verwijderde procescertificaten"
        omschrijving={`${certificaten.length} verwijderde registraties`}
        acties={
          <BeheerActieLink
            href="/procescertificaten"
            variant="neutraal"
            kinderen="← Terug naar procescertificaten"
          />
        }
      />

      <VerwijderdeBeheerTabel
        rijen={rijen}
        kolommen={kolommen}
        herstelType="proces"
        zoekPlaceholder="Zoeken in verwijderde procescertificaten..."
        legeTitel="Geen verwijderde procescertificaten"
        legeBeschrijving="Verwijderde procescertificaten verschijnen hier."
        resultaatEnkelvoud="verwijderd procescertificaat"
        resultaatMeervoud="verwijderde procescertificaten"
      />
    </div>
  );
}

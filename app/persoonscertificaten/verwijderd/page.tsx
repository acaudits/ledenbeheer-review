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
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const kolommen:
  BeheerTabelKolom[] = [
    {
      sleutel: "naamPersoon",
      label: "Naam persoon",
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
      sleutel: "bedrijf",
      label: "Bedrijf",
    },
    {
      sleutel: "mailadres",
      label: "Mailadres",
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

export default async function VerwijderdePersoonscertificatenPage() {
  await vereisMachtiging(
    "CERTIFICATEN_BEHEREN",
  );

  const leden =
    await prisma.lid.findMany({
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
    leden.map(
      (lid) => ({
        id: lid.id,
        naamPersoon:
          lid.naamPersoon,
        ovamId:
          lid.ovamId,
        certificaatnummer:
          lid.certificaatnummer,
        bedrijf:
          lid.bedrijf,
        mailadres:
          lid.mailadres,
        verwijderdOp:
          datum(
            lid.verwijderdOp,
          ),
        actieNaam:
          lid.naamPersoon,
      }),
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Persoonscertificaten"
        titel="Verwijderde persoonscertificaten"
        omschrijving={`${leden.length} verwijderde registraties`}
        acties={
          <BeheerActieLink
            href="/persoonscertificaten"
            variant="neutraal"
            kinderen="← Terug naar persoonscertificaten"
          />
        }
      />

      <VerwijderdeBeheerTabel
        rijen={rijen}
        kolommen={kolommen}
        herstelType="persoon"
        zoekPlaceholder="Zoeken in verwijderde persoonscertificaten..."
        legeTitel="Geen verwijderde persoonscertificaten"
        legeBeschrijving="Verwijderde persoonscertificaten verschijnen hier."
        resultaatEnkelvoud="verwijderd persoonscertificaat"
        resultaatMeervoud="verwijderde persoonscertificaten"
      />
    </div>
  );
}

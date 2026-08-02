import { PageHeader } from "@/components/PageHeader";
import {
  CertificatenTabel,
  type CertificaatKolom,
} from "@/components/CertificatenTabel";
import { prisma } from "@/lib/prisma";
import { vereisMachtiging } from "@/lib/auth";
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

type TargetStatus =
  | "GRIJS"
  | "ROOD"
  | "GEEL"
  | "GROEN";

function berekenTargetStatus({
  aantalAttesten,
  aantalDeskcontroles,
  aantalTerreincontroles,
}: {
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalTerreincontroles: number;
}): TargetStatus {
  if (aantalAttesten === 0) {
    return "GRIJS";
  }

  if (
    aantalDeskcontroles === 0 ||
    aantalTerreincontroles === 0
  ) {
    return "ROOD";
  }

  const targetDeskcontroles = Math.ceil(
    aantalAttesten * 0.05,
  );

  const targetTerreincontroles = Math.min(
    4,
    Math.ceil(aantalAttesten / 100),
  );

  if (
    aantalDeskcontroles >=
      targetDeskcontroles &&
    aantalTerreincontroles >=
      targetTerreincontroles
  ) {
    return "GROEN";
  }

  return "GEEL";
}

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

  const leden = await prisma.lid.findMany({
    where: {
      verwijderdOp: null,
    },
    orderBy: {
      naamPersoon: "asc",
    },
  });

  const lidIds = leden.map((lid) => lid.id);
  const ovamIds = leden.map((lid) => lid.ovamId);

  const [
    atteststatistieken,
    deskcontroletellingen,
    terreincontroletellingen,
  ] = await Promise.all([
    prisma.attestPersoonStatistiek.findMany({
      where: {
        persoonsId: {
          in: ovamIds,
        },
      },
      select: {
        persoonsId: true,
        aantalAttesten: true,
      },
    }),

    prisma.deskcontrole.groupBy({
      by: ["lidId"],
      where: {
        verwijderdOp: null,
        lidId: {
          in: lidIds,
        },
      },
      _count: {
        _all: true,
      },
    }),

    prisma.terreincontroleDossier.groupBy({
      by: ["lidId"],
      where: {
        verwijderdOp: null,
        lidId: {
          in: lidIds,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const attestenPerPersoon = new Map(
    atteststatistieken.map((statistiek) => [
      statistiek.persoonsId,
      statistiek.aantalAttesten,
    ]),
  );

  const deskcontrolesPerLid = new Map(
    deskcontroletellingen.map((telling) => [
      telling.lidId,
      telling._count._all,
    ]),
  );

  const terreincontrolesPerLid = new Map(
    terreincontroletellingen.map(
      (telling) => [
        telling.lidId,
        telling._count._all,
      ],
    ),
  );

  const rijen = leden.map((lid) => {
    const aantalAttesten =
      attestenPerPersoon.get(lid.ovamId) ?? 0;

    const aantalDeskcontroles =
      deskcontrolesPerLid.get(lid.id) ?? 0;

    const aantalTerreincontroles =
      terreincontrolesPerLid.get(lid.id) ?? 0;

    const targetDeskcontroles =
      aantalAttesten === 0
        ? 0
        : Math.ceil(aantalAttesten * 0.05);

    const targetTerreincontroles =
      aantalAttesten === 0
        ? 0
        : Math.min(
            4,
            Math.ceil(aantalAttesten / 100),
          );

    const controleTargetStatus =
      berekenTargetStatus({
        aantalAttesten,
        aantalDeskcontroles,
        aantalTerreincontroles,
      });

    const controleTargetStatusToelichting =
      aantalAttesten === 0
        ? "Geen attesten — er zijn geen controletargets."
        : [
            `${aantalAttesten} attesten`,
            `deskcontroles ${aantalDeskcontroles}/${targetDeskcontroles}`,
            `terreincontroles ${aantalTerreincontroles}/${targetTerreincontroles}`,
          ].join(" · ");

    return {
      id: lid.id,
      naamPersoon: lid.naamPersoon,
      controleTargetStatus,
      controleTargetStatusToelichting,
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
    };
  });

  return (
    <>
      <PageHeader
        compact
        titel="Persoonscertificaten"
        beschrijving={`${leden.length} actieve persoonscertificaten`}
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
        rijen={rijen}
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
    </>
  );
}

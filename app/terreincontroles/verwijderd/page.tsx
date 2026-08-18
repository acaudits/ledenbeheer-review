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

type Props = {
  searchParams: Promise<{
    hersteld?: string;
  }>;
};

const kolommen:
  BeheerTabelKolom[] = [
    {
      sleutel: "attestnummer",
      label: "Attestnummer",
    },
    {
      sleutel: "naamAdi",
      label: "Naam ADI",
    },
    {
      sleutel: "bedrijfsnaam",
      label: "Bedrijfsnaam",
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
      timeZone: "UTC",
    },
  ).format(waarde);
}

export default async function VerwijderdeTerreincontrolesPage({
  searchParams,
}: Props) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const { hersteld } =
    await searchParams;

  const dossiers =
    await prisma.terreincontroleDossier.findMany({
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
    dossiers.map(
      (dossier) => ({
        id: dossier.id,
        attestnummer:
          dossier.attestnummer,
        naamAdi:
          dossier.naamAdi,
        bedrijfsnaam:
          dossier.bedrijfsnaam,
        verwijderdOp:
          datum(
            dossier.verwijderdOp,
          ),
      }),
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Verwijderde terreincontroles"
        omschrijving={`${dossiers.length} verwijderde terreincontroles`}
        acties={
          <BeheerActieLink
            href="/terreincontroles"
            variant="neutraal"
            kinderen="← Terug naar terreincontroles"
          />
        }
      />

      {hersteld === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          De terreincontrole is hersteld.
        </div>
      ) : null}

      <VerwijderdeBeheerTabel
        rijen={rijen}
        kolommen={kolommen}
        herstelType="terreincontrole-dossier"
        zoekPlaceholder="Zoeken in verwijderde terreincontroles..."
        legeTitel="Geen verwijderde terreincontroles"
        legeBeschrijving="Er zijn momenteel geen verwijderde terreincontroles."
        resultaatEnkelvoud="verwijderde terreincontrole"
        resultaatMeervoud="verwijderde terreincontroles"
      />
    </div>
  );
}

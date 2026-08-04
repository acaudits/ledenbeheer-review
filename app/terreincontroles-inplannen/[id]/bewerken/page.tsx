import Link from "next/link";
import { notFound } from "next/navigation";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatteerDatabaseTijd } from "@/lib/terreincontrole";

import TerreincontroleBewerkFormulier, {
  type BewerkbareTerreincontrole,
} from "./TerreincontroleBewerkFormulier";

export const dynamic =
  "force-dynamic";

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
};

function datumVoorInput(
  datum: Date | null,
) {
  if (!datum) {
    return "";
  }

  return datum
    .toISOString()
    .slice(0, 10);
}

export default async function TerreincontroleBewerkenPage({
  params,
}: PaginaProps) {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

  const { id: idTekst } =
    await params;

  const id = Number(idTekst);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const terreincontrole =
    await prisma.terreincontrole.findFirst(
      {
        where: {
          id,
          verwijderdOp: null,
        },
        select: {
          id: true,
          auditeur: true,
          status: true,
          factuurVerzonden: true,

          inspectielocatie: true,
          bouwjaar: true,
          vloeroppervlakteM2: true,

          datumPlaatsbezoek: true,
          uurPlaatsbezoek: true,

          ovamId: true,
          naamAdi: true,
          attestUrl: true,
          bedrijfsnaam: true,

          postcode: true,
          gemeente: true,
          straat: true,
          huisnummer: true,
          extraAdresDetails: true,

          perceelGemeenteCode: true,
          perceelAfdelingscode: true,
          perceelSectieCode: true,

          attestId: true,
          opmerkingen: true,
        },
      },
    );

  if (!terreincontrole) {
    notFound();
  }

  const formulierGegevens:
    BewerkbareTerreincontrole = {
    id:
      terreincontrole.id,

    auditeur:
      terreincontrole
        .auditeur ?? "",

    status:
      terreincontrole.status,

    factuurVerzonden:
      terreincontrole
        .factuurVerzonden ??
      false,

    inspectielocatie:
      terreincontrole
        .inspectielocatie ?? "",

    bouwjaar:
      terreincontrole.bouwjaar
        ?.toString() ?? "",

    vloeroppervlakteM2:
      terreincontrole
        .vloeroppervlakteM2
        ?.toString() ?? "",

    datumPlaatsbezoek:
      datumVoorInput(
        terreincontrole
          .datumPlaatsbezoek,
      ),

    uurPlaatsbezoek:
      formatteerDatabaseTijd(
        terreincontrole
          .uurPlaatsbezoek,
      ) ?? "",

    ovamId:
      terreincontrole.ovamId ??
      "",

    naamAdi:
      terreincontrole.naamAdi ??
      "",

    attestUrl:
      terreincontrole
        .attestUrl ?? "",

    bedrijfsnaam:
      terreincontrole
        .bedrijfsnaam ?? "",

    postcode:
      terreincontrole.postcode ??
      "",

    gemeente:
      terreincontrole.gemeente ??
      "",

    straat:
      terreincontrole.straat ??
      "",

    huisnummer:
      terreincontrole
        .huisnummer ?? "",

    extraAdresDetails:
      terreincontrole
        .extraAdresDetails ?? "",

    perceelGemeenteCode:
      terreincontrole
        .perceelGemeenteCode ??
      "",

    perceelAfdelingscode:
      terreincontrole
        .perceelAfdelingscode ??
      "",

    perceelSectieCode:
      terreincontrole
        .perceelSectieCode ??
      "",

    attestId:
      terreincontrole.attestId ??
      "",

    opmerkingen:
      terreincontrole
        .opmerkingen ?? "",
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href={`/terreincontroles-inplannen/${id}`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            ← Terug naar terreincontrole
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Terreincontrole bewerken
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Wijzig de gegevens van
            terreincontrole #{id}.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <TerreincontroleBewerkFormulier
            terreincontrole={
              formulierGegevens
            }
          />
        </div>
      </div>
    </main>
  );
}


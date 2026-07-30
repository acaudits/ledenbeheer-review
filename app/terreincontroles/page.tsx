import NextLink from "next/link";
import type { ComponentProps } from "react";

import {
  TerreincontrolesTabel,
  type TerreincontroleRij,
} from "@/components/TerreincontrolesTabel";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export default async function TerreincontrolesPage() {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  const magExporteren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_EXPORTEREN",
    );

  function Link(
    props: ComponentProps<typeof NextLink>,
  ) {
    const href =
      typeof props.href === "string"
        ? props.href
        : "";

    if (
      !magBeheren &&
      (
        href === "/terreincontroles/nieuw" ||
        href === "/terreincontroles/verwijderd"
      )
    ) {
      return null;
    }

    return <NextLink {...props} />;
  }


  const terreincontroles =
    await prisma.terreincontrole.findMany({
      where: {
        verwijderdOp: null,
      },

      orderBy: [
        {
          datumPlaatsbezoek:
            "desc",
        },
        {
          id: "desc",
        },
      ],

      select: {
        id: true,
        auditeur: true,
        factuurVerzonden: true,
        status: true,

        inspectielocatie: true,
        bouwjaar: true,
        vloeroppervlakteM2:
          true,

        datumPlaatsbezoek:
          true,
        uurPlaatsbezoek: true,

        ovamId: true,
        naamAdi: true,
        attestUrl: true,
        bedrijfsnaam: true,

        postcode: true,
        gemeente: true,
        straat: true,
        huisnummer: true,
        extraAdresDetails:
          true,

        perceelGemeenteCode:
          true,
        perceelAfdelingscode:
          true,
        perceelSectieCode:
          true,

        attestId: true,
        opmerkingen: true,
      },
    });

  const rijen:
    TerreincontroleRij[] =
    terreincontroles.map(
      (terreincontrole) => ({
        id:
          terreincontrole.id,

        auditeur:
          terreincontrole.auditeur,

        factuurVerzonden:
          terreincontrole
            .factuurVerzonden,

        status:
          terreincontrole.status,

        inspectielocatie:
          terreincontrole
            .inspectielocatie,

        bouwjaar:
          terreincontrole.bouwjaar,

        vloeroppervlakteM2:
          terreincontrole
            .vloeroppervlakteM2
            ?.toString() ?? null,

        datumPlaatsbezoek:
          terreincontrole
            .datumPlaatsbezoek
            ?.toISOString() ??
          null,

        uurPlaatsbezoek:
          terreincontrole
            .uurPlaatsbezoek,

        ovamId:
          terreincontrole.ovamId,

        naamAdi:
          terreincontrole.naamAdi,

        attestUrl:
          terreincontrole.attestUrl,

        bedrijfsnaam:
          terreincontrole
            .bedrijfsnaam,

        postcode:
          terreincontrole.postcode,

        gemeente:
          terreincontrole.gemeente,

        straat:
          terreincontrole.straat,

        huisnummer:
          terreincontrole.huisnummer,

        extraAdresDetails:
          terreincontrole
            .extraAdresDetails,

        perceelGemeenteCode:
          terreincontrole
            .perceelGemeenteCode,

        perceelAfdelingscode:
          terreincontrole
            .perceelAfdelingscode,

        perceelSectieCode:
          terreincontrole
            .perceelSectieCode,

        attestId:
          terreincontrole.attestId,

        opmerkingen:
          terreincontrole.opmerkingen,
      }),
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Controlebeheer
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Terreincontroles
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {
              terreincontroles.length
            }{" "}
            actieve{" "}
            {terreincontroles.length ===
            1
              ? "terreincontrole"
              : "terreincontroles"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/terreincontroles/verwijderd"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Verwijderde terreincontroles
          </Link>

          {magExporteren ? (
<a
            href="/terreincontroles/export"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
          >
            Exporteren naar Excel
          </a>
          ) : null}

          <Link
            href="/terreincontroles/nieuw"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Nieuwe terreincontrole
          </Link>
        </div>

      </header>

      <TerreincontrolesTabel
        rijen={rijen}
        magBeheren={magBeheren}
      />
    </div>
  );
}

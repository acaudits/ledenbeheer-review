import NextLink from "next/link";
import type { ComponentProps } from "react";

import {
  TerreincontrolesTabel,
  type TerreincontroleRij,
} from "@/components/TerreincontrolesTabel";
import {
  IngeplandeTerreincontroleStatusExcelImport,
} from "@/components/IngeplandeTerreincontroleStatusExcelImport";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { prisma } from "@/lib/prisma";
import { formatteerDatabaseTijd } from "@/lib/terreincontrole";

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

  const magStatussenImporteren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_STATUS_IMPORTEREN",
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
        href === "/terreincontroles-inplannen/nieuw" ||
        href === "/terreincontroles-inplannen/verwijderd"
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

  const aantalInOpmaak =
    terreincontroles.filter(
      (controle) =>
        controle.status ===
        "IN_OPMAAK",
    ).length;

  const aantalGearchiveerd =
    terreincontroles.filter(
      (controle) =>
        controle.status ===
        "GEARCHIVEERD_ATTEST",
    ).length;

  const aantalActueelAttest =
    terreincontroles.filter(
      (controle) =>
        controle.status ===
        "ACTUEEL_ATTEST",
    ).length;

  const aantalNietVerzondenFacturen =
    terreincontroles.filter(
      (controle) =>
        controle.factuurVerzonden !==
        true,
    ).length;

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
            .factuurVerzonden ??
          false,

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
          formatteerDatabaseTijd(
            terreincontrole
              .uurPlaatsbezoek,
          ),

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
    <div className="space-y-4">
      <header className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Controlebeheer
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Inplannen terreincontrole
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/terreincontroles-inplannen/verwijderd"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Verwijderde terreincontroles
          </Link>

          {magExporteren ? (
<a
            href="/terreincontroles-inplannen/export"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
          >
            Exporteren naar Excel
          </a>
          ) : null}

          <Link
            href="/terreincontroles-inplannen/nieuw"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            Nieuwe terreincontrole
          </Link>
        </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal plaatsbezoeken
          </p>

          <p className="mt-2 text-3xl font-black">
            {terreincontroles.length}
          </p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal in opmaak
          </p>

          <p className="mt-2 text-3xl font-black">
            {aantalInOpmaak}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal gearchiveerd
          </p>

          <p className="mt-2 text-3xl font-black">
            {aantalGearchiveerd}
          </p>
        </article>

        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left text-sky-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal actueel attest
          </p>

          <p className="mt-2 text-3xl font-black">
            {aantalActueelAttest}
          </p>
        </article>

        <article className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-red-950 shadow-sm transition">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Aantal niet verzonden facturen
          </p>

          <p className="mt-2 text-3xl font-black">
            {aantalNietVerzondenFacturen}
          </p>
        </article>
      </section>

      {magStatussenImporteren ? (
        <IngeplandeTerreincontroleStatusExcelImport />
      ) : null}

      <TerreincontrolesTabel
        rijen={rijen}
        magBeheren={magBeheren}
      />
    </div>
  );
}

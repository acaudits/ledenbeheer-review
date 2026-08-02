import Link from "next/link";

import { TerreincontroleStatusExcelImport } from "@/components/TerreincontroleStatusExcelImport";

import {
  TerreincontroleDossiersTabel,
  type TerreincontroleDossierRij,
} from "@/components/TerreincontroleDossiersTabel";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function datum(datum: Date) {
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

function statusLabel(
  status: string,
) {
  if (status === "IN_OPMAAK") {
    return "In opmaak";
  }

  if (
    status === "GEACTUALISEERD"
  ) {
    return "Geactualiseerd";
  }

  if (status === "AFGEROND") {
    return "Afgerond";
  }

  return "Geen";
}

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

  const dossiers =
    await prisma.terreincontroleDossier.findMany({
      where: {
        verwijderdOp: null,
      },
      orderBy: [
        {
          datumControle: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  const rijen:
    TerreincontroleDossierRij[] =
    dossiers.map((dossier) => ({
      id: dossier.id,
      auditeur: dossier.auditeur,
      naamAdi: dossier.naamAdi,
      linkAttest:
        dossier.linkAttest,
      attestnummer:
        dossier.attestnummer,
      status: statusLabel(
        dossier.status,
      ),
      certificatiePlatform:
        dossier.certificatiePlatform ??
        "",
      opmerkingen:
        dossier.opmerkingen ?? "",
      datumControle: datum(
        dossier.datumControle,
      ),
      adres: dossier.adres ?? "",
      persoonsId:
        dossier.persoonsId,
      bedrijfsnaam:
        dossier.bedrijfsnaam,
      ondernemingsnummer:
        formatteerOndernemingsnummer(
          dossier.ondernemingsnummer,
        ),
      persoonscertificaat:
        dossier
          .persoonscertificaatNummer,
      procescertificaat:
        dossier
          .procescertificaatNummer,
      attestId: dossier.attestId,
    }));

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Controlebeheer
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Terreincontroles
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {dossiers.length} actieve{" "}
            {dossiers.length === 1
              ? "terreincontrole"
              : "terreincontroles"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {magBeheren ? (
            <Link
              href="/terreincontroles/nieuw"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Nieuwe terreincontrole
            </Link>
          ) : null}

          {magExporteren ? (
            <>
              <a
                href="/terreincontroles/export"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
              >
                Exporteren naar Excel
              </a>

              <a
                href="/terreincontroles/export-openstaand"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-900 hover:bg-amber-100"
              >
                Excel Geen / In opmaak
              </a>
            </>
          ) : null}

          {magBeheren ? (
            <Link
              href="/terreincontroles/verwijderd"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700"
            >
              Verwijderde
            </Link>
          ) : null}
        </div>
      </header>

      {magStatussenImporteren ? (
        <TerreincontroleStatusExcelImport />
      ) : null}

      <TerreincontroleDossiersTabel
        rijen={rijen}
      />
    </div>
  );
}

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
import {
  formatteerDatabaseTijd,
  maakGoogleMapsUrl,
} from "@/lib/terreincontrole";

export const dynamic =
  "force-dynamic";

const kolommen:
  BeheerTabelKolom[] = [
    {
      sleutel: "googleMaps",
      label: "Google Maps",
      type: "url",
    },
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel: "status",
      label: "Status",
      type: "badge",
    },
    {
      sleutel: "factuurVerzonden",
      label: "Factuur verzonden",
    },
    {
      sleutel: "inspectielocatie",
      label: "Inspectielocatie",
    },
    {
      sleutel: "datumPlaatsbezoek",
      label: "Datum plaatsbezoek",
      type: "datum",
    },
    {
      sleutel: "uurPlaatsbezoek",
      label: "Uur",
    },
    {
      sleutel: "attestId",
      label: "Attest-ID",
    },
    {
      sleutel: "verwijderdOp",
      label: "Verwijderd op",
      type: "datum",
    },
  ];

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
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
  ).format(datum);
}

function formatteerDatumTijd(
  datum: Date | null,
) {
  if (!datum) {
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
  ).format(datum);
}

export default async function VerwijderdeTerreincontrolesPage() {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const terreincontroles =
    await prisma.terreincontrole.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      orderBy: [
        {
          verwijderdOp: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        auditeur: true,
        status: true,
        factuurVerzonden: true,
        inspectielocatie: true,
        adres: true,
        datumPlaatsbezoek: true,
        uurPlaatsbezoek: true,
        attestId: true,
        verwijderdOp: true,
      },
    });

  const rijen:
    VerwijderdeBeheerTabelRij[] =
    terreincontroles.map(
      (terreincontrole) => ({
        id: terreincontrole.id,
        googleMaps:
          maakGoogleMapsUrl(
            terreincontrole
              .inspectielocatie ??
              terreincontrole.adres,
          ) ?? "",
        auditeur:
          terreincontrole.auditeur ??
          "—",
        status:
          terreincontrole.status ??
          "NULL",
        factuurVerzonden:
          terreincontrole
            .factuurVerzonden
            ? "Ja"
            : "Nee",
        inspectielocatie:
          terreincontrole
            .inspectielocatie ??
          terreincontrole.adres ??
          "—",
        datumPlaatsbezoek:
          formatteerDatum(
            terreincontrole
              .datumPlaatsbezoek,
          ),
        uurPlaatsbezoek:
          formatteerDatabaseTijd(
            terreincontrole
              .uurPlaatsbezoek,
          ) ?? "—",
        attestId:
          terreincontrole.attestId ??
          "—",
        verwijderdOp:
          formatteerDatumTijd(
            terreincontrole
              .verwijderdOp,
          ),
      }),
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Verwijderde terreincontroles"
        omschrijving={`${terreincontroles.length} verwijderde terreincontroles`}
        acties={
          <BeheerActieLink
            href="/terreincontroles-inplannen"
            variant="neutraal"
            kinderen="← Terug naar planning"
          />
        }
      />

      <VerwijderdeBeheerTabel
        rijen={rijen}
        kolommen={kolommen}
        herstelType="terreincontrole-planning"
        zoekPlaceholder="Zoeken in verwijderde planning..."
        legeTitel="Geen verwijderde terreincontroles"
        legeBeschrijving="Er zijn momenteel geen verwijderde terreincontroles in de planning."
        resultaatEnkelvoud="verwijderde terreincontrole"
        resultaatMeervoud="verwijderde terreincontroles"
      />
    </div>
  );
}

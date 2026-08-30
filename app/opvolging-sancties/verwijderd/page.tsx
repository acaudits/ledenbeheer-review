import {
  redirect,
} from "next/navigation";

import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  VerwijderdeBeheerTabel,
  type VerwijderdeBeheerTabelRij,
} from "@/components/VerwijderdeBeheerTabel";
import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";
import type {
  BeheerTabelKolom,
} from "@/lib/beheer-tabel";
import {
  ncCategorieLabel,
  opvolgingBronLabel,
} from "@/lib/opvolging-sancties";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const kolommen:
  BeheerTabelKolom[] = [
    {
      sleutel: "bron",
      label: "Bron",
    },
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel: "naamAdi",
      label: "Naam ADI",
    },
    {
      sleutel: "reden",
      label: "Reden",
    },
    {
      sleutel: "ncCategorie",
      label: "NC-categorie",
      type: "badge",
    },
    {
      sleutel: "datumVaststelling",
      label: "Datum vaststelling",
      type: "datum",
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
      hour:
        datum.getUTCHours() === 0 &&
        datum.getUTCMinutes() === 0
          ? undefined
          : "2-digit",
      minute:
        datum.getUTCHours() === 0 &&
        datum.getUTCMinutes() === 0
          ? undefined
          : "2-digit",
      timeZone: "UTC",
    },
  ).format(datum);
}

function gebruikerNaam(
  gebruiker: {
    email: string;
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
  } | null,
) {
  if (!gebruiker) {
    return "—";
  }

  return (
    [
      gebruiker.voornaam,
      gebruiker.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

export default async function VerwijderdeOpvolgingSanctiesPage() {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  const magDeskcontrolesBekijken =
    heeftMachtiging(
      gebruiker.rollen,
      "DESKCONTROLES_BEKIJKEN",
    );

  const magTerreincontrolesBekijken =
    heeftMachtiging(
      gebruiker.rollen,
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magDeskcontrolesBeheren =
    heeftMachtiging(
      gebruiker.rollen,
      "DESKCONTROLES_BEHEREN",
    );

  const magTerreincontrolesBeheren =
    heeftMachtiging(
      gebruiker.rollen,
      "TERREINCONTROLES_BEHEREN",
    );

  if (
    !magDeskcontrolesBekijken &&
    !magTerreincontrolesBekijken
  ) {
    redirect("/");
  }

  const registraties =
    await prisma.opvolgingSanctie.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      include: {
        auditeurGebruiker: {
          select: {
            email: true,
            naam: true,
            voornaam: true,
            achternaam: true,
          },
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
    });

  const rijen:
    VerwijderdeBeheerTabelRij[] =
    registraties.map(
      (registratie) => ({
        id: registratie.id,
        bron:
          opvolgingBronLabel(
            registratie.bronType,
          ),
        auditeur:
          gebruikerNaam(
            registratie.auditeurGebruiker,
          ) !== "—"
            ? gebruikerNaam(
                registratie.auditeurGebruiker,
              )
            : registratie.auditeur ??
              "—",
        naamAdi:
          registratie.naamAdi ??
          "—",
        reden:
          registratie.reden,
        ncCategorie:
          ncCategorieLabel(
            registratie.ncCategorie,
          ),
        datumVaststelling:
          formatteerDatum(
            registratie.datumVaststelling,
          ),
        verwijderdOp:
          formatteerDatum(
            registratie.verwijderdOp,
          ),
        magHerstellen:
          registratie.bronType ===
          "DESKCONTROLE"
            ? magDeskcontrolesBeheren
            : magTerreincontrolesBeheren,
      }),
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Verwijderde opvolgingen/sancties"
        omschrijving={`${registraties.length} verwijderde registraties`}
        acties={
          <BeheerActieLink
            href="/opvolging-sancties"
            variant="neutraal"
            kinderen="← Terug naar actieve registraties"
          />
        }
      />

      <VerwijderdeBeheerTabel
        rijen={rijen}
        kolommen={kolommen}
        herstelType="opvolging"
        zoekPlaceholder="Zoeken in verwijderde opvolgingen..."
        legeTitel="Geen verwijderde opvolgingen"
        legeBeschrijving="Er zijn momenteel geen verwijderde registraties."
        resultaatEnkelvoud="verwijderde registratie"
        resultaatMeervoud="verwijderde registraties"
      />
    </div>
  );
}

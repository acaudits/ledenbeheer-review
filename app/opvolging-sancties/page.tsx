import { redirect } from "next/navigation";

import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  OpvolgingSanctiesTabel,
} from "@/components/OpvolgingSanctiesTabel";

import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";
import {
  ncCategorieLabel,
  opvolgingBronLabel,
} from "@/lib/opvolging-sancties";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

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

  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    volledigeNaam ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

export default async function OpvolgingSanctiesPage() {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  const magDeskcontrolesBekijken =
    heeftMachtiging(
      gebruiker.rol,
      "DESKCONTROLES_BEKIJKEN",
    );

  const magTerreincontrolesBekijken =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magDeskcontrolesBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "DESKCONTROLES_BEHEREN",
    );

  const magTerreincontrolesBeheren =
    heeftMachtiging(
      gebruiker.rol,
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
        verwijderdOp: null,
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
        afgerondDoorGebruiker: {
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
          datumVaststelling:
            "desc",
        },
        {
          id: "desc",
        },
      ],
    });


  const auditeurs =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rol: "AUDITEUR",
      },
      select: {
        id: true,
        email: true,
        naam: true,
        voornaam: true,
        achternaam: true,
      },
      orderBy: [
        {
          voornaam: "asc",
        },
        {
          achternaam: "asc",
        },
        {
          email: "asc",
        },
      ],
    });

  return (
    <div className="space-y-5">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Opvolging/sancties"
        omschrijving={
          <div className="space-y-1">
            <p>
              Centrale opvolging van vaststellingen, non-conformiteiten en sanctieperiodes.
            </p>

            <p className="font-semibold text-slate-700">
              {registraties.length}{" "}
              {registraties.length === 1
                ? "registratie"
                : "registraties"}
            </p>
          </div>
        }
        acties={
          magDeskcontrolesBeheren ||
          magTerreincontrolesBeheren ? (
            <BeheerActieLink
              href="/opvolging-sancties/verwijderd"
              variant="neutraal"
              kinderen="Verwijderde registraties"
            />
          ) : undefined
        }
      />

      <OpvolgingSanctiesTabel
        auditeurs={auditeurs}
        rijen={registraties.map(
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
            opvolgingAfgerondTekst:
              registratie.opvolgingAfgerond
                ? "Ja"
                : "Nee",
            opvolgingAfgerond:
              registratie.opvolgingAfgerond,
            datumAfgerond:
              formatteerDatum(
                registratie.datumAfgerond,
              ),
            datumAfgerondInvoer:
              registratie.datumAfgerond
                ?.toISOString()
                .slice(0, 10) ??
              "",
            afgerondDoor:
              gebruikerNaam(
                registratie.afgerondDoorGebruiker,
              ),
            afgerondDoorGebruikerId:
              registratie.afgerondDoorGebruikerId,
            auditeurGebruikerId:
              registratie.auditeurGebruikerId,
            linkAttest:
              registratie.linkAttest ??
              "",
            attestnummer:
              registratie.attestnummer ??
              "—",
            reden:
              registratie.reden,
            bedrijfsnaam:
              registratie.bedrijfsnaam ??
              "—",
            ovamId:
              registratie.ovamId ??
              "—",
            datumVaststelling:
              formatteerDatum(
                registratie.datumVaststelling,
              ),
            opmerkingen:
              registratie.opmerkingen ??
              "—",
            ncCategorie:
              ncCategorieLabel(
                registratie.ncCategorie,
              ),
            sanctieBegindatum:
              formatteerDatum(
                registratie.sanctieBegindatum,
              ),
            sanctieEinddatum:
              formatteerDatum(
                registratie.sanctieEinddatum,
              ),
            sanctieDoorgezet:
              registratie.sanctieDoorgezet ===
              true
                ? "Ja"
                : registratie.sanctieDoorgezet ===
                    false
                  ? "Nee"
                  : "—",
            redenNietDoorzetten:
              registratie.redenNietDoorzetten ??
              "—",
            magBeheren:
              registratie.bronType ===
              "DESKCONTROLE"
                ? magDeskcontrolesBeheren
                : magTerreincontrolesBeheren,
          }),
        )}
      />
    </div>
  );
}

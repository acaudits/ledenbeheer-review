import { DeskcontroleDashboard } from "@/components/DeskcontroleDashboard";
import { DeskcontroleOverzichtHeader } from "@/components/DeskcontroleOverzichtHeader";
import {
  DeskcontrolesTabel,
  type DeskcontroleKolom,
} from "@/components/DeskcontrolesTabel";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic";

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "";
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

const kolommen: DeskcontroleKolom[] = [
  {
    sleutel: "auditeur",
    label: "Auditeur",
  },
  {
    sleutel: "naamAdi",
    label: "Naam ADI",
  },
  {
    sleutel: "afgerond",
    label: "Afgerond",
    type: "boolean",
  },
  {
    sleutel: "linkAttest",
    label: "Link Attest",
    type: "url",
  },

  {
    sleutel: "attestnummer",
    label: "Attestnummer",
  },
  {
    sleutel: "status",
    label: "Status",
    type: "badge",
  },
  {
    sleutel: "deadlineSanctie",
    label: "Deadline Sanctie",
    type: "datum",
  },
  {
    sleutel: "mailSanctieVerzonden",
    label: "Mail Sanctie",
    type: "boolean",
  },
  {
    sleutel: "typeControle",
    label: "Type Controle",
    type: "badge",
  },
  {
    sleutel: "deadlineCorrectie",
    label: "Deadline Correctie",
    type: "datum",
  },
  {
    sleutel: "mailCorrectieVerzonden",
    label: "Mail Correctie",
    type: "boolean",
  },
  {
    sleutel: "oneDrive",
    label: "OneDrive",
    type: "url",
  },
  {
    sleutel: "voorwaardelijkeOpheffing",
    label: "Voorwaardelijke Opheffing",
    type: "boolean",
  },
  {
    sleutel: "certificatiePlatform",
    label: "Certificatieplatform",
    type: "url",
  },
  {
    sleutel: "opmerkingen",
    label: "Opmerkingen",
    type: "opmerking",
  },
  {
    sleutel: "datumControle",
    label: "Datum controle",
    type: "datum",
  },
  {
    sleutel: "adres",
    label: "Adres",
  },
  {
    sleutel: "persoonsId",
    label: "PersoonsID",
  },
  {
    sleutel: "bedrijfsnaam",
    label: "Bedrijfsnaam",
  },
  {
    sleutel: "ondernemingsnummer",
    label:
      "Ondernemingsnummer / EU-btw-nummer",
  },
  {
    sleutel: "persoonscertificaat",
    label: "Persoonscertificaat",
  },
  {
    sleutel: "procescertificaat",
    label: "Procescertificaat",
  },
  {
    sleutel: "finalisatieDatum",
    label: "Finalisatie Datum",
    type: "datum",
  },
  {
    sleutel: "attestId",
    label: "ID",
  },
];

export default async function DeskcontrolesPage() {
  const gebruiker = await vereisMachtiging("DESKCONTROLES_BEKIJKEN");

  const magBeheren = heeftMachtiging(
    gebruiker.rol,
    "DESKCONTROLES_BEHEREN",
  );

  const magExporteren = heeftMachtiging(
    gebruiker.rol,
    "DESKCONTROLES_EXCEL_EXPORTEREN",
  );

  const magStatussenImporteren = heeftMachtiging(
    gebruiker.rol,
    "DESKCONTROLES_STATUS_IMPORTEREN",
  );

  const deskcontroles =
    await prisma.deskcontrole.findMany({
      where: {
        verwijderdOp: null,
      },
      include: {
        lid: {
          select: {
            naamPersoon: true,
            ovamId: true,
            certificaatnummer: true,
            certificatiePlatform: true,
          },
        },
        procescertificaat: {
          select: {
            naamBedrijf: true,
            kboNummer: true,
            certificaatnummer: true,
          },
        },
      },
      orderBy: {
        datumControle: "desc",
      },
    });

    const rijen = deskcontroles.map(
      (deskcontrole) => ({
        id: deskcontrole.id,
  
        auditeur:
          deskcontrole.auditeur,
  
        naamAdi:
          deskcontrole.lid
            ?.naamPersoon ??
          "Niet gekoppeld",
  
        linkAttest:
          deskcontrole.linkAttest,
  
        attestnummer:
          deskcontrole.attestnummer,
  
        status:
          deskcontrole.status ===
          "AFGEROND"
            ? "Afgerond"
            : deskcontrole.status ===
                "IN_OPMAAK"
              ? "In opmaak"
              : deskcontrole.status ===
                  "GEACTUALISEERD"
                ? "Geactualiseerd"
                : "Geen",
  
        afgerond:
          deskcontrole.status ===
          "AFGEROND"
            ? "Ja"
            : "Nee",
  
  
        deadlineSanctie:
          formatteerDatum(
            deskcontrole.deadlineSanctie,
          ),
  
        mailSanctieVerzonden:
          deskcontrole
            .mailSanctieVerzonden
            ? "Ja"
            : "Nee",
  
        typeControle:
          deskcontrole.typeControle ===
          "NIEUWE_CONTROLE"
            ? "Nieuwe controle"
            : "Opvolging",
  
        deadlineCorrectie:
          formatteerDatum(
            deskcontrole.deadlineCorrectie,
          ),
  
        mailCorrectieVerzonden:
          deskcontrole
            .mailCorrectieVerzonden
            ? "Ja"
            : "Nee",
  
        oneDrive:
          deskcontrole.oneDrive,
  
        voorwaardelijkeOpheffing:
          deskcontrole
            .voorwaardelijkeOpheffing
            ? "Ja"
            : "Nee",
  
        certificatiePlatform:
          deskcontrole.lid
            ?.certificatiePlatform ??
          "",
  
        opmerkingen:
          deskcontrole.opmerkingen,
  
        datumControle:
          formatteerDatum(
            deskcontrole.datumControle,
          ),
  
        adres:
          deskcontrole.adres,
  
        persoonsId:
          deskcontrole.lid
            ?.ovamId ??
          "Niet gekoppeld",
  
        bedrijfsnaam:
          deskcontrole
            .procescertificaat
            ?.naamBedrijf ??
          "Niet gekoppeld",
  
        ondernemingsnummer:
          deskcontrole
            .procescertificaat
            ?.kboNummer
            ? formatteerOndernemingsnummer(
                deskcontrole
                  .procescertificaat
                  .kboNummer,
              )
            : "Niet gekoppeld",
  
        persoonscertificaat:
          deskcontrole.lid
            ?.certificaatnummer ??
          "Niet gekoppeld",
  
        procescertificaat:
          deskcontrole
            .procescertificaat
            ?.certificaatnummer ??
          "Niet gekoppeld",
  
        finalisatieDatum:
          formatteerDatum(
            deskcontrole.finalisatieDatum,
          ),
  
        attestId:
          deskcontrole.attestId,
      }),
    );
  

    return (
      <div className="space-y-4">
        <DeskcontroleOverzichtHeader
          aantal={
            deskcontroles.length
          }
          magBeheren={magBeheren}
          magExporteren={magExporteren}
          magStatussenImporteren={
            magStatussenImporteren
          }
        />
  
        <DeskcontroleDashboard
          rijen={rijen}
        />
  
        <DeskcontrolesTabel
          rijen={rijen}
          kolommen={kolommen}
          modus="actief"
          magBeheren={magBeheren}
        />
      </div>
    );
  }
  

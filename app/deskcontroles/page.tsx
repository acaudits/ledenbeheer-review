import { DeskcontroleDashboard } from "@/components/DeskcontroleDashboard";
import { DeskcontroleOverzichtHeader } from "@/components/DeskcontroleOverzichtHeader";
import {
  DeskcontrolesTabel,
  type DeskcontroleKolom,
} from "@/components/DeskcontrolesTabel";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";

export const dynamic = "force-dynamic";

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
    label: "Ondernemingsnummer / EU-btw-nummer",
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

  const magBeheren = heeftMachtiging(gebruiker.rollen, "DESKCONTROLES_BEHEREN");

  const magExporteren = heeftMachtiging(
    gebruiker.rollen,
    "DESKCONTROLES_EXCEL_EXPORTEREN",
  );

  const magStatussenImporteren = heeftMachtiging(
    gebruiker.rollen,
    "DESKCONTROLES_STATUS_IMPORTEREN",
  );

  return (
    <div className="space-y-4">
      <DeskcontroleOverzichtHeader
        aantal={null}
        magBeheren={magBeheren}
        magExporteren={magExporteren}
        magStatussenImporteren={magStatussenImporteren}
        serverModus
      />

      <DeskcontroleDashboard rijen={[]} serverModus />

      <DeskcontrolesTabel
        rijen={[]}
        kolommen={kolommen}
        modus="actief"
        magBeheren={magBeheren}
        serverModus
        kaartWeergave
      />
    </div>
  );
}

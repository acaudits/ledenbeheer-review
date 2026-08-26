"use client";

import {
  TerreincontroleFilterTabel,
  type FilterTabelKolom,
} from "@/components/TerreincontroleFilterTabel";

export type TerreincontroleDossierRij = {
  id: number;
  auditeur: string;
  naamAdi: string;
  linkAttest: string;
  attestnummer: string;
  certificatiePlatform: string;
  opmerkingen: string;
  datumControle: string;
  adres: string;
  persoonsId: string;
  bedrijfsnaam: string;
  ondernemingsnummer: string;
  persoonscertificaat: string;
  procescertificaat: string;
  attestId: string;
  [sleutel: string]: unknown;
};

type Props = {
  rijen:
    TerreincontroleDossierRij[];
  magBeheren: boolean;
  serverModus?: boolean;
};

const kolommen:
  FilterTabelKolom[] = [
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel: "naamAdi",
      label: "Naam ADI",
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
      sleutel:
        "certificatiePlatform",
      label:
        "Certificatieplatform",
      type: "url",
    },
    {
      sleutel: "opmerkingen",
      label: "Opmerkingen",
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
      sleutel:
        "ondernemingsnummer",
      label:
        "Ondernemingsnummer",
    },
    {
      sleutel:
        "persoonscertificaat",
      label:
        "Persoonscertificaat",
    },
    {
      sleutel:
        "procescertificaat",
      label:
        "Procescertificaat",
    },
    {
      sleutel: "attestId",
      label: "ID",
    },
    {
      sleutel: "acties",
      label: "Acties",
      type: "acties",
    },
  ];

export function TerreincontroleDossiersTabel({
  rijen,
  magBeheren,
  serverModus = false,
}: Props) {
  return (
    <TerreincontroleFilterTabel
      rijen={rijen}
      kolommen={kolommen}
      modus="terreincontrole"
      magBeheren={magBeheren}
      serverModus={serverModus}
      kaartWeergave
    />
  );
}

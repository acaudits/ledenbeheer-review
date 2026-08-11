"use client";

import {
  TerreincontroleFilterTabel,
  type FilterTabelKolom,
} from "@/components/TerreincontroleFilterTabel";

type TerreincontroleStatus =
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null;

export type TerreincontroleRij = {
  id: number;
  auditeur: string | null;
  factuurVerzonden: boolean;
  status:
    TerreincontroleStatus;
  inspectielocatie:
    string | null;
  bouwjaar: number | null;
  vloeroppervlakteM2:
    string | null;
  datumPlaatsbezoek:
    string | null;
  uurPlaatsbezoek:
    string | null;
  ovamId: string | null;
  naamAdi: string | null;
  attestUrl: string | null;
  bedrijfsnaam: string | null;
  postcode: string | null;
  gemeente: string | null;
  straat: string | null;
  huisnummer: string | null;
  extraAdresDetails:
    string | null;
  perceelGemeenteCode:
    string | null;
  perceelAfdelingscode:
    string | null;
  perceelSectieCode:
    string | null;
  attestId: string;
  opmerkingen: string | null;
  [sleutel: string]: unknown;
};

type Props = {
  rijen:
    TerreincontroleRij[];
  magBeheren: boolean;
  serverModus?: boolean;
};

const kolommen:
  FilterTabelKolom[] = [
    {
      sleutel: "googleMaps",
      label: "Google Maps",
      type: "maps",
    },
    {
      sleutel: "status",
      label: "Status",
      type: "status",
    },
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel:
        "factuurVerzonden",
      label:
        "Factuur verzonden",
      type: "factuur",
    },
    {
      sleutel:
        "inspectielocatie",
      label:
        "Inspectielocatie",
    },
    {
      sleutel: "bouwjaar",
      label: "Bouwjaar",
    },
    {
      sleutel:
        "vloeroppervlakteM2",
      label:
        "Vloeroppervlakte m²",
    },
    {
      sleutel:
        "datumPlaatsbezoek",
      label:
        "Datum plaatsbezoek",
      type: "datum",
    },
    {
      sleutel:
        "uurPlaatsbezoek",
      label:
        "Uur plaatsbezoek",
    },
    {
      sleutel: "ovamId",
      label: "Persoons-ID",
    },
    {
      sleutel: "naamAdi",
      label: "Naam ADI",
    },
    {
      sleutel: "attestUrl",
      label: "Attest",
      type: "url",
    },
    {
      sleutel: "bedrijfsnaam",
      label: "Bedrijfsnaam",
    },
    {
      sleutel: "postcode",
      label: "Postcode",
    },
    {
      sleutel: "gemeente",
      label: "Gemeente",
    },
    {
      sleutel: "straat",
      label: "Straat",
    },
    {
      sleutel: "huisnummer",
      label: "Huisnummer",
    },
    {
      sleutel:
        "extraAdresDetails",
      label:
        "Extra adresdetails",
    },
    {
      sleutel:
        "perceelGemeenteCode",
      label:
        "Perceel gemeente",
    },
    {
      sleutel:
        "perceelAfdelingscode",
      label:
        "Perceel afdeling",
    },
    {
      sleutel:
        "perceelSectieCode",
      label:
        "Perceel sectie",
    },
    {
      sleutel: "attestId",
      label: "ID",
    },
    {
      sleutel: "opmerkingen",
      label: "Opmerkingen",
    },
    {
      sleutel: "acties",
      label: "Acties",
      type: "acties",
    },
  ];

export function TerreincontrolesTabel({
  rijen,
  magBeheren,
  serverModus = false,
}: Props) {
  return (
    <TerreincontroleFilterTabel
      rijen={rijen}
      kolommen={kolommen}
      modus="planning"
      magBeheren={magBeheren}
      serverModus={serverModus}
    />
  );
}

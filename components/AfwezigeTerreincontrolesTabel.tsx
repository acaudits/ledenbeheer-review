"use client";

import {
  TerreincontroleFilterTabel,
  type FilterTabelKolom,
} from "@/components/TerreincontroleFilterTabel";

type Props = {
  magBeheren: boolean;
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
      sleutel:
        "afwezigReden",
      label:
        "Reden afwezigheid",
    },
    {
      sleutel: "acties",
      label: "Acties",
      type: "acties",
    },
  ];

export function AfwezigeTerreincontrolesTabel({
  magBeheren,
}: Props) {
  return (
    <TerreincontroleFilterTabel
      rijen={[]}
      kolommen={kolommen}
      modus="afwezig"
      magBeheren={magBeheren}
      serverModus
    />
  );
}

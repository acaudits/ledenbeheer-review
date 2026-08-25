import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE =
  100;

export const INGEPLANDE_TERREINCONTROLE_SORTERINGEN = [
  "afgerond",
  "status",
  "auditeur",
  "factuurVerzonden",
  "inspectielocatie",
  "bouwjaar",
  "vloeroppervlakteM2",
  "datumPlaatsbezoek",
  "uurPlaatsbezoek",
  "ovamId",
  "naamAdi",
  "attestUrl",
  "bedrijfsnaam",
  "postcode",
  "gemeente",
  "straat",
  "huisnummer",
  "extraAdresDetails",
  "perceelGemeenteCode",
  "perceelAfdelingscode",
  "perceelSectieCode",
  "attestId",
  "opmerkingen",
] as const;

export type IngeplandeTerreincontroleSortering =
  (typeof INGEPLANDE_TERREINCONTROLE_SORTERINGEN)[number];

export const INGEPLANDE_TERREINCONTROLE_TEKSTFILTERPARAMETERS = {
  afgerond: "filterAfgerond",
  status: "filterStatus",
  auditeur: "filterAuditeur",
  factuurVerzonden:
    "filterFactuurVerzonden",
  inspectielocatie:
    "filterInspectielocatie",
  bouwjaar: "filterBouwjaar",
  vloeroppervlakteM2:
    "filterVloeroppervlakteM2",
  uurPlaatsbezoek:
    "filterUurPlaatsbezoek",
  ovamId: "filterOvamId",
  naamAdi: "filterNaamAdi",
  attestUrl: "filterAttestUrl",
  bedrijfsnaam:
    "filterBedrijfsnaam",
  postcode: "filterPostcode",
  gemeente: "filterGemeente",
  straat: "filterStraat",
  huisnummer: "filterHuisnummer",
  extraAdresDetails:
    "filterExtraAdresDetails",
  perceelGemeenteCode:
    "filterPerceelGemeenteCode",
  perceelAfdelingscode:
    "filterPerceelAfdelingscode",
  perceelSectieCode:
    "filterPerceelSectieCode",
  attestId: "filterAttestId",
  opmerkingen: "filterOpmerkingen",
} as const;

export type IngeplandeTerreincontroleTekstfilters = {
  [Sleutel in keyof typeof INGEPLANDE_TERREINCONTROLE_TEKSTFILTERPARAMETERS]:
    string;
};

export type IngeplandeTerreincontroleLijstcontract = {
  tekstfilters:
    IngeplandeTerreincontroleTekstfilters;
  datumPlaatsbezoekJaar:
    number | null;
  datumPlaatsbezoekMaand:
    number | null;
};

type ContractMetSortering = {
  contract:
    IngeplandeTerreincontroleLijstcontract;
  sortering:
    IngeplandeTerreincontroleSortering;
  richting:
    Sorteerrichting;
};

function normaliseerFilter(
  waarde: string | null,
  label: string,
) {
  const genormaliseerd =
    (waarde ?? "")
      .replace(/\s+/g, " ")
      .trim();

  if (
    genormaliseerd.length >
    MAXIMALE_FILTERLENGTE
  ) {
    throw new OngeldigePagineringFout(
      `${label} mag maximaal ${MAXIMALE_FILTERLENGTE} tekens bevatten.`,
    );
  }

  return genormaliseerd;
}

function leesJaar(
  waarde: string | null,
) {
  if (
    waarde === null ||
    waarde === ""
  ) {
    return null;
  }

  if (!/^\d{4}$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      "Het filterjaar voor datum plaatsbezoek is ongeldig.",
    );
  }

  const jaar =
    Number(waarde);

  if (
    !Number.isInteger(jaar) ||
    jaar < 1900 ||
    jaar > 2100
  ) {
    throw new OngeldigePagineringFout(
      "Het filterjaar voor datum plaatsbezoek moet tussen 1900 en 2100 liggen.",
    );
  }

  return jaar;
}

function leesMaand(
  waarde: string | null,
) {
  if (
    waarde === null ||
    waarde === ""
  ) {
    return null;
  }

  if (
    !/^(0[1-9]|1[0-2])$/.test(
      waarde,
    )
  ) {
    throw new OngeldigePagineringFout(
      "De filtermaand voor datum plaatsbezoek is ongeldig.",
    );
  }

  return Number(waarde);
}

function isSortering(
  waarde: string,
): waarde is IngeplandeTerreincontroleSortering {
  return INGEPLANDE_TERREINCONTROLE_SORTERINGEN.some(
    (sortering) =>
      sortering === waarde,
  );
}

export function leesIngeplandeTerreincontroleLijstcontract(
  url: URL,
  richting: Sorteerrichting,
): ContractMetSortering {
  const sorteerparameter =
    url.searchParams.get(
      "sortering",
    );

  if (
    sorteerparameter !== null &&
    !isSortering(
      sorteerparameter,
    )
  ) {
    throw new OngeldigePagineringFout(
      "De gekozen sortering is ongeldig.",
    );
  }

  const richtingParameter =
    url.searchParams.get(
      "richting",
    );

  if (
    richtingParameter !== null &&
    richtingParameter !== "asc" &&
    richtingParameter !== "desc"
  ) {
    throw new OngeldigePagineringFout(
      "De gekozen sorteerrichting is ongeldig.",
    );
  }

  const tekstfilters =
    Object.fromEntries(
      Object.entries(
        INGEPLANDE_TERREINCONTROLE_TEKSTFILTERPARAMETERS,
      ).map(
        ([
          sleutel,
          parameter,
        ]) => [
          sleutel,
          normaliseerFilter(
            url.searchParams.get(
              parameter,
            ),
            `Filter ${sleutel}`,
          ),
        ],
      ),
    ) as IngeplandeTerreincontroleTekstfilters;

  return {
    sortering:
      sorteerparameter ??
      "datumPlaatsbezoek",
    richting,
    contract: {
      tekstfilters,
      datumPlaatsbezoekJaar:
        leesJaar(
          url.searchParams.get(
            "jaarDatumPlaatsbezoek",
          ),
        ),
      datumPlaatsbezoekMaand:
        leesMaand(
          url.searchParams.get(
            "maandDatumPlaatsbezoek",
          ),
        ),
    },
  };
}

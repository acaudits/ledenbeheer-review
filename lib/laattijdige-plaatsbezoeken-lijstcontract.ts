import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE =
  100;

export const LAATTIJDIGE_PLAATSBEZOEKEN_SORTERINGEN = [
  "referentie",
  "timer",
  "naamAdi",
  "bedrijfsnaam",
  "aantalAttesten",
  "laatsteTerreincontrole",
  "aantalTerreincontroles",
  "inspectielocatie",
  "datum",
  "tijdstip",
  "gemeenschappelijkeDelen",
  "extraAdresdetails",
  "reden",
  "aangemeldOp",
] as const;

export type LaattijdigePlaatsbezoekenSortering =
  (typeof LAATTIJDIGE_PLAATSBEZOEKEN_SORTERINGEN)[number];

export const LAATTIJDIGE_PLAATSBEZOEKEN_TEKSTFILTERPARAMETERS = {
  referentie:
    "filterReferentie",
  timer:
    "filterTimer",
  naamAdi:
    "filterNaamAdi",
  bedrijfsnaam:
    "filterBedrijfsnaam",
  aantalAttesten:
    "filterAantalAttesten",
  laatsteTerreincontrole:
    "filterLaatsteTerreincontrole",
  aantalTerreincontroles:
    "filterAantalTerreincontroles",
  inspectielocatie:
    "filterInspectielocatie",
  tijdstip:
    "filterTijdstip",
  gemeenschappelijkeDelen:
    "filterGemeenschappelijkeDelen",
  extraAdresdetails:
    "filterExtraAdresdetails",
  reden:
    "filterReden",
  aangemeldOp:
    "filterAangemeldOp",
} as const;

export type LaattijdigePlaatsbezoekenTekstfilters = {
  [Sleutel in keyof typeof LAATTIJDIGE_PLAATSBEZOEKEN_TEKSTFILTERPARAMETERS]:
    string;
};

export type LaattijdigePlaatsbezoekenLijstcontract = {
  tekstfilters:
    LaattijdigePlaatsbezoekenTekstfilters;
  datumPlaatsbezoekJaar:
    number | null;
  datumPlaatsbezoekMaand:
    number | null;
};

type ContractMetSortering = {
  contract:
    LaattijdigePlaatsbezoekenLijstcontract;
  sortering:
    LaattijdigePlaatsbezoekenSortering;
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
      "Het filterjaar voor de datum van het plaatsbezoek is ongeldig.",
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
      "Het filterjaar voor de datum van het plaatsbezoek moet tussen 1900 en 2100 liggen.",
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
      "De filtermaand voor de datum van het plaatsbezoek is ongeldig.",
    );
  }

  return Number(waarde);
}

function isSortering(
  waarde: string,
): waarde is LaattijdigePlaatsbezoekenSortering {
  return LAATTIJDIGE_PLAATSBEZOEKEN_SORTERINGEN.some(
    (sortering) =>
      sortering === waarde,
  );
}

export function leesLaattijdigePlaatsbezoekenLijstcontract(
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
        LAATTIJDIGE_PLAATSBEZOEKEN_TEKSTFILTERPARAMETERS,
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
    ) as LaattijdigePlaatsbezoekenTekstfilters;

  return {
    sortering:
      sorteerparameter ??
      "aangemeldOp",
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

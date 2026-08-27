import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE =
  12000;

export const NA_FINALISATIE_SORTERINGEN = [
  "auditeur",
  "naamAdi",
  "geregistreerd",
  "linkAttest",
  "attestnummer",
  "datumNaFinalisatie",
  "plaatsbezoek",
  "typeControle",
  "reden",
  "opmerking",
  "inspectielocatie",
  "naamBedrijf",
  "persoonsId",
  "attestId",
] as const;

export type NaFinalisatieSortering =
  (typeof NA_FINALISATIE_SORTERINGEN)[number];

export const NA_FINALISATIE_TEKSTFILTERPARAMETERS = {
  auditeur:
    "filterAuditeur",
  naamAdi:
    "filterNaamAdi",
  geregistreerd:
    "filterGeregistreerd",
  linkAttest:
    "filterLinkAttest",
  attestnummer:
    "filterAttestnummer",
  datumNaFinalisatie:
    "filterDatumNaFinalisatie",
  plaatsbezoek:
    "filterPlaatsbezoek",
  typeControle:
    "filterTypeControle",
  reden:
    "filterReden",
  opmerking:
    "filterOpmerking",
  inspectielocatie:
    "filterInspectielocatie",
  naamBedrijf:
    "filterNaamBedrijf",
  persoonsId:
    "filterPersoonsId",
  attestId:
    "filterAttestId",
} as const;

export type NaFinalisatieTekstfilters = {
  [Sleutel in keyof typeof NA_FINALISATIE_TEKSTFILTERPARAMETERS]:
    string;
};

export type NaFinalisatieLijstcontract = {
  tekstfilters:
    NaFinalisatieTekstfilters;
  datumNaFinalisatieJaar:
    number | null;
  datumNaFinalisatieMaand:
    number | null;
};

type ContractMetSortering = {
  contract:
    NaFinalisatieLijstcontract;
  sortering:
    NaFinalisatieSortering;
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
      "Het filterjaar voor datum na finalisatie is ongeldig.",
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
      "Het filterjaar voor datum na finalisatie moet tussen 1900 en 2100 liggen.",
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
      "De filtermaand voor datum na finalisatie is ongeldig.",
    );
  }

  return Number(waarde);
}

function isSortering(
  waarde: string,
): waarde is NaFinalisatieSortering {
  return NA_FINALISATIE_SORTERINGEN.some(
    (sortering) =>
      sortering === waarde,
  );
}

export function leesNaFinalisatieLijstcontract(
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
        NA_FINALISATIE_TEKSTFILTERPARAMETERS,
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
    ) as NaFinalisatieTekstfilters;

  return {
    sortering:
      sorteerparameter ??
      "datumNaFinalisatie",
    richting,
    contract: {
      tekstfilters,
      datumNaFinalisatieJaar:
        leesJaar(
          url.searchParams.get(
            "jaarDatumNaFinalisatie",
          ),
        ),
      datumNaFinalisatieMaand:
        leesMaand(
          url.searchParams.get(
            "maandDatumNaFinalisatie",
          ),
        ),
    },
  };
}

import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE = 100;

export const PROCESCERTIFICAAT_SORTERINGEN = [
  "bedrijf",
  "kboNummer",
  "certificaatnummer",
  "uitgereiktOp",
  "oneDrive",
  "opmerking",
  "ondernemingstype",
] as const;

export type ProcescertificaatSortering =
  (typeof PROCESCERTIFICAAT_SORTERINGEN)[number];

export type ProcescertificaatTekstfilters = {
  bedrijf: string;
  kboNummer: string;
  certificaatnummer: string;
  oneDrive: string;
  opmerking: string;
  ondernemingstype: string;
};

export type ProcescertificaatLijstcontract = {
  tekstfilters: ProcescertificaatTekstfilters;
  uitgereiktJaar: number | null;
  uitgereiktMaand: number | null;
};

type ContractMetSortering = {
  contract: ProcescertificaatLijstcontract;
  sortering: ProcescertificaatSortering;
  richting: Sorteerrichting;
};

const TEKSTFILTERPARAMETERS = {
  bedrijf: "filterBedrijf",
  kboNummer: "filterKboNummer",
  certificaatnummer:
    "filterCertificaatnummer",
  oneDrive: "filterOneDrive",
  opmerking: "filterOpmerking",
  ondernemingstype:
    "filterOndernemingstype",
} as const satisfies Record<
  keyof ProcescertificaatTekstfilters,
  string
>;

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
      "Het filterjaar is ongeldig.",
    );
  }

  const jaar = Number(waarde);

  if (
    !Number.isInteger(jaar) ||
    jaar < 1900 ||
    jaar > 2100
  ) {
    throw new OngeldigePagineringFout(
      "Het filterjaar moet tussen 1900 en 2100 liggen.",
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

  if (!/^(0[1-9]|1[0-2])$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      "De filtermaand is ongeldig.",
    );
  }

  return Number(waarde);
}

function isSortering(
  waarde: string,
): waarde is ProcescertificaatSortering {
  return PROCESCERTIFICAAT_SORTERINGEN.some(
    (sortering) =>
      sortering === waarde,
  );
}

export function leesProcescertificaatLijstcontract(
  url: URL,
  richting: Sorteerrichting,
): ContractMetSortering {
  const tekstfilters =
    Object.fromEntries(
      Object.entries(
        TEKSTFILTERPARAMETERS,
      ).map(
        ([sleutel, parameter]) => [
          sleutel,
          normaliseerFilter(
            url.searchParams.get(
              parameter,
            ),
            `Filter ${sleutel}`,
          ),
        ],
      ),
    ) as ProcescertificaatTekstfilters;

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

  return {
    sortering:
      sorteerparameter ??
      "bedrijf",
    richting,
    contract: {
      tekstfilters,
      uitgereiktJaar:
        leesJaar(
          url.searchParams.get(
            "uitgereiktJaar",
          ),
        ),
      uitgereiktMaand:
        leesMaand(
          url.searchParams.get(
            "uitgereiktMaand",
          ),
        ),
    },
  };
}

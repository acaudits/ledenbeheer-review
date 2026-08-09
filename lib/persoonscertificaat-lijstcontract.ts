import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";
import {
  isTargetStatus,
  type TargetStatus,
} from "@/lib/persoonscertificaat-targetselectie";

const MAXIMALE_FILTERLENGTE = 100;

export const PERSOONSCERTIFICAAT_SORTERINGEN = [
  "naamPersoon",
  "telefoonnummer",
  "mailadres",
  "ovamId",
  "certificaatnummer",
  "uitgereiktOp",
  "bedrijf",
  "aansluiting",
  "opmerking",
  "certificatiePlatform",
] as const;

export type PersoonscertificaatSortering =
  (typeof PERSOONSCERTIFICAAT_SORTERINGEN)[number];

export type PersoonscertificaatTekstfilters = {
  naamPersoon: string;
  telefoonnummer: string;
  mailadres: string;
  ovamId: string;
  certificaatnummer: string;
  bedrijf: string;
  aansluiting: string;
  opmerking: string;
  certificatiePlatform: string;
};

export type PersoonscertificaatLijstcontract = {
  targetStatus: TargetStatus | null;
  tekstfilters: PersoonscertificaatTekstfilters;
  uitgereiktJaar: number | null;
  uitgereiktMaand: number | null;
};

type ContractMetSortering = {
  contract: PersoonscertificaatLijstcontract;
  sortering: PersoonscertificaatSortering;
  richting: Sorteerrichting;
};

const TEKSTFILTERPARAMETERS = {
  naamPersoon:
    "filterNaamPersoon",
  telefoonnummer:
    "filterTelefoonnummer",
  mailadres:
    "filterMailadres",
  ovamId:
    "filterOvamId",
  certificaatnummer:
    "filterCertificaatnummer",
  bedrijf:
    "filterBedrijf",
  aansluiting:
    "filterAansluiting",
  opmerking:
    "filterOpmerking",
  certificatiePlatform:
    "filterCertificatiePlatform",
} as const satisfies Record<
  keyof PersoonscertificaatTekstfilters,
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

function leesTargetStatus(
  waarde: string | null,
) {
  const genormaliseerd =
    (waarde ?? "")
      .trim()
      .toUpperCase();

  if (!genormaliseerd) {
    return null;
  }

  if (
    !isTargetStatus(
      genormaliseerd,
    )
  ) {
    throw new OngeldigePagineringFout(
      "De gekozen targetstatus is ongeldig.",
    );
  }

  return genormaliseerd;
}

function isSortering(
  waarde: string,
): waarde is PersoonscertificaatSortering {
  return PERSOONSCERTIFICAAT_SORTERINGEN.some(
    (sortering) =>
      sortering === waarde,
  );
}

export function leesPersoonscertificaatLijstcontract(
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
    ) as PersoonscertificaatTekstfilters;

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

  const sortering:
    PersoonscertificaatSortering =
      sorteerparameter ??
      "naamPersoon";

  return {
    sortering,
    richting,
    contract: {
      targetStatus:
        leesTargetStatus(
          url.searchParams.get(
            "targetStatus",
          ),
        ),
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

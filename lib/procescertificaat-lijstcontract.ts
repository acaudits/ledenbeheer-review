import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE = 12000;

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

export type ProcescertificaatSorteercriterium = {
  sleutel: ProcescertificaatSortering;
  richting: Sorteerrichting;
};

type ContractMetSortering = {
  contract: ProcescertificaatLijstcontract;
  sorteringen: ProcescertificaatSorteercriterium[];
};

const TEKSTFILTERPARAMETERS = {
  bedrijf: "filterBedrijf",
  kboNummer: "filterKboNummer",
  certificaatnummer: "filterCertificaatnummer",
  oneDrive: "filterOneDrive",
  opmerking: "filterOpmerking",
  ondernemingstype: "filterOndernemingstype",
} as const satisfies Record<keyof ProcescertificaatTekstfilters, string>;

function normaliseerFilter(waarde: string | null, label: string) {
  const genormaliseerd = (waarde ?? "").replace(/\s+/g, " ").trim();

  if (genormaliseerd.length > MAXIMALE_FILTERLENGTE) {
    throw new OngeldigePagineringFout(
      `${label} mag maximaal ${MAXIMALE_FILTERLENGTE} tekens bevatten.`,
    );
  }

  return genormaliseerd;
}

function leesJaar(waarde: string | null) {
  if (waarde === null || waarde === "") {
    return null;
  }

  if (!/^\d{4}$/.test(waarde)) {
    throw new OngeldigePagineringFout("Het filterjaar is ongeldig.");
  }

  const jaar = Number(waarde);

  if (!Number.isInteger(jaar) || jaar < 1900 || jaar > 2100) {
    throw new OngeldigePagineringFout(
      "Het filterjaar moet tussen 1900 en 2100 liggen.",
    );
  }

  return jaar;
}

function leesMaand(waarde: string | null) {
  if (waarde === null || waarde === "") {
    return null;
  }

  if (!/^(0[1-9]|1[0-2])$/.test(waarde)) {
    throw new OngeldigePagineringFout("De filtermaand is ongeldig.");
  }

  return Number(waarde);
}

function isSortering(waarde: string): waarde is ProcescertificaatSortering {
  return PROCESCERTIFICAAT_SORTERINGEN.some(
    (sortering) => sortering === waarde,
  );
}

function leesSorteringen(
  url: URL,
  standaardRichting: Sorteerrichting,
): ProcescertificaatSorteercriterium[] {
  const parameter = url.searchParams.get("sorteringen");

  if (!parameter) {
    const oudeSortering = url.searchParams.get("sortering") ?? "bedrijf";

    if (!isSortering(oudeSortering)) {
      throw new OngeldigePagineringFout("De gekozen sortering is ongeldig.");
    }

    const oudeRichting = url.searchParams.get("richting") ?? standaardRichting;

    if (oudeRichting !== "asc" && oudeRichting !== "desc") {
      throw new OngeldigePagineringFout(
        "De gekozen sorteerrichting is ongeldig.",
      );
    }

    return [
      {
        sleutel: oudeSortering,
        richting: oudeRichting,
      },
    ];
  }

  if (parameter.length > 1000) {
    throw new OngeldigePagineringFout("De gekozen sorteringen zijn te lang.");
  }

  const gezien = new Set<ProcescertificaatSortering>();

  const sorteringen = parameter
    .split(",")
    .map((onderdeel, index): ProcescertificaatSorteercriterium => {
      const [sleutel, richting, ...rest] = onderdeel.split(":");

      if (
        rest.length > 0 ||
        !sleutel ||
        !isSortering(sleutel) ||
        (richting !== "asc" && richting !== "desc")
      ) {
        throw new OngeldigePagineringFout(
          `Sortering ${index + 1} is ongeldig.`,
        );
      }

      if (gezien.has(sleutel)) {
        throw new OngeldigePagineringFout(
          "Een kolom mag maar één keer in de sortering voorkomen.",
        );
      }

      gezien.add(sleutel);

      return {
        sleutel,
        richting,
      };
    });

  if (
    sorteringen.length === 0 ||
    sorteringen.length > PROCESCERTIFICAAT_SORTERINGEN.length
  ) {
    throw new OngeldigePagineringFout("Het aantal sorteringen is ongeldig.");
  }

  return sorteringen;
}

export function leesProcescertificaatLijstcontract(
  url: URL,
  standaardRichting: Sorteerrichting,
): ContractMetSortering {
  const tekstfilters = Object.fromEntries(
    Object.entries(TEKSTFILTERPARAMETERS).map(([sleutel, parameter]) => [
      sleutel,
      normaliseerFilter(url.searchParams.get(parameter), `Filter ${sleutel}`),
    ]),
  ) as ProcescertificaatTekstfilters;

  return {
    sorteringen: leesSorteringen(url, standaardRichting),
    contract: {
      tekstfilters,
      uitgereiktJaar: leesJaar(url.searchParams.get("uitgereiktJaar")),
      uitgereiktMaand: leesMaand(url.searchParams.get("uitgereiktMaand")),
    },
  };
}

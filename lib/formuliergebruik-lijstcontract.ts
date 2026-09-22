import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE = 12000;

export const FORMULIERGEBRUIK_SORTERINGEN = [
  "gestartOp",
  "laatsteActiviteitOp",
  "actieveDuurSeconden",
  "status",
  "stap",
  "apparaat",
  "naamAdi",
  "persoonsId",
  "foutcode",
  "foutmelding",
  "ovamLinkGeklikt",
  "ovamLinkKlikken",
  "ovamLinkLaatstOp",
  "referentie",
  "aantalPlaatsbezoeken",
  "id",
] as const;

export type FormuliergebruikSortering =
  (typeof FORMULIERGEBRUIK_SORTERINGEN)[number];

export type FormuliergebruikSorteercriterium = {
  sleutel: FormuliergebruikSortering;
  richting: Sorteerrichting;
};

export const FORMULIERGEBRUIK_FILTERPARAMETERS = {
  gestartOp: "filterGestartOp",
  laatsteActiviteitOp: "filterLaatsteActiviteitOp",
  actieveDuurSeconden: "filterActieveDuurSeconden",
  status: "filterStatus",
  stap: "filterStap",
  apparaat: "filterApparaat",
  naamAdi: "filterNaamAdi",
  persoonsId: "filterPersoonsId",
  foutcode: "filterFoutcode",
  foutmelding: "filterFoutmelding",
  ovamLinkGeklikt: "filterOvamLinkGeklikt",
  ovamLinkKlikken: "filterOvamLinkKlikken",
  ovamLinkLaatstOp: "filterOvamLinkLaatstOp",
  referentie: "filterReferentie",
  aantalPlaatsbezoeken: "filterAantalPlaatsbezoeken",
  id: "filterId",
} as const;

export type FormuliergebruikFilters = {
  [Sleutel in keyof typeof FORMULIERGEBRUIK_FILTERPARAMETERS]: string;
};

export type FormuliergebruikLijstcontract = {
  filters: FormuliergebruikFilters;
  sorteringen: FormuliergebruikSorteercriterium[];
};

function normaliseerFilter(waarde: string | null, label: string) {
  const resultaat = (waarde ?? "").replace(/\s+/g, " ").trim();

  if (resultaat.length > MAXIMALE_FILTERLENGTE) {
    throw new OngeldigePagineringFout(
      `${label} mag maximaal ${MAXIMALE_FILTERLENGTE} tekens bevatten.`,
    );
  }

  return resultaat;
}

function isSortering(waarde: string): waarde is FormuliergebruikSortering {
  return FORMULIERGEBRUIK_SORTERINGEN.some((sortering) => sortering === waarde);
}

function leesSorteringen(url: URL): FormuliergebruikSorteercriterium[] {
  const parameter = url.searchParams.get("sorteringen")?.trim();

  if (!parameter) {
    return [
      {
        sleutel: "gestartOp",
        richting: "desc",
      },
    ];
  }

  const delen = parameter.split(",").filter(Boolean);

  if (
    delen.length === 0 ||
    delen.length > FORMULIERGEBRUIK_SORTERINGEN.length
  ) {
    throw new OngeldigePagineringFout("Het aantal sorteringen is ongeldig.");
  }

  const gezien = new Set<string>();

  return delen.map((deel, index) => {
    const [sleutel, richting, ...rest] = deel.split(":");

    if (
      rest.length > 0 ||
      !isSortering(sleutel) ||
      (richting !== "asc" && richting !== "desc")
    ) {
      throw new OngeldigePagineringFout(`Sortering ${index + 1} is ongeldig.`);
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
}

export function leesFormuliergebruikLijstcontract(
  url: URL,
): FormuliergebruikLijstcontract {
  const filters = Object.fromEntries(
    Object.entries(FORMULIERGEBRUIK_FILTERPARAMETERS).map(
      ([sleutel, parameter]) => [
        sleutel,
        normaliseerFilter(url.searchParams.get(parameter), `Filter ${sleutel}`),
      ],
    ),
  ) as FormuliergebruikFilters;

  return {
    filters,
    sorteringen: leesSorteringen(url),
  };
}

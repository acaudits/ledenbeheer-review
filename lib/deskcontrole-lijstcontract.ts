import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE = 12000;

export const DESKCONTROLE_SORTERINGEN = [
  "auditeur",
  "naamAdi",
  "afgerond",
  "linkAttest",
  "attestnummer",
  "status",
  "deadlineSanctie",
  "mailSanctieVerzonden",
  "typeControle",
  "deadlineCorrectie",
  "mailCorrectieVerzonden",
  "oneDrive",
  "voorwaardelijkeOpheffing",
  "certificatiePlatform",
  "opmerkingen",
  "datumControle",
  "adres",
  "persoonsId",
  "bedrijfsnaam",
  "ondernemingsnummer",
  "persoonscertificaat",
  "procescertificaat",
  "finalisatieDatum",
  "attestId",
] as const;

export type DeskcontroleSortering = (typeof DESKCONTROLE_SORTERINGEN)[number];

export const DESKCONTROLE_DASHBOARDFILTERS = [
  "afgerond",
  "in-opmaak",
  "geactualiseerd",
  "openstaand",
  "binnen-zeven-dagen",
  "verstreken",
] as const;

export type DeskcontroleDashboardFilter =
  (typeof DESKCONTROLE_DASHBOARDFILTERS)[number];

export const DESKCONTROLE_DATUMVELDEN = [
  "deadlineSanctie",
  "deadlineCorrectie",
  "datumControle",
  "finalisatieDatum",
] as const;

export type DeskcontroleDatumveld = (typeof DESKCONTROLE_DATUMVELDEN)[number];

export const DESKCONTROLE_TEKSTFILTERPARAMETERS = {
  auditeur: "filterAuditeur",
  naamAdi: "filterNaamAdi",
  afgerond: "filterAfgerond",
  linkAttest: "filterLinkAttest",
  attestnummer: "filterAttestnummer",
  status: "filterStatus",
  deadlineSanctie: "filterDeadlineSanctie",
  mailSanctieVerzonden: "filterMailSanctieVerzonden",
  typeControle: "filterTypeControle",
  mailCorrectieVerzonden: "filterMailCorrectieVerzonden",
  oneDrive: "filterOneDrive",
  voorwaardelijkeOpheffing: "filterVoorwaardelijkeOpheffing",
  certificatiePlatform: "filterCertificatiePlatform",
  opmerkingen: "filterOpmerkingen",
  datumControle: "filterDatumControle",
  adres: "filterAdres",
  persoonsId: "filterPersoonsId",
  bedrijfsnaam: "filterBedrijfsnaam",
  ondernemingsnummer: "filterOndernemingsnummer",
  persoonscertificaat: "filterPersoonscertificaat",
  procescertificaat: "filterProcescertificaat",
  attestId: "filterAttestId",
} as const;

export type DeskcontroleTekstfilters = {
  [Sleutel in keyof typeof DESKCONTROLE_TEKSTFILTERPARAMETERS]: string;
};

export type DeskcontroleDatumfilter = {
  jaar: number | null;
  maand: number | null;
};

export type DeskcontroleLijstcontract = {
  dashboardFilter: DeskcontroleDashboardFilter | null;
  tekstfilters: DeskcontroleTekstfilters;
  datumfilters: Record<DeskcontroleDatumveld, DeskcontroleDatumfilter>;
};

export type DeskcontroleSorteercriterium = {
  sleutel: DeskcontroleSortering;
  richting: Sorteerrichting;
};

type ContractMetSortering = {
  contract: DeskcontroleLijstcontract;
  sorteringen: DeskcontroleSorteercriterium[];
};

function normaliseerFilter(waarde: string | null, label: string) {
  const genormaliseerd = (waarde ?? "").replace(/\s+/g, " ").trim();

  if (genormaliseerd.length > MAXIMALE_FILTERLENGTE) {
    throw new OngeldigePagineringFout(
      `${label} mag maximaal ${MAXIMALE_FILTERLENGTE} tekens bevatten.`,
    );
  }

  return genormaliseerd;
}

function leesJaar(waarde: string | null, veld: string) {
  if (waarde === null || waarde === "") {
    return null;
  }

  if (!/^\d{4}$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      `Het filterjaar voor ${veld} is ongeldig.`,
    );
  }

  const jaar = Number(waarde);

  if (!Number.isInteger(jaar) || jaar < 1900 || jaar > 2100) {
    throw new OngeldigePagineringFout(
      `Het filterjaar voor ${veld} moet tussen 1900 en 2100 liggen.`,
    );
  }

  return jaar;
}

function leesMaand(waarde: string | null, veld: string) {
  if (waarde === null || waarde === "") {
    return null;
  }

  if (!/^(0[1-9]|1[0-2])$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      `De filtermaand voor ${veld} is ongeldig.`,
    );
  }

  return Number(waarde);
}

function isSortering(waarde: string): waarde is DeskcontroleSortering {
  return DESKCONTROLE_SORTERINGEN.some((sortering) => sortering === waarde);
}

function isDashboardFilter(
  waarde: string,
): waarde is DeskcontroleDashboardFilter {
  return DESKCONTROLE_DASHBOARDFILTERS.some((filter) => filter === waarde);
}

function leesSorteringen(
  url: URL,
  standaardRichting: Sorteerrichting,
): DeskcontroleSorteercriterium[] {
  const parameter = url.searchParams.get("sorteringen");

  if (!parameter) {
    const oudeSortering = url.searchParams.get("sortering");

    const oudeRichting = url.searchParams.get("richting");

    if (oudeSortering !== null && !isSortering(oudeSortering)) {
      throw new OngeldigePagineringFout("De gekozen sortering is ongeldig.");
    }

    if (
      oudeRichting !== null &&
      oudeRichting !== "asc" &&
      oudeRichting !== "desc"
    ) {
      throw new OngeldigePagineringFout(
        "De gekozen sorteerrichting is ongeldig.",
      );
    }

    return [
      {
        sleutel: oudeSortering ?? "datumControle",
        richting: oudeRichting ?? standaardRichting,
      },
    ];
  }

  if (parameter.length > 2000) {
    throw new OngeldigePagineringFout("De gekozen sorteringen zijn te lang.");
  }

  const gezien = new Set<DeskcontroleSortering>();

  const sorteringen = parameter
    .split(",")
    .map((onderdeel, index): DeskcontroleSorteercriterium => {
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
    sorteringen.length > DESKCONTROLE_SORTERINGEN.length
  ) {
    throw new OngeldigePagineringFout("Het aantal sorteringen is ongeldig.");
  }

  return sorteringen;
}

export function leesDeskcontroleLijstcontract(
  url: URL,
  standaardRichting: Sorteerrichting,
): ContractMetSortering {
  const dashboardParameter = url.searchParams.get("dashboardFilter");

  if (dashboardParameter !== null && !isDashboardFilter(dashboardParameter)) {
    throw new OngeldigePagineringFout(
      "Het gekozen dashboardfilter is ongeldig.",
    );
  }

  const tekstfilters = Object.fromEntries(
    Object.entries(DESKCONTROLE_TEKSTFILTERPARAMETERS).map(
      ([sleutel, parameter]) => [
        sleutel,
        normaliseerFilter(url.searchParams.get(parameter), `Filter ${sleutel}`),
      ],
    ),
  ) as DeskcontroleTekstfilters;

  const datumfilters = Object.fromEntries(
    DESKCONTROLE_DATUMVELDEN.map((veld) => [
      veld,
      {
        jaar: leesJaar(
          url.searchParams.get(`jaar${veld[0].toUpperCase()}${veld.slice(1)}`),
          veld,
        ),
        maand: leesMaand(
          url.searchParams.get(`maand${veld[0].toUpperCase()}${veld.slice(1)}`),
          veld,
        ),
      },
    ]),
  ) as Record<DeskcontroleDatumveld, DeskcontroleDatumfilter>;

  return {
    sorteringen: leesSorteringen(url, standaardRichting),
    contract: {
      dashboardFilter: dashboardParameter,
      tekstfilters,
      datumfilters,
    },
  };
}

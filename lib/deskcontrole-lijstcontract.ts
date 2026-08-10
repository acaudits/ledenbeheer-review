import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE = 100;

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

export type DeskcontroleSortering =
  (typeof DESKCONTROLE_SORTERINGEN)[number];

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

export type DeskcontroleDatumveld =
  (typeof DESKCONTROLE_DATUMVELDEN)[number];

export const DESKCONTROLE_TEKSTFILTERPARAMETERS = {
  auditeur: "filterAuditeur",
  naamAdi: "filterNaamAdi",
  afgerond: "filterAfgerond",
  linkAttest: "filterLinkAttest",
  attestnummer: "filterAttestnummer",
  status: "filterStatus",
  mailSanctieVerzonden:
    "filterMailSanctieVerzonden",
  typeControle: "filterTypeControle",
  mailCorrectieVerzonden:
    "filterMailCorrectieVerzonden",
  oneDrive: "filterOneDrive",
  voorwaardelijkeOpheffing:
    "filterVoorwaardelijkeOpheffing",
  certificatiePlatform:
    "filterCertificatiePlatform",
  opmerkingen: "filterOpmerkingen",
  adres: "filterAdres",
  persoonsId: "filterPersoonsId",
  bedrijfsnaam: "filterBedrijfsnaam",
  ondernemingsnummer:
    "filterOndernemingsnummer",
  persoonscertificaat:
    "filterPersoonscertificaat",
  procescertificaat:
    "filterProcescertificaat",
  attestId: "filterAttestId",
} as const;

export type DeskcontroleTekstfilters = {
  [Sleutel in keyof typeof DESKCONTROLE_TEKSTFILTERPARAMETERS]:
    string;
};

export type DeskcontroleDatumfilter = {
  jaar: number | null;
  maand: number | null;
};

export type DeskcontroleLijstcontract = {
  dashboardFilter:
    DeskcontroleDashboardFilter | null;
  tekstfilters: DeskcontroleTekstfilters;
  datumfilters: Record<
    DeskcontroleDatumveld,
    DeskcontroleDatumfilter
  >;
};

type ContractMetSortering = {
  contract: DeskcontroleLijstcontract;
  sortering: DeskcontroleSortering;
  richting: Sorteerrichting;
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
  veld: string,
) {
  if (
    waarde === null ||
    waarde === ""
  ) {
    return null;
  }

  if (!/^\d{4}$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      `Het filterjaar voor ${veld} is ongeldig.`,
    );
  }

  const jaar = Number(waarde);

  if (
    !Number.isInteger(jaar) ||
    jaar < 1900 ||
    jaar > 2100
  ) {
    throw new OngeldigePagineringFout(
      `Het filterjaar voor ${veld} moet tussen 1900 en 2100 liggen.`,
    );
  }

  return jaar;
}

function leesMaand(
  waarde: string | null,
  veld: string,
) {
  if (
    waarde === null ||
    waarde === ""
  ) {
    return null;
  }

  if (!/^(0[1-9]|1[0-2])$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      `De filtermaand voor ${veld} is ongeldig.`,
    );
  }

  return Number(waarde);
}

function isSortering(
  waarde: string,
): waarde is DeskcontroleSortering {
  return DESKCONTROLE_SORTERINGEN.some(
    (sortering) => sortering === waarde,
  );
}

function isDashboardFilter(
  waarde: string,
): waarde is DeskcontroleDashboardFilter {
  return DESKCONTROLE_DASHBOARDFILTERS.some(
    (filter) => filter === waarde,
  );
}

export function leesDeskcontroleLijstcontract(
  url: URL,
  richting: Sorteerrichting,
): ContractMetSortering {
  const sorteerparameter =
    url.searchParams.get("sortering");

  if (
    sorteerparameter !== null &&
    !isSortering(sorteerparameter)
  ) {
    throw new OngeldigePagineringFout(
      "De gekozen sortering is ongeldig.",
    );
  }

  const richtingParameter =
    url.searchParams.get("richting");

  if (
    richtingParameter !== null &&
    richtingParameter !== "asc" &&
    richtingParameter !== "desc"
  ) {
    throw new OngeldigePagineringFout(
      "De gekozen sorteerrichting is ongeldig.",
    );
  }

  const dashboardParameter =
    url.searchParams.get("dashboardFilter");

  if (
    dashboardParameter !== null &&
    !isDashboardFilter(dashboardParameter)
  ) {
    throw new OngeldigePagineringFout(
      "Het gekozen dashboardfilter is ongeldig.",
    );
  }

  const tekstfilters =
    Object.fromEntries(
      Object.entries(
        DESKCONTROLE_TEKSTFILTERPARAMETERS,
      ).map(([sleutel, parameter]) => [
        sleutel,
        normaliseerFilter(
          url.searchParams.get(parameter),
          `Filter ${sleutel}`,
        ),
      ]),
    ) as DeskcontroleTekstfilters;

  const datumfilters =
    Object.fromEntries(
      DESKCONTROLE_DATUMVELDEN.map(
        (veld) => [
          veld,
          {
            jaar: leesJaar(
              url.searchParams.get(
                `jaar${veld[0].toUpperCase()}${veld.slice(1)}`,
              ),
              veld,
            ),
            maand: leesMaand(
              url.searchParams.get(
                `maand${veld[0].toUpperCase()}${veld.slice(1)}`,
              ),
              veld,
            ),
          },
        ],
      ),
    ) as Record<
      DeskcontroleDatumveld,
      DeskcontroleDatumfilter
    >;

  return {
    sortering:
      sorteerparameter ?? "datumControle",
    richting,
    contract: {
      dashboardFilter:
        dashboardParameter,
      tekstfilters,
      datumfilters,
    },
  };
}

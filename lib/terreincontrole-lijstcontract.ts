import "server-only";

import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

const MAXIMALE_FILTERLENGTE = 100;

export const TERREINCONTROLE_SORTERINGEN = [
  "auditeur",
  "naamAdi",
  "linkAttest",
  "attestnummer",
  "certificatiePlatform",
  "opmerkingen",
  "datumControle",
  "adres",
  "persoonsId",
  "bedrijfsnaam",
  "ondernemingsnummer",
  "persoonscertificaat",
  "procescertificaat",
  "attestId",
] as const;

export type TerreincontroleSortering =
  (typeof TERREINCONTROLE_SORTERINGEN)[number];

export const TERREINCONTROLE_TEKSTFILTERPARAMETERS = {
  auditeur: "filterAuditeur",
  naamAdi: "filterNaamAdi",
  linkAttest: "filterLinkAttest",
  attestnummer: "filterAttestnummer",
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

export type TerreincontroleTekstfilters = {
  [Sleutel in keyof typeof TERREINCONTROLE_TEKSTFILTERPARAMETERS]:
    string;
};

export type TerreincontroleLijstcontract = {
  tekstfilters:
    TerreincontroleTekstfilters;
  datumControleJaar:
    number | null;
  datumControleMaand:
    number | null;
};

type ContractMetSortering = {
  contract:
    TerreincontroleLijstcontract;
  sortering:
    TerreincontroleSortering;
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
      "Het filterjaar voor datum controle is ongeldig.",
    );
  }

  const jaar = Number(waarde);

  if (
    !Number.isInteger(jaar) ||
    jaar < 1900 ||
    jaar > 2100
  ) {
    throw new OngeldigePagineringFout(
      "Het filterjaar voor datum controle moet tussen 1900 en 2100 liggen.",
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
      "De filtermaand voor datum controle is ongeldig.",
    );
  }

  return Number(waarde);
}

function isSortering(
  waarde: string,
): waarde is TerreincontroleSortering {
  return TERREINCONTROLE_SORTERINGEN.some(
    (sortering) =>
      sortering === waarde,
  );
}

export function leesTerreincontroleLijstcontract(
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
        TERREINCONTROLE_TEKSTFILTERPARAMETERS,
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
    ) as TerreincontroleTekstfilters;

  return {
    sortering:
      sorteerparameter ??
      "datumControle",
    richting,
    contract: {
      tekstfilters,
      datumControleJaar:
        leesJaar(
          url.searchParams.get(
            "jaarDatumControle",
          ),
        ),
      datumControleMaand:
        leesMaand(
          url.searchParams.get(
            "maandDatumControle",
          ),
        ),
    },
  };
}

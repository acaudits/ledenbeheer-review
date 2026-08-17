export const OPVOLGING_BRONNEN = [
  "DESKCONTROLE",
  "TERREINCONTROLE",
  "NA_FINALISATIE",
] as const;

export type OpvolgingBron =
  (typeof OPVOLGING_BRONNEN)[number];

export const OPVOLGING_NC_CATEGORIEEN = [
  "CAT_0",
  "CAT_1",
  "CAT_2",
  "CAT_3",
  "CAT_4",
] as const;

export type OpvolgingNcCategorieWaarde =
  (typeof OPVOLGING_NC_CATEGORIEEN)[number];

export type OpvolgingSanctieInvoer = {
  reden: string;
  datumVaststelling: Date;
  ncCategorie: OpvolgingNcCategorieWaarde;
  sanctieBegindatum: Date | null;
  sanctieEinddatum: Date | null;
};

export type OpvolgingValidatieResultaat =
  | {
      geldig: true;
      invoer: OpvolgingSanctieInvoer;
    }
  | {
      geldig: false;
      melding: string;
    };

export function isOpvolgingBron(
  waarde: unknown,
): waarde is OpvolgingBron {
  return (
    typeof waarde === "string" &&
    OPVOLGING_BRONNEN.some(
      (bron) => bron === waarde,
    )
  );
}

export function isOpvolgingNcCategorie(
  waarde: unknown,
): waarde is OpvolgingNcCategorieWaarde {
  return (
    typeof waarde === "string" &&
    OPVOLGING_NC_CATEGORIEEN.some(
      (categorie) => categorie === waarde,
    )
  );
}

export function opvolgingBronLabel(
  bron: OpvolgingBron,
) {
  switch (bron) {
    case "DESKCONTROLE":
      return "Deskcontrole";

    case "TERREINCONTROLE":
      return "Terreincontrole";

    case "NA_FINALISATIE":
      return "Na finalisatie";
  }
}

export function ncCategorieLabel(
  categorie: OpvolgingNcCategorieWaarde,
) {
  switch (categorie) {
    case "CAT_0":
      return "Cat. 0";

    case "CAT_1":
      return "Cat. 1";

    case "CAT_2":
      return "Cat. 2";

    case "CAT_3":
      return "Cat. 3";

    case "CAT_4":
      return "Cat. 4";
  }
}

function isSchrikkeljaar(
  jaar: number,
) {
  return (
    jaar % 400 === 0 ||
    (
      jaar % 4 === 0 &&
      jaar % 100 !== 0
    )
  );
}

function dagenInMaand(
  jaar: number,
  maandIndex: number,
) {
  switch (maandIndex) {
    case 1:
      return isSchrikkeljaar(jaar)
        ? 29
        : 28;

    case 3:
    case 5:
    case 8:
    case 10:
      return 30;

    default:
      return 31;
  }
}

/**
 * Voegt kalendermaanden toe en begrenst de dag op de laatste geldige
 * dag van de doelmaand.
 *
 * Voorbeelden:
 * - 31 augustus + 6 maanden = 28/29 februari
 * - 30 november + 6 maanden = 30 mei
 */
export function voegKalendermaandenToe(
  datum: Date,
  aantalMaanden: number,
) {
  if (
    !Number.isInteger(aantalMaanden) ||
    Number.isNaN(datum.getTime())
  ) {
    throw new Error(
      "Ongeldige datum of ongeldig aantal maanden.",
    );
  }

  const bronJaar =
    datum.getUTCFullYear();
  const bronMaand =
    datum.getUTCMonth();
  const bronDag =
    datum.getUTCDate();

  const absoluutMaandnummer =
    bronJaar * 12 +
    bronMaand +
    aantalMaanden;

  const doelJaar =
    Math.floor(
      absoluutMaandnummer / 12,
    );

  const doelMaand =
    (
      absoluutMaandnummer % 12 +
      12
    ) % 12;

  const doelDag =
    Math.min(
      bronDag,
      dagenInMaand(
        doelJaar,
        doelMaand,
      ),
    );

  return new Date(
    Date.UTC(
      doelJaar,
      doelMaand,
      doelDag,
    ),
  );
}

export function berekenCat1Einddatum(
  begindatum: Date,
) {
  return voegKalendermaandenToe(
    begindatum,
    6,
  );
}

export function formatteerDatumVoorInvoer(
  datum: Date,
) {
  const jaar =
    datum.getUTCFullYear();

  const maand =
    String(
      datum.getUTCMonth() + 1,
    ).padStart(2, "0");

  const dag =
    String(
      datum.getUTCDate(),
    ).padStart(2, "0");

  return `${jaar}-${maand}-${dag}`;
}

export function ontleedDatumInvoer(
  waarde: unknown,
) {
  if (
    typeof waarde !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      waarde,
    )
  ) {
    return null;
  }

  const [
    jaarTekst,
    maandTekst,
    dagTekst,
  ] = waarde.split("-");

  const jaar = Number(jaarTekst);
  const maand = Number(maandTekst);
  const dag = Number(dagTekst);

  const datum = new Date(
    Date.UTC(
      jaar,
      maand - 1,
      dag,
    ),
  );

  if (
    datum.getUTCFullYear() !== jaar ||
    datum.getUTCMonth() !== maand - 1 ||
    datum.getUTCDate() !== dag
  ) {
    return null;
  }

  return datum;
}

export function valideerOpvolgingSanctieInvoer(
  formData: FormData,
): OpvolgingValidatieResultaat {
  const reden = String(
    formData.get("reden") ?? "",
  ).trim();

  const datumVaststelling =
    ontleedDatumInvoer(
      formData.get(
        "datumVaststelling",
      ),
    );

  const categorieWaarde =
    formData.get("ncCategorie");

  if (!reden) {
    return {
      geldig: false,
      melding:
        "Vul een reden in.",
    };
  }

  if (reden.length > 10_000) {
    return {
      geldig: false,
      melding:
        "De reden mag maximaal 10.000 tekens bevatten.",
    };
  }

  if (!datumVaststelling) {
    return {
      geldig: false,
      melding:
        "Vul een geldige datum van vaststelling in.",
    };
  }

  if (
    !isOpvolgingNcCategorie(
      categorieWaarde,
    )
  ) {
    return {
      geldig: false,
      melding:
        "Selecteer een geldige NC-categorie.",
    };
  }

  const ncCategorie =
    categorieWaarde;

  const sanctieBegindatum =
    ontleedDatumInvoer(
      formData.get(
        "sanctieBegindatum",
      ),
    );

  const sanctieEinddatum =
    ontleedDatumInvoer(
      formData.get(
        "sanctieEinddatum",
      ),
    );

  if (ncCategorie === "CAT_1") {
    if (!sanctieBegindatum) {
      return {
        geldig: false,
        melding:
          "Vul voor Cat. 1 een aanvangsdatum in.",
      };
    }

    return {
      geldig: true,
      invoer: {
        reden,
        datumVaststelling,
        ncCategorie,
        sanctieBegindatum,
        sanctieEinddatum:
          berekenCat1Einddatum(
            sanctieBegindatum,
          ),
      },
    };
  }

  if (ncCategorie === "CAT_2") {
    if (
      formData.get(
        "ovamPeriodeBevestigd",
      ) !== "on"
    ) {
      return {
        geldig: false,
        melding:
          "Bevestig dat de sanctieperiode overeenkomt met het OVAM-certificatieplatform.",
      };
    }

    if (
      !sanctieBegindatum ||
      !sanctieEinddatum
    ) {
      return {
        geldig: false,
        melding:
          "Vul voor Cat. 2 de sanctie begin- en einddatum in.",
      };
    }

    if (
      sanctieEinddatum.getTime() <
      sanctieBegindatum.getTime()
    ) {
      return {
        geldig: false,
        melding:
          "De sanctie einddatum mag niet vóór de begindatum liggen.",
      };
    }

    return {
      geldig: true,
      invoer: {
        reden,
        datumVaststelling,
        ncCategorie,
        sanctieBegindatum,
        sanctieEinddatum,
      },
    };
  }

  return {
    geldig: true,
    invoer: {
      reden,
      datumVaststelling,
      ncCategorie,
      sanctieBegindatum: null,
      sanctieEinddatum: null,
    },
  };
}

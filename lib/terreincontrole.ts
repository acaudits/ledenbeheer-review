export const TERREINCONTROLE_AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

export type TerreincontroleAuditeur =
  (typeof TERREINCONTROLE_AUDITEURS)[number];

export function isGeldigeTerreincontroleAuditeur(
  waarde: unknown,
): waarde is TerreincontroleAuditeur {
  return TERREINCONTROLE_AUDITEURS.includes(
    String(waarde).trim() as TerreincontroleAuditeur,
  );
}

export const TERREINCONTROLE_STATUSSEN =
  [
    "GEARCHIVEERD_ATTEST",
    "ACTUEEL_ATTEST",
    "IN_OPMAAK",
  ] as const;

export type TerreincontroleStatusWaarde =
  (typeof TERREINCONTROLE_STATUSSEN)[number];

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUR_PATROON =
  /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function normaliseerTekst(
  waarde: unknown,
) {
  const tekst = String(
    waarde ?? "",
  ).trim();

  if (
    !tekst ||
    tekst.toLocaleLowerCase(
      "nl-BE",
    ) === "nan" ||
    tekst.toLocaleLowerCase(
      "nl-BE",
    ) === "nat" ||
    tekst.toLocaleLowerCase(
      "nl-BE",
    ) === "null"
  ) {
    return "";
  }

  return tekst;
}

export function normaliseerOvamId(
  waarde: unknown,
) {
  return normaliseerTekst(
    waarde,
  ).toUpperCase();
}

export function normaliseerAttestId(
  waarde: unknown,
) {
  return normaliseerTekst(
    waarde,
  ).toLowerCase();
}

export function isGeldigUuid(
  waarde: string,
) {
  return UUID_PATROON.test(
    waarde,
  );
}

export function isGeldigUur(
  waarde: string,
) {
  return UUR_PATROON.test(
    waarde,
  );
}

const ATTEST_ID_PATROON =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export function haalAttestIdUitUrl(
  waarde: unknown,
): string | null {
  const tekst = String(
    waarde ?? "",
  ).trim();

  if (!tekst) {
    return null;
  }

  try {
    const url = new URL(tekst);

    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !==
        "asbestinventaris.ovam.be"
    ) {
      return null;
    }

    const resultaat =
      url.pathname.match(
        ATTEST_ID_PATROON,
      );

    return resultaat
      ? resultaat[0].toLowerCase()
      : null;
  } catch {
    return null;
  }
}

export function maakGoogleMapsUrl(
  inspectielocatie: unknown,
): string | null {
  const locatie = String(
    inspectielocatie ?? "",
  ).trim();

  if (!locatie) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(locatie)
  );
}


export function leesIsoDatum(
  waarde: string,
) {
  const gevonden =
    waarde.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!gevonden) {
    return null;
  }

  const jaar =
    Number(gevonden[1]);

  const maand =
    Number(gevonden[2]);

  const dag =
    Number(gevonden[3]);

  const datum = new Date(
    Date.UTC(
      jaar,
      maand - 1,
      dag,
    ),
  );

  if (
    datum.getUTCFullYear() !==
      jaar ||
    datum.getUTCMonth() !==
      maand - 1 ||
    datum.getUTCDate() !== dag
  ) {
    return null;
  }

  return datum;
}

export function normaliseerTerreincontroleStatus(
  waarde: unknown,
): TerreincontroleStatusWaarde | null | undefined {
  const tekst =
    normaliseerTekst(
      waarde,
    )
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  if (!tekst) {
    return null;
  }

  if (
    tekst ===
    "GEARCHIVEERD_ATTEST"
  ) {
    return "GEARCHIVEERD_ATTEST";
  }

  if (
    tekst ===
    "ACTUEEL_ATTEST"
  ) {
    return "ACTUEEL_ATTEST";
  }

  if (
    tekst === "IN_OPMAAK"
  ) {
    return "IN_OPMAAK";
  }

  return undefined;
}

export function statusLabel(
  status:
    | TerreincontroleStatusWaarde
    | null,
) {
  if (
    status ===
    "GEARCHIVEERD_ATTEST"
  ) {
    return "Gearchiveerd attest";
  }

  if (
    status ===
    "ACTUEEL_ATTEST"
  ) {
    return "Actueel attest";
  }

  if (
    status === "IN_OPMAAK"
  ) {
    return "In opmaak";
  }

  return "Geen status";
}


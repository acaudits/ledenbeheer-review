const EU_LANDCODES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

function maakCompact(
  waarde: string,
) {
  return waarde
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normaliseerOndernemingsnummer(
  waarde: string,
) {
  const opgeschoond =
    maakCompact(waarde);

  if (!opgeschoond) {
    return "";
  }

  /*
   * Belgische nummers met BE-prefix:
   *
   * BE0831785193 -> 0831785193
   * BE831785193  -> 0831785193
   */
  if (
    opgeschoond.startsWith("BE")
  ) {
    const cijfers =
      opgeschoond.slice(2);

    if (
      /^[0-9]{9,10}$/.test(
        cijfers,
      )
    ) {
      return cijfers.padStart(
        10,
        "0",
      );
    }

    return opgeschoond;
  }

  /*
   * Belgische nummers zonder prefix:
   *
   * 0831785193 -> 0831785193
   * 831785193  -> 0831785193
   */
  if (
    /^[0-9]{9,10}$/.test(
      opgeschoond,
    )
  ) {
    return opgeschoond.padStart(
      10,
      "0",
    );
  }

  /*
   * Buitenlandse EU-nummers behouden
   * hun landcode.
   */
  return opgeschoond;
}

export function isBelgischOndernemingsnummer(
  waarde: string,
) {
  const opgeschoond =
    maakCompact(waarde);

  if (
    /^[0-9]{9,10}$/.test(
      opgeschoond,
    )
  ) {
    return true;
  }

  return /^BE[0-9]{9,10}$/.test(
    opgeschoond,
  );
}

export function isGeldigOndernemingsnummer(
  waarde: string,
) {
  const genormaliseerd =
    normaliseerOndernemingsnummer(
      waarde,
    );

  if (!genormaliseerd) {
    return false;
  }

  /*
   * Belgische nummers zijn na
   * normalisatie altijd 10 cijfers.
   */
  if (
    /^[0-9]{10}$/.test(
      genormaliseerd,
    )
  ) {
    return true;
  }

  /*
   * Buitenlands EU-btw-nummer:
   * tweeletterige landcode en daarna
   * 2 tot 14 letters en/of cijfers.
   */
  const gevonden =
    genormaliseerd.match(
      /^([A-Z]{2})([A-Z0-9]{2,14})$/,
    );

  if (!gevonden) {
    return false;
  }

  const landcode =
    gevonden[1];

  return EU_LANDCODES.has(
    landcode,
  );
}

export function formatteerOndernemingsnummer(
  waarde: string,
) {
  const genormaliseerd =
    normaliseerOndernemingsnummer(
      waarde,
    );

  if (!genormaliseerd) {
    return "";
  }

  /*
   * Belgische weergave:
   * 0831785193 -> 0831.785.193
   */
  if (
    /^[0-9]{10}$/.test(
      genormaliseerd,
    )
  ) {
    return `${genormaliseerd.slice(
      0,
      4,
    )}.${genormaliseerd.slice(
      4,
      7,
    )}.${genormaliseerd.slice(7)}`;
  }

  return genormaliseerd;
}

export function ondernemingsnummerFoutmelding() {
  return "Vul een Belgisch ondernemingsnummer van 9 of 10 cijfers in, eventueel voorafgegaan door BE, of een geldig EU-btw-nummer met landcode.";
}

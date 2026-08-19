const TOEGESTANE_TEKENS =
  /^[+\d\s()./-]+$/;

const INTERNATIONAAL_FORMAAT =
  /^\+[1-9]\d{7,14}$/;

/**
 * Zet een telefoonnummer om naar een compact internationaal formaat.
 *
 * Voorbeelden:
 * - 0488 90 78 67       -> +32488907867
 * - 0488/90.78.67       -> +32488907867
 * - 0032 488 90 78 67   -> +32488907867
 * - +32 (0)488 90 78 67 -> +32488907867
 */
export function normaliseerTelefoonnummer(
  invoer:
    | string
    | null
    | undefined,
): string | null {
  const waarde =
    invoer?.trim() ?? "";

  if (!waarde) {
    return null;
  }

  if (
    !TOEGESTANE_TEKENS.test(
      waarde,
    )
  ) {
    return null;
  }

  let compact =
    waarde.replace(
      /[\s()./-]/g,
      "",
    );

  if (
    compact.startsWith("00")
  ) {
    compact =
      `+${compact.slice(2)}`;
  } else if (
    compact.startsWith("+")
  ) {
    // Het nummer heeft al een internationale prefix.
  } else if (
    compact.startsWith("0")
  ) {
    compact =
      `+32${compact.slice(1)}`;
  } else if (
    compact.startsWith("32")
  ) {
    compact =
      `+${compact}`;
  } else if (
    /^\d+$/.test(compact)
  ) {
    compact =
      `+32${compact}`;
  } else {
    return null;
  }

  if (
    compact.startsWith(
      "+320",
    )
  ) {
    compact =
      `+32${compact.slice(4)}`;
  }

  if (
    !INTERNATIONAAL_FORMAAT.test(
      compact,
    )
  ) {
    return null;
  }

  return compact;
}

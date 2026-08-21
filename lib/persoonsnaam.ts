function verdeelPersoonsnaam(
  naam: string,
) {
  const genormaliseerd =
    naam
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("nl-BE")
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " ",
      )
      .trim()
      .replace(/\s+/g, " ");

  return genormaliseerd
    ? genormaliseerd.split(" ")
    : [];
}

function isDeelreeks(
  kortereNaam: string[],
  langereNaam: string[],
) {
  let kortereIndex = 0;

  for (
    const naamdeel of langereNaam
  ) {
    if (
      naamdeel ===
      kortereNaam[kortereIndex]
    ) {
      kortereIndex += 1;
    }

    if (
      kortereIndex ===
      kortereNaam.length
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Vergelijkt persoonsnamen zonder
 * typefouten toe te staan.
 *
 * Wel toegestaan:
 * - verschillen in hoofdletters;
 * - accenten en leestekens;
 * - extra of ontbrekende middennamen;
 * - extra of ontbrekende initialen.
 *
 * De eerste en laatste naamdelen moeten
 * altijd exact overeenkomen. De kortere
 * naam moet daarnaast in dezelfde volgorde
 * voorkomen in de langere naam.
 */
export function komenPersoonsnamenOvereen(
  eersteNaam: string,
  tweedeNaam: string,
) {
  const eersteNaamdelen =
    verdeelPersoonsnaam(
      eersteNaam,
    );

  const tweedeNaamdelen =
    verdeelPersoonsnaam(
      tweedeNaam,
    );

  if (
    eersteNaamdelen.length === 0 ||
    tweedeNaamdelen.length === 0
  ) {
    return false;
  }

  const eersteGenormaliseerd =
    eersteNaamdelen.join(" ");

  const tweedeGenormaliseerd =
    tweedeNaamdelen.join(" ");

  if (
    eersteGenormaliseerd ===
    tweedeGenormaliseerd
  ) {
    return true;
  }

  /*
   * Een naam van één woord wordt alleen
   * via de exacte vergelijking hierboven
   * aanvaard.
   */
  if (
    eersteNaamdelen.length < 2 ||
    tweedeNaamdelen.length < 2
  ) {
    return false;
  }

  /*
   * Wanneer beide namen evenveel delen
   * hebben maar niet exact gelijk zijn,
   * is er geen sprake van alleen een
   * ontbrekende middennaam of initiaal.
   */
  if (
    eersteNaamdelen.length ===
    tweedeNaamdelen.length
  ) {
    return false;
  }

  const eersteVoornaam =
    eersteNaamdelen[0];

  const tweedeVoornaam =
    tweedeNaamdelen[0];

  const eersteLaatsteNaamdeel =
    eersteNaamdelen.at(-1);

  const tweedeLaatsteNaamdeel =
    tweedeNaamdelen.at(-1);

  if (
    eersteVoornaam !==
      tweedeVoornaam ||
    eersteLaatsteNaamdeel !==
      tweedeLaatsteNaamdeel
  ) {
    return false;
  }

  const kortereNaam =
    eersteNaamdelen.length <
    tweedeNaamdelen.length
      ? eersteNaamdelen
      : tweedeNaamdelen;

  const langereNaam =
    eersteNaamdelen.length <
    tweedeNaamdelen.length
      ? tweedeNaamdelen
      : eersteNaamdelen;

  return isDeelreeks(
    kortereNaam,
    langereNaam,
  );
}

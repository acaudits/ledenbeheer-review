import "server-only";

const GEOLOCATIE =
  "https://geo.api.vlaanderen.be/geolocation/v4";

const ADRESSENREGISTER =
  "https://api.basisregisters.vlaanderen.be/v2/adressen";

export type AdresOptie = {
  waarde: string;
  label: string;
};

export type GeopuntLocatie = {
  id: string | null;
  geformatteerdAdres: string;
  straat: string;
  huisnummer: string;
  postcode: string | null;
  gemeente: string;
  latitude: number | null;
  longitude: number | null;
};

type GeoRecord = {
  Municipality?: unknown;
  Zipcode?: unknown;
  Thoroughfarename?: unknown;
  Housenumber?: unknown;
  ID?: unknown;
  Location?: {
    Lat_WGS84?: unknown;
    Lon_WGS84?: unknown;
  };
};

function tekst(waarde: unknown) {
  return typeof waarde === "string"
    ? waarde.trim()
    : "";
}

function gelijk(
  links: string,
  rechts: string,
) {
  return links.localeCompare(
    rechts,
    "nl",
    {
      sensitivity: "base",
    },
  ) === 0;
}

async function wacht(
  milliseconden: number,
) {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconden,
      );
    },
  );
}

async function fetchMetNieuwePogingen(
  url: URL,
  accept: string,
  dienst: string,
) {
  let laatsteFout: unknown;

  for (
    let poging = 1;
    poging <= 3;
    poging += 1
  ) {
    try {
      const antwoord = await fetch(
        url,
        {
          headers: {
            Accept: accept,
          },
          cache: "no-store",
          signal:
            AbortSignal.timeout(
              7000,
            ),
        },
      );

      if (antwoord.ok) {
        return antwoord;
      }

      laatsteFout = new Error(
        `${dienst} antwoordde met status ${antwoord.status}.`,
      );
    } catch (fout) {
      laatsteFout = fout;
    }

    if (poging < 3) {
      await wacht(
        poging * 350,
      );
    }
  }

  throw new Error(
    `${dienst} is na drie pogingen niet bereikbaar.`,
    {
      cause: laatsteFout,
    },
  );
}

async function locaties(
  zoektekst: string,
  type:
    | "Municipality"
    | "Thoroughfarename"
    | "Housenumber",
) {
  const url = new URL(
    `${GEOLOCATIE}/Location`,
  );

  url.searchParams.set("q", zoektekst);
  url.searchParams.set("type", type);
  url.searchParams.set("c", "5");

  const antwoord =
    await fetchMetNieuwePogingen(
      url,
      "application/json",
      "GeoPunt",
    );

  const data = (await antwoord.json()) as {
    LocationResult?: unknown;
  };

  if (!Array.isArray(data.LocationResult)) {
    return [];
  }

  return data.LocationResult.filter(
    (record): record is GeoRecord =>
      Boolean(
        record &&
          typeof record === "object",
      ),
  );
}

function uniekeOpties(
  waarden: string[],
) {
  return Array.from(
    new Set(
      waarden.filter(Boolean),
    ),
  ).map((waarde) => ({
    waarde,
    label: waarde,
  }));
}

export async function zoekGemeenten(
  zoektekst: string,
): Promise<AdresOptie[]> {
  const q = zoektekst.trim();

  if (q.length < 2 || q.length > 100) {
    return [];
  }

  const resultaten =
    await locaties(
      q,
      "Municipality",
    );

  return uniekeOpties(
    resultaten.map((record) =>
      tekst(record.Municipality),
    ),
  );
}

export async function zoekStraten({
  gemeente,
  zoektekst,
}: {
  gemeente: string;
  zoektekst: string;
}): Promise<AdresOptie[]> {
  const plaats = gemeente.trim();
  const q = zoektekst.trim();

  if (
    plaats.length < 2 ||
    q.length < 2
  ) {
    return [];
  }

  const resultaten =
    await locaties(
      `${q}, ${plaats}`,
      "Thoroughfarename",
    );

  return uniekeOpties(
    resultaten
      .filter((record) =>
        gelijk(
          tekst(record.Municipality),
          plaats,
        ),
      )
      .map((record) =>
        tekst(
          record.Thoroughfarename,
        ),
      ),
  );
}

export async function zoekHuisnummers({
  gemeente,
  straat,
  zoektekst,
}: {
  gemeente: string;
  straat: string;
  zoektekst: string;
}): Promise<AdresOptie[]> {
  const plaats = gemeente.trim();
  const straatnaam = straat.trim();
  const q = zoektekst.trim();

  if (
    plaats.length < 2 ||
    straatnaam.length < 2 ||
    q.length < 1
  ) {
    return [];
  }

  const resultaten =
    await locaties(
      `${straatnaam} ${q}, ${plaats}`,
      "Housenumber",
    );

  return uniekeOpties(
    resultaten
      .filter(
        (record) =>
          gelijk(
            tekst(
              record.Municipality,
            ),
            plaats,
          ) &&
          gelijk(
            tekst(
              record.Thoroughfarename,
            ),
            straatnaam,
          ),
      )
      .map((record) =>
        tekst(record.Housenumber),
      ),
  );
}

export async function zoekBusnummers({
  gemeente,
  straat,
  huisnummer,
}: {
  gemeente: string;
  straat: string;
  huisnummer: string;
}): Promise<AdresOptie[]> {
  const url = new URL(
    ADRESSENREGISTER,
  );

  url.searchParams.set(
    "gemeenteNaam",
    gemeente.trim(),
  );
  url.searchParams.set(
    "straatnaam",
    straat.trim(),
  );
  url.searchParams.set(
    "huisnummer",
    huisnummer.trim(),
  );
  url.searchParams.set("limit", "100");

  const antwoord =
    await fetchMetNieuwePogingen(
      url,
      "application/ld+json",
      "Adressenregister",
    );

  const data = (await antwoord.json()) as {
    adressen?: unknown;
  };

  if (!Array.isArray(data.adressen)) {
    return [];
  }

  const busnummers =
    data.adressen
      .filter(
        (
          record,
        ): record is Record<
          string,
          unknown
        > =>
          Boolean(
            record &&
              typeof record ===
                "object",
          ),
      )
      .filter(
        (record) =>
          tekst(record.adresStatus) ===
            "inGebruik" &&
          tekst(record.huisnummer) ===
            huisnummer.trim(),
      )
      .map((record) =>
        tekst(record.busnummer),
      );

  return uniekeOpties(busnummers);
}

export async function valideerAdres({
  gemeente,
  straat,
  huisnummer,
  busnummer,
}: {
  gemeente: string;
  straat: string;
  huisnummer: string;
  busnummer: string;
}): Promise<GeopuntLocatie | null> {
  const plaats = gemeente.trim();
  const straatnaam = straat.trim();
  const nummer = huisnummer.trim();

  const resultaten =
    await locaties(
      `${straatnaam} ${nummer}, ${plaats}`,
      "Housenumber",
    );

  const resultaat =
    resultaten.find(
      (record) =>
        gelijk(
          tekst(record.Municipality),
          plaats,
        ) &&
        gelijk(
          tekst(
            record.Thoroughfarename,
          ),
          straatnaam,
        ) &&
        tekst(record.Housenumber) ===
          nummer,
    );

  if (!resultaat) {
    return null;
  }

  const bus = busnummer.trim();

  if (bus) {
    const bussen =
      await zoekBusnummers({
        gemeente: plaats,
        straat: straatnaam,
        huisnummer: nummer,
      });

    if (
      !bussen.some((optie) =>
        gelijk(optie.waarde, bus),
      )
    ) {
      return null;
    }
  }

  const postcode =
    tekst(resultaat.Zipcode);

  const location =
    resultaat.Location ?? {};

  const latitude =
    typeof location.Lat_WGS84 ===
      "number" &&
    Number.isFinite(
      location.Lat_WGS84,
    )
      ? location.Lat_WGS84
      : null;

  const longitude =
    typeof location.Lon_WGS84 ===
      "number" &&
    Number.isFinite(
      location.Lon_WGS84,
    )
      ? location.Lon_WGS84
      : null;

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  const busTekst =
    bus ? ` bus ${bus}` : "";

  return {
    id:
      typeof resultaat.ID ===
        "string" ||
      typeof resultaat.ID ===
        "number"
        ? String(resultaat.ID)
        : null,
    geformatteerdAdres:
      `${straatnaam} ${nummer}${busTekst}, ${postcode ? `${postcode} ` : ""}${plaats}`,
    straat: straatnaam,
    huisnummer: nummer,
    postcode: postcode || null,
    gemeente: plaats,
    latitude,
    longitude,
  };
}

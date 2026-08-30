export type BeheerTabelWaarde =
  | string
  | number
  | boolean
  | null
  | undefined;

export type BeheerTabelRij = {
  id: string | number;
  [sleutel: string]:
    BeheerTabelWaarde;
};

export type BeheerTabelKolom = {
  sleutel: string;
  label: string;
  type?:
    | "tekst"
    | "datum"
    | "boolean"
    | "url"
    | "badge";
};

export type BeheerTabelSortering = {
  sleutel: string;
  richting:
    | "oplopend"
    | "aflopend";
} | null;

export type BeheerDatumFilter = {
  jaar: string;
  maand: string;
};

export function wijzigBeheerSortering(
  huidige:
    BeheerTabelSortering,
  sleutel: string,
): BeheerTabelSortering {
  if (
    !huidige ||
    huidige.sleutel !== sleutel
  ) {
    return {
      sleutel,
      richting: "oplopend",
    };
  }

  if (
    huidige.richting ===
    "oplopend"
  ) {
    return {
      sleutel,
      richting: "aflopend",
    };
  }

  return null;
}

export function ontleedBeheerDatum(
  waarde: BeheerTabelWaarde,
) {
  const tekst =
    String(waarde ?? "").trim();

  const belgisch =
    tekst.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:,?\s+\d{1,2}:\d{2})?$/,
    );

  if (belgisch) {
    const dag =
      belgisch[1].padStart(
        2,
        "0",
      );

    const maand =
      belgisch[2].padStart(
        2,
        "0",
      );

    const jaar =
      belgisch[3];

    return {
      dag,
      maand,
      jaar,
      tijdstip: Date.UTC(
        Number(jaar),
        Number(maand) - 1,
        Number(dag),
      ),
    };
  }

  const iso =
    tekst.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (iso) {
    return {
      dag: iso[3],
      maand: iso[2],
      jaar: iso[1],
      tijdstip: Date.UTC(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
      ),
    };
  }

  return null;
}

function vergelijkWaarden(
  eerste: BeheerTabelWaarde,
  tweede: BeheerTabelWaarde,
  type:
    BeheerTabelKolom["type"],
) {
  const eersteLeeg =
    eerste === null ||
    eerste === undefined ||
    String(eerste).trim() === "";

  const tweedeLeeg =
    tweede === null ||
    tweede === undefined ||
    String(tweede).trim() === "";

  if (
    eersteLeeg &&
    tweedeLeeg
  ) {
    return 0;
  }

  if (eersteLeeg) {
    return 1;
  }

  if (tweedeLeeg) {
    return -1;
  }

  if (type === "datum") {
    const eersteDatum =
      ontleedBeheerDatum(eerste);

    const tweedeDatum =
      ontleedBeheerDatum(tweede);

    if (
      eersteDatum &&
      tweedeDatum
    ) {
      return (
        eersteDatum.tijdstip -
        tweedeDatum.tijdstip
      );
    }
  }

  if (
    typeof eerste === "number" &&
    typeof tweede === "number"
  ) {
    return eerste - tweede;
  }

  return String(eerste).localeCompare(
    String(tweede),
    "nl-BE",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

type FilterOpties = {
  zoekterm: string;
  filters:
    Record<string, string>;
  datumFilters:
    Record<
      string,
      BeheerDatumFilter
    >;
  sortering:
    BeheerTabelSortering;
};

const EXCEL_FILTER_PREFIX =
  "__excel__";

function voldoetAanExcelFilter(
  waarde: BeheerTabelWaarde,
  filter: string,
) {
  if (
    !filter.startsWith(
      EXCEL_FILTER_PREFIX,
    )
  ) {
    return null;
  }

  try {
    const inhoud = JSON.parse(
      decodeURIComponent(
        filter.slice(
          EXCEL_FILTER_PREFIX.length,
        ),
      ),
    ) as {
      modus?: unknown;
      waarden?: unknown;
      legeCellenGeselecteerd?: unknown;
    };

    if (
      (
        inhoud.modus !==
          "insluiten" &&
        inhoud.modus !==
          "uitsluiten"
      ) ||
      !Array.isArray(
        inhoud.waarden,
      ) ||
      !inhoud.waarden.every(
        (item) =>
          typeof item ===
          "string",
      ) ||
      typeof inhoud
        .legeCellenGeselecteerd !==
        "boolean"
    ) {
      return false;
    }

    const tekst =
      String(
        waarde ?? "",
      ).trim();

    if (!tekst) {
      return inhoud
        .legeCellenGeselecteerd;
    }

    const aanwezig =
      inhoud.waarden.includes(
        tekst,
      );

    return inhoud.modus ===
      "insluiten"
      ? aanwezig
      : !aanwezig;
  } catch {
    return false;
  }
}

export function filterEnSorteerBeheerRijen<
  Rij extends BeheerTabelRij,
>(
  rijen: Rij[],
  kolommen: BeheerTabelKolom[],
  opties: FilterOpties,
) {
  const algemeneZoekterm =
    opties.zoekterm
      .trim()
      .toLocaleLowerCase(
        "nl-BE",
      );

  const resultaat =
    rijen.filter((rij) => {
      if (
        algemeneZoekterm &&
        !kolommen.some(
          (kolom) =>
            String(
              rij[
                kolom.sleutel
              ] ?? "",
            )
              .toLocaleLowerCase(
                "nl-BE",
              )
              .includes(
                algemeneZoekterm,
              ),
        )
      ) {
        return false;
      }

      return kolommen.every(
        (kolom) => {
          const excelFilter =
            voldoetAanExcelFilter(
              rij[
                kolom.sleutel
              ],
              opties.filters[
                kolom.sleutel
              ] ?? "",
            );

          if (
            excelFilter !== null
          ) {
            return excelFilter;
          }

          if (
            kolom.type ===
            "datum"
          ) {
            const filter =
              opties.datumFilters[
                kolom.sleutel
              ];

            if (
              !filter?.jaar &&
              !filter?.maand
            ) {
              return true;
            }

            const datum =
              ontleedBeheerDatum(
                rij[
                  kolom.sleutel
                ],
              );

            if (!datum) {
              return false;
            }

            if (
              filter.jaar &&
              datum.jaar !==
                filter.jaar
            ) {
              return false;
            }

            if (
              filter.maand &&
              datum.maand !==
                filter.maand
            ) {
              return false;
            }

            return true;
          }

          const filter =
            opties.filters[
              kolom.sleutel
            ]
              ?.trim()
              .toLocaleLowerCase(
                "nl-BE",
              ) ?? "";

          if (!filter) {
            return true;
          }

          return String(
            rij[
              kolom.sleutel
            ] ?? "",
          )
            .toLocaleLowerCase(
              "nl-BE",
            )
            .includes(filter);
        },
      );
    });

  if (!opties.sortering) {
    return resultaat;
  }

  const kolom =
    kolommen.find(
      (item) =>
        item.sleutel ===
        opties.sortering
          ?.sleutel,
    );

  if (!kolom) {
    return resultaat;
  }

  return [...resultaat].sort(
    (eerste, tweede) => {
      const vergelijking =
        vergelijkWaarden(
          eerste[
            kolom.sleutel
          ],
          tweede[
            kolom.sleutel
          ],
          kolom.type,
        );

      return opties
        .sortering
        ?.richting ===
        "oplopend"
        ? vergelijking
        : -vergelijking;
    },
  );
}

export function beschikbareBeheerJaren<
  Rij extends BeheerTabelRij,
>(
  rijen: Rij[],
  sleutel: string,
) {
  const jaren =
    new Set<string>();

  for (const rij of rijen) {
    const datum =
      ontleedBeheerDatum(
        rij[sleutel],
      );

    if (datum) {
      jaren.add(datum.jaar);
    }
  }

  return Array.from(
    jaren,
  ).sort(
    (eerste, tweede) =>
      Number(tweede) -
      Number(eerste),
  );
}

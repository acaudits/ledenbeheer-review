import "server-only";

const STANDAARD_LIMIET = 50;
const MAXIMALE_LIMIET = 100;
const MAXIMALE_ZOEKLENGTE = 100;
const MAXIMALE_CURSORLENGTE = 1024;
const MAXIMALE_CURSORWAARDELENGTE = 300;

export type Sorteerrichting =
  | "asc"
  | "desc";

export type CursorWaarde =
  | string
  | number
  | null;

export type TabelCursor = {
  versie: 1;
  id: number;
  waarde: CursorWaarde;
};

type TabelAanvraagOpties<
  Sortering extends string,
> = {
  toegelatenSorteringen:
    readonly Sortering[];
  standaardSortering:
    Sortering;
  standaardRichting?:
    Sorteerrichting;
  standaardLimiet?: number;
};

export type TabelAanvraag<
  Sortering extends string,
> = {
  zoekterm: string;
  sortering: Sortering;
  richting: Sorteerrichting;
  limiet: number;
  cursor: TabelCursor | null;
};

export class OngeldigePagineringFout
  extends Error {
  constructor(
    message =
      "De pagineringsparameters zijn ongeldig.",
  ) {
    super(message);
    this.name =
      "OngeldigePagineringFout";
  }
}

function normaliseerZoekterm(
  waarde: string,
) {
  return waarde
    .replace(/\s+/g, " ")
    .trim();
}

function leesLimiet(
  waarde: string | null,
  standaardLimiet: number,
) {
  if (waarde === null || waarde === "") {
    return standaardLimiet;
  }

  if (!/^\d+$/.test(waarde)) {
    throw new OngeldigePagineringFout(
      "De paginalimiet is ongeldig.",
    );
  }

  const limiet =
    Number(waarde);

  if (
    !Number.isInteger(limiet) ||
    limiet < 1 ||
    limiet > MAXIMALE_LIMIET
  ) {
    throw new OngeldigePagineringFout(
      `De paginalimiet moet tussen 1 en ${MAXIMALE_LIMIET} liggen.`,
    );
  }

  return limiet;
}

function isGeldigeCursorWaarde(
  waarde: unknown,
): waarde is CursorWaarde {
  if (waarde === null) {
    return true;
  }

  if (
    typeof waarde === "number"
  ) {
    return Number.isFinite(
      waarde,
    );
  }

  return (
    typeof waarde === "string" &&
    waarde.length <=
      MAXIMALE_CURSORWAARDELENGTE
  );
}

function heeftExacteCursorsleutels(
  waarde: Record<string, unknown>,
) {
  const sleutels =
    Object.keys(waarde)
      .sort()
      .join(",");

  return (
    sleutels ===
    "id,versie,waarde"
  );
}

export function maakTabelCursor({
  id,
  waarde,
}: {
  id: number;
  waarde: CursorWaarde;
}) {
  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !isGeldigeCursorWaarde(
      waarde,
    )
  ) {
    throw new OngeldigePagineringFout(
      "De cursor kan niet worden aangemaakt.",
    );
  }

  const cursor: TabelCursor = {
    versie: 1,
    id,
    waarde,
  };

  return Buffer
    .from(
      JSON.stringify(cursor),
      "utf8",
    )
    .toString("base64url");
}

export function leesTabelCursor(
  gecodeerdeCursor:
    string | null,
) {
  if (
    gecodeerdeCursor === null ||
    gecodeerdeCursor === ""
  ) {
    return null;
  }

  if (
    gecodeerdeCursor.length >
      MAXIMALE_CURSORLENGTE ||
    !/^[A-Za-z0-9_-]+$/.test(
      gecodeerdeCursor,
    )
  ) {
    throw new OngeldigePagineringFout(
      "De cursor is ongeldig.",
    );
  }

  try {
    const json =
      Buffer
        .from(
          gecodeerdeCursor,
          "base64url",
        )
        .toString("utf8");

    if (
      json.length >
      MAXIMALE_CURSORLENGTE
    ) {
      throw new Error(
        "Cursorinhoud is te groot.",
      );
    }

    const onbekend =
      JSON.parse(json) as unknown;

    if (
      typeof onbekend !== "object" ||
      onbekend === null
    ) {
      throw new Error(
        "Cursor is geen object.",
      );
    }

    const cursor =
      onbekend as Record<
        string,
        unknown
      >;

    if (
      !heeftExacteCursorsleutels(
        cursor,
      ) ||
      cursor.versie !== 1 ||
      !Number.isInteger(
        cursor.id,
      ) ||
      Number(cursor.id) <= 0 ||
      !isGeldigeCursorWaarde(
        cursor.waarde,
      )
    ) {
      throw new Error(
        "Cursorvelden zijn ongeldig.",
      );
    }

    return {
      versie: 1,
      id: Number(cursor.id),
      waarde:
        cursor.waarde,
    } satisfies TabelCursor;
  } catch {
    throw new OngeldigePagineringFout(
      "De cursor is ongeldig of verlopen.",
    );
  }
}

export function leesTabelAanvraag<
  Sortering extends string,
>(
  url: URL,
  opties:
    TabelAanvraagOpties<Sortering>,
): TabelAanvraag<Sortering> {
  const zoekterm =
    normaliseerZoekterm(
      url.searchParams.get("q") ??
        "",
    );

  if (
    zoekterm.length >
    MAXIMALE_ZOEKLENGTE
  ) {
    throw new OngeldigePagineringFout(
      `De zoekterm mag maximaal ${MAXIMALE_ZOEKLENGTE} tekens bevatten.`,
    );
  }

  const sorteerParameter =
    url.searchParams.get(
      "sortering",
    );

  const sortering =
    sorteerParameter &&
    opties.toegelatenSorteringen
      .some(
        (waarde) =>
          waarde ===
          sorteerParameter,
      )
      ? (
          sorteerParameter as
            Sortering
        )
      : opties
          .standaardSortering;

  const richtingParameter =
    url.searchParams.get(
      "richting",
    );

  const richting:
    Sorteerrichting =
      richtingParameter ===
        "asc" ||
      richtingParameter ===
        "desc"
        ? richtingParameter
        : (
            opties
              .standaardRichting ??
            "asc"
          );

  const standaardLimiet =
    opties.standaardLimiet ??
    STANDAARD_LIMIET;

  if (
    !Number.isInteger(
      standaardLimiet,
    ) ||
    standaardLimiet < 1 ||
    standaardLimiet >
      MAXIMALE_LIMIET
  ) {
    throw new Error(
      "De serverconfiguratie voor paginering is ongeldig.",
    );
  }

  const limiet =
    leesLimiet(
      url.searchParams.get(
        "limiet",
      ),
      standaardLimiet,
    );

  const cursor =
    leesTabelCursor(
      url.searchParams.get(
        "cursor",
      ),
    );

  return {
    zoekterm,
    sortering,
    richting,
    limiet,
    cursor,
  };
}

export const GEEN_TABEL_CACHE = {
  "Cache-Control":
    "private, no-store, max-age=0",
  "X-Content-Type-Options":
    "nosniff",
};

import "server-only";

import { Prisma } from "../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PROCESCERTIFICAAT_SORTERINGEN,
  type ProcescertificaatLijstcontract,
  type ProcescertificaatSorteercriterium,
  type ProcescertificaatSortering,
} from "@/lib/procescertificaat-lijstcontract";
import { OngeldigePagineringFout } from "@/lib/server-paginering";

export type ProcescertificaatSelectieRij = {
  id: number;
  aantalTotaal: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract: ProcescertificaatLijstcontract;
  sorteringen: ProcescertificaatSorteercriterium[];
  limiet: number;
  cursorId: number | null;
};

function tekstBevat(expressie: Prisma.Sql, waarde: string) {
  return Prisma.sql`
    STRPOS(
      LOWER(
        COALESCE(
          (${expressie})::text,
          ''
        )
      ),
      LOWER(${waarde})
    ) > 0
  `;
}

function normaliseerOndernemingsnummerExpressie(expressie: Prisma.Sql) {
  const compact = Prisma.sql`
    REGEXP_REPLACE(
      UPPER(
        COALESCE(
          (${expressie})::text,
          ''
        )
      ),
      '[^A-Z0-9]',
      '',
      'g'
    )
  `;

  return Prisma.sql`
    CASE
      WHEN
        ${compact} ~
        '^BE[0-9]{9,10}$'
      THEN LPAD(
        SUBSTRING(
          ${compact}
          FROM 3
        ),
        10,
        '0'
      )
      WHEN
        ${compact} ~
        '^[0-9]{9,10}$'
      THEN LPAD(
        ${compact},
        10,
        '0'
      )
      ELSE ${compact}
    END
  `;
}

function ondernemingsnummerBevat(expressie: Prisma.Sql, waarde: string) {
  const genormaliseerdeExpressie =
    normaliseerOndernemingsnummerExpressie(expressie);

  const genormaliseerdeWaarde = normaliseerOndernemingsnummerExpressie(
    Prisma.sql`${waarde}`,
  );

  return Prisma.sql`
    STRPOS(
      ${genormaliseerdeExpressie},
      ${genormaliseerdeWaarde}
    ) > 0
  `;
}

const EXCEL_FILTER_PREFIX = "__excel__";

type ExcelWaardeFilter = {
  modus: "insluiten" | "uitsluiten";
  waarden: string[];
  legeCellenGeselecteerd: boolean;
};

function leesExcelWaardeFilter(waarde: string): ExcelWaardeFilter | null {
  if (!waarde.startsWith(EXCEL_FILTER_PREFIX)) {
    return null;
  }

  try {
    const inhoud = JSON.parse(
      decodeURIComponent(waarde.slice(EXCEL_FILTER_PREFIX.length)),
    ) as unknown;

    if (typeof inhoud !== "object" || inhoud === null) {
      throw new Error("Ongeldige filterinhoud.");
    }

    const kandidaat = inhoud as Record<string, unknown>;

    if (
      (kandidaat.modus !== "insluiten" && kandidaat.modus !== "uitsluiten") ||
      !Array.isArray(kandidaat.waarden) ||
      typeof kandidaat.legeCellenGeselecteerd !== "boolean"
    ) {
      throw new Error("Ongeldige filtervelden.");
    }

    if (kandidaat.waarden.length > 250) {
      throw new Error("Te veel filterwaarden.");
    }

    const waarden = kandidaat.waarden.map((item) => {
      if (typeof item !== "string" || item.length > 500) {
        throw new Error("Ongeldige filterwaarde.");
      }

      return item.trim();
    });

    return {
      modus: kandidaat.modus,
      waarden: Array.from(new Set(waarden.filter((item) => item !== ""))),
      legeCellenGeselecteerd: kandidaat.legeCellenGeselecteerd,
    };
  } catch {
    throw new OngeldigePagineringFout(
      "De gekozen Excel-filterwaarden zijn ongeldig.",
    );
  }
}

function maakTekstfilter(expressie: Prisma.Sql, waarde: string) {
  if (!waarde) {
    return Prisma.empty;
  }

  const excelFilter = leesExcelWaardeFilter(waarde);

  if (!excelFilter) {
    return Prisma.sql`
      AND ${tekstBevat(expressie, waarde)}
    `;
  }

  const genormaliseerdeExpressie = Prisma.sql`
      COALESCE(
        NULLIF(
          BTRIM(
            (${expressie})::text
          ),
          ''
        ),
        ''
      )
    `;

  if (excelFilter.modus === "insluiten") {
    const voorwaarden: Prisma.Sql[] = [];

    if (excelFilter.waarden.length > 0) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerdeExpressie}
          IN (${Prisma.join(excelFilter.waarden)})
        `,
      );
    }

    if (excelFilter.legeCellenGeselecteerd) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerdeExpressie} = ''
        `,
      );
    }

    if (voorwaarden.length === 0) {
      return Prisma.sql`AND FALSE`;
    }

    return Prisma.sql`
      AND (
        ${Prisma.join(voorwaarden, " OR ")}
      )
    `;
  }

  const voorwaarden: Prisma.Sql[] = [];

  if (excelFilter.waarden.length > 0) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerdeExpressie}
        NOT IN (${Prisma.join(excelFilter.waarden)})
      `,
    );
  }

  if (!excelFilter.legeCellenGeselecteerd) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerdeExpressie} <> ''
      `,
    );
  }

  if (voorwaarden.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`
    AND (
      ${Prisma.join(voorwaarden, " AND ")}
    )
  `;
}

function ondernemingstypeExpressie() {
  return Prisma.sql`
    CASE
      WHEN
        p."ondernemingstype"::text =
        'EENMANSZAAK'
      THEN 'Eenmanszaak'
      ELSE 'Bedrijf'
    END
  `;
}

function sorteerExpressie(sortering: ProcescertificaatSortering) {
  switch (sortering) {
    case "bedrijf":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            p."naam_bedrijf"
          ),
          ''
        )
      `;

    case "kboNummer":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            p."kbo_nummer"
          ),
          ''
        )
      `;

    case "certificaatnummer":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            p."certificaatnummer"
          ),
          ''
        )
      `;

    case "uitgereiktOp":
      return Prisma.sql`
        p."uitgereikt_op"
      `;

    case "oneDrive":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            p."onedrive_url"
          ),
          ''
        )
      `;

    case "opmerking":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            p."opmerking"
          ),
          ''
        )
      `;

    case "ondernemingstype":
      return ondernemingstypeExpressie();
  }
}

function valideerInvoer({
  sorteringen,
  limiet,
  cursorId,
}: Pick<SelectieInvoer, "sorteringen" | "limiet" | "cursorId">) {
  if (!Number.isInteger(limiet) || limiet < 1 || limiet > 50) {
    throw new Error(
      "De interne paginalimiet voor procescertificaten is ongeldig.",
    );
  }

  if (
    sorteringen.length < 1 ||
    sorteringen.length > PROCESCERTIFICAAT_SORTERINGEN.length
  ) {
    throw new Error(
      "De interne sortering voor procescertificaten is ongeldig.",
    );
  }

  const gezien = new Set<ProcescertificaatSortering>();

  for (const sortering of sorteringen) {
    if (
      !PROCESCERTIFICAAT_SORTERINGEN.includes(sortering.sleutel) ||
      (sortering.richting !== "asc" && sortering.richting !== "desc") ||
      gezien.has(sortering.sleutel)
    ) {
      throw new Error(
        "De interne sortering voor procescertificaten is ongeldig.",
      );
    }

    gezien.add(sortering.sleutel);
  }

  if (cursorId !== null && (!Number.isInteger(cursorId) || cursorId < 1)) {
    throw new Error("De interne cursor voor procescertificaten is ongeldig.");
  }
}

export function laadProcescertificaatSelectie({
  zoekterm,
  contract,
  sorteringen,
  limiet,
  cursorId,
}: SelectieInvoer) {
  valideerInvoer({
    sorteringen,
    limiet,
    cursorId,
  });

  const typeExpressie = ondernemingstypeExpressie();

  const algemeneZoekfilter = zoekterm
    ? Prisma.sql`
          AND (
            ${tekstBevat(
              Prisma.sql`
                p."naam_bedrijf"
              `,
              zoekterm,
            )}
            OR
            ${ondernemingsnummerBevat(
              Prisma.sql`
                p."kbo_nummer"
              `,
              zoekterm,
            )}
            OR
            ${tekstBevat(
              Prisma.sql`
                p."certificaatnummer"
              `,
              zoekterm,
            )}
            OR
            ${tekstBevat(
              Prisma.sql`
                TO_CHAR(
                  p."uitgereikt_op",
                  'DD/MM/YYYY'
                )
              `,
              zoekterm,
            )}
            OR
            ${tekstBevat(
              Prisma.sql`
                p."onedrive_url"
              `,
              zoekterm,
            )}
            OR
            ${tekstBevat(
              Prisma.sql`
                p."opmerking"
              `,
              zoekterm,
            )}
            OR
            ${tekstBevat(typeExpressie, zoekterm)}
          )
        `
    : Prisma.empty;

  const { tekstfilters, uitgereiktJaar, uitgereiktMaand } = contract;

  const kboExpressie = Prisma.sql`
      p."kbo_nummer"
    `;

  const kboFilter = !tekstfilters.kboNummer
    ? Prisma.empty
    : leesExcelWaardeFilter(tekstfilters.kboNummer)
      ? maakTekstfilter(kboExpressie, tekstfilters.kboNummer)
      : Prisma.sql`
            AND ${ondernemingsnummerBevat(kboExpressie, tekstfilters.kboNummer)}
          `;

  const jaarFilter =
    uitgereiktJaar === null
      ? Prisma.empty
      : Prisma.sql`
          AND EXTRACT(
            YEAR FROM
              p."uitgereikt_op"
          ) = ${uitgereiktJaar}
        `;

  const maandFilter =
    uitgereiktMaand === null
      ? Prisma.empty
      : Prisma.sql`
          AND EXTRACT(
            MONTH FROM
              p."uitgereikt_op"
          ) = ${uitgereiktMaand}
        `;

  const sorteerDelen = sorteringen.map((sortering) => {
    const expressie = sorteerExpressie(sortering.sleutel);

    const richting =
      sortering.richting === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    return Prisma.sql`
          CASE
            WHEN
              ${expressie} IS NULL
              OR BTRIM(
                (${expressie})::text
              ) = ''
            THEN 1
            ELSE 0
          END ASC,
          ${expressie} ${richting}
        `;
  });

  const sorteerVolgorde = Prisma.join(sorteerDelen, ", ");

  const cursorVoorwaarde =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          WHERE g."positie" > (
            SELECT
              anker."positie"
            FROM
              gerangschikt anker
            WHERE
              anker.id = ${cursorId}
          )
        `;

  const query = Prisma.sql`
    WITH gerangschikt AS (
      SELECT
        p.id AS id,
        COUNT(*) OVER()::integer
          AS "aantalTotaal",
        ROW_NUMBER() OVER (
          ORDER BY
            ${sorteerVolgorde},
            p.id ASC
        ) AS "positie"
      FROM
        "procescertificaten" p
      WHERE
        p."verwijderd_op" IS NULL
        ${algemeneZoekfilter}
        ${maakTekstfilter(
          Prisma.sql`
            p."naam_bedrijf"
          `,
          tekstfilters.bedrijf,
        )}
        ${kboFilter}
        ${maakTekstfilter(
          Prisma.sql`
            p."certificaatnummer"
          `,
          tekstfilters.certificaatnummer,
        )}
        ${maakTekstfilter(
          Prisma.sql`
            p."onedrive_url"
          `,
          tekstfilters.oneDrive,
        )}
        ${maakTekstfilter(
          Prisma.sql`
            p."opmerking"
          `,
          tekstfilters.opmerking,
        )}
        ${maakTekstfilter(typeExpressie, tekstfilters.ondernemingstype)}
        ${jaarFilter}
        ${maandFilter}
    )
    SELECT
      g.id AS id,
      g."aantalTotaal"
    FROM
      gerangschikt g
    ${cursorVoorwaarde}
    ORDER BY
      g."positie" ASC
    LIMIT ${limiet + 1}
  `;

  return prisma.$queryRaw<ProcescertificaatSelectieRij[]>(query);
}

export type ProcescertificaatFilterwaarde = {
  waarde: string;
  aantal: number;
};

type FilterwaardenInvoer = {
  kolom: "bedrijf" | "kboNummer" | "certificaatnummer" | "ondernemingstype";
  zoekterm: string;
};

export async function laadProcescertificaatFilterwaarden({
  kolom,
  zoekterm,
}: FilterwaardenInvoer) {
  const expressie =
    kolom === "bedrijf"
      ? Prisma.sql`
          p."naam_bedrijf"
        `
      : kolom === "kboNummer"
        ? Prisma.sql`
            p."kbo_nummer"
          `
        : kolom === "certificaatnummer"
          ? Prisma.sql`
              p."certificaatnummer"
            `
          : ondernemingstypeExpressie();

  const zoekfilter = zoekterm
    ? Prisma.sql`
          AND ${tekstBevat(expressie, zoekterm)}
        `
    : Prisma.empty;

  return prisma.$queryRaw<ProcescertificaatFilterwaarde[]>(Prisma.sql`
    SELECT
      BTRIM(
        (${expressie})::text
      ) AS waarde,
      COUNT(*)::integer AS aantal
    FROM
      "procescertificaten" p
    WHERE
      p."verwijderd_op" IS NULL
      AND NULLIF(
        BTRIM(
          (${expressie})::text
        ),
        ''
      ) IS NOT NULL
      ${zoekfilter}
    GROUP BY
      BTRIM(
        (${expressie})::text
      )
    ORDER BY
      BTRIM(
        (${expressie})::text
      ) ASC
    LIMIT 251
  `);
}

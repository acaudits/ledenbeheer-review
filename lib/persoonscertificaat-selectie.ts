import "server-only";

import { Prisma } from "../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { OngeldigePagineringFout } from "@/lib/server-paginering";
import {
  type PersoonscertificaatLijstcontract,
  type PersoonscertificaatSorteercriterium,
  type PersoonscertificaatSortering,
} from "@/lib/persoonscertificaat-lijstcontract";
import { type TargetStatus } from "@/lib/persoonscertificaat-targetselectie";

export type PersoonscertificaatSelectieRij = {
  id: number;
  targetStatus: TargetStatus;
  aantalTotaal: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract: PersoonscertificaatLijstcontract;
  sorteringen: PersoonscertificaatSorteercriterium[];
  limiet: number;
  cursorId: number | null;
};

function tekstBevat(expressie: Prisma.Sql, waarde: string) {
  return Prisma.sql`
    STRPOS(
      LOWER(
        COALESCE(
          ${expressie},
          ''
        )
      ),
      LOWER(${waarde})
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
      throw new Error("Ongeldige Excel-filterinhoud.");
    }

    const kandidaat = inhoud as Record<string, unknown>;

    if (
      (kandidaat.modus !== "insluiten" && kandidaat.modus !== "uitsluiten") ||
      !Array.isArray(kandidaat.waarden) ||
      typeof kandidaat.legeCellenGeselecteerd !== "boolean"
    ) {
      throw new Error("Ongeldige Excel-filtervelden.");
    }

    if (kandidaat.waarden.length > 2000) {
      throw new Error("Te veel Excel-filterwaarden.");
    }

    const waarden = kandidaat.waarden.map((item) => {
      if (typeof item !== "string" || item.length > 500) {
        throw new Error("Ongeldige Excel-filterwaarde.");
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
      return Prisma.sql`
        AND FALSE
      `;
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

function sorteerExpressie(sortering: PersoonscertificaatSortering) {
  switch (sortering) {
    case "naamPersoon":
      return Prisma.sql`
        l."naam_persoon"
      `;

    case "telefoonnummer":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            l."telefoonnummer"
          ),
          ''
        )
      `;

    case "mailadres":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            l."mailadres"
          ),
          ''
        )
      `;

    case "ovamId":
      return Prisma.sql`
        l."ovam_id"
      `;

    case "certificaatnummer":
      return Prisma.sql`
        l."certificaatnummer"
      `;

    case "uitgereiktOp":
      return Prisma.sql`
        TO_CHAR(
          l."uitgereikt_op",
          'YYYY-MM-DD'
        )
      `;

    case "bedrijf":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            l."bedrijf"
          ),
          ''
        )
      `;

    case "aansluiting":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            l."aansluiting"
          ),
          ''
        )
      `;

    case "opmerking":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            l."opmerking"
          ),
          ''
        )
      `;

    case "certificatiePlatform":
      return Prisma.sql`
        NULLIF(
          BTRIM(
            l."certificatie_platform"
          ),
          ''
        )
      `;
  }
}

function valideerInvoer({
  zoekterm,
  sorteringen,
  limiet,
  cursorId,
}: SelectieInvoer) {
  if (typeof zoekterm !== "string" || zoekterm.length > 100) {
    throw new Error("Ongeldige zoekterm in serverselectie.");
  }

  if (
    !Array.isArray(sorteringen) ||
    sorteringen.length === 0 ||
    sorteringen.length > 10 ||
    sorteringen.some(
      (sortering) =>
        sortering.richting !== "asc" && sortering.richting !== "desc",
    )
  ) {
    throw new Error("Ongeldige sorteringen in serverselectie.");
  }

  if (!Number.isInteger(limiet) || limiet < 1 || limiet > 50) {
    throw new Error("Ongeldige limiet in serverselectie.");
  }

  if (cursorId !== null && (!Number.isInteger(cursorId) || cursorId <= 0)) {
    throw new Error("Ongeldige cursor-ID in serverselectie.");
  }
}

export async function laadPersoonscertificaatSelectie(invoer: SelectieInvoer) {
  valideerInvoer(invoer);

  const { zoekterm, contract, sorteringen, limiet, cursorId } = invoer;

  const { tekstfilters, targetStatus, uitgereiktJaar, uitgereiktMaand } =
    contract;

  const sorteerSelecties = Prisma.join(
    sorteringen.map((sortering, index) => {
      const alias = Prisma.raw(`"sorteerWaarde${index}"`);

      return Prisma.sql`
        ${sorteerExpressie(sortering.sleutel)}
        AS ${alias}
      `;
    }),
    ",",
  );

  const sorteerVolgorde = Prisma.join(
    sorteringen.flatMap((sortering, index) => {
      const alias = Prisma.raw(`"sorteerWaarde${index}"`);

      const richtingSql =
        sortering.richting === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

      return [
        Prisma.sql`
          CASE
            WHEN ${alias} IS NULL
              THEN 1
            ELSE 0
          END ASC
        `,
        Prisma.sql`
          ${alias} ${richtingSql}
        `,
      ];
    }),
    ",",
  );

  const algemeenZoekfilter = zoekterm
    ? Prisma.sql`
          AND (
            ${tekstBevat(
              Prisma.sql`
                l."naam_persoon"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."telefoonnummer"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."mailadres"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."ovam_id"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."certificaatnummer"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                TO_CHAR(
                  l."uitgereikt_op",
                  'DD/MM/YYYY'
                )
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."bedrijf"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."aansluiting"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."opmerking"
              `,
              zoekterm,
            )}
            OR ${tekstBevat(
              Prisma.sql`
                l."certificatie_platform"
              `,
              zoekterm,
            )}
          )
        `
    : Prisma.empty;

  const jaarFilter =
    uitgereiktJaar === null
      ? Prisma.empty
      : Prisma.sql`
          AND EXTRACT(
            YEAR FROM
              l."uitgereikt_op"
          ) = ${uitgereiktJaar}
        `;

  const maandFilter =
    uitgereiktMaand === null
      ? Prisma.empty
      : Prisma.sql`
          AND EXTRACT(
            MONTH FROM
              l."uitgereikt_op"
          ) = ${uitgereiktMaand}
        `;

  const targetFilter =
    targetStatus === null
      ? Prisma.empty
      : Prisma.sql`
          AND "targetStatus" =
            ${targetStatus}
        `;

  const cursorVoorwaarde =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          WHERE g."positie" > (
            SELECT anker."positie"
            FROM gerangschikt anker
            WHERE anker.id = ${cursorId}
          )
        `;

  const query = Prisma.sql`
    WITH controletellingen AS (
      SELECT
        l.id,
        l."naam_persoon",
        l."telefoonnummer",
        l."mailadres",
        l."ovam_id",
        l."certificaatnummer",
        l."uitgereikt_op",
        l."bedrijf",
        l."aansluiting",
        l."opmerking",
        l."certificatie_platform",
        ${sorteerSelecties},
        COALESCE(
          aps."aantal_attesten",
          0
        )::integer
          AS "aantalAttesten",
        COALESCE(
          dc.aantal,
          0
        )::integer
          AS "aantalDeskcontroles",
        COALESCE(
          tc.aantal,
          0
        )::integer
          AS "aantalTerreincontroles"
      FROM "leden" l
      LEFT JOIN
        "attest_persoon_statistieken" aps
        ON aps."persoons_id" =
          l."ovam_id"
      LEFT JOIN (
        SELECT
          "lid_id",
          COUNT(*)::integer
            AS aantal
        FROM "deskcontroles"
        WHERE "verwijderd_op"
          IS NULL
        GROUP BY "lid_id"
      ) dc
        ON dc."lid_id" = l.id
      LEFT JOIN (
        SELECT
          t."ovam_id",
          COUNT(*)::integer
            AS aantal
        FROM
          "terreincontroles" t
        WHERE
          t."verwijderd_op"
            IS NULL
          AND t."afwezig_op"
            IS NULL
          AND NULLIF(
            BTRIM(
              t."ovam_id"
            ),
            ''
          ) IS NOT NULL
        GROUP BY
          t."ovam_id"
      ) tc
        ON tc."ovam_id" =
          l."ovam_id"
      WHERE l."verwijderd_op"
        IS NULL
      ${algemeenZoekfilter}
      ${maakTekstfilter(
        Prisma.sql`
          l."naam_persoon"
        `,
        tekstfilters.naamPersoon,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."telefoonnummer"
        `,
        tekstfilters.telefoonnummer,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."mailadres"
        `,
        tekstfilters.mailadres,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."ovam_id"
        `,
        tekstfilters.ovamId,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."certificaatnummer"
        `,
        tekstfilters.certificaatnummer,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          TO_CHAR(
            l."uitgereikt_op",
            'YYYY-MM-DD'
          )
        `,
        tekstfilters.uitgereiktOp,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."bedrijf"
        `,
        tekstfilters.bedrijf,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."aansluiting"
        `,
        tekstfilters.aansluiting,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."opmerking"
        `,
        tekstfilters.opmerking,
      )}
      ${maakTekstfilter(
        Prisma.sql`
          l."certificatie_platform"
        `,
        tekstfilters.certificatiePlatform,
      )}
      ${jaarFilter}
      ${maandFilter}
    ),
    statussen AS (
      SELECT
        *,
        CASE
          WHEN "aantalAttesten" = 0
            THEN 'GRIJS'
          WHEN
            "aantalDeskcontroles" = 0
            OR
            "aantalTerreincontroles" = 0
            THEN 'ROOD'
          WHEN
            "aantalDeskcontroles" >=
              CEIL(
                "aantalAttesten" *
                0.05
              )
            AND
            "aantalTerreincontroles" >=
              LEAST(
                4,
                CEIL(
                  "aantalAttesten" /
                  100.0
                )
              )
            THEN 'GROEN'
          ELSE 'GEEL'
        END AS "targetStatus"
      FROM controletellingen
    ),
    gerangschikt AS (
      SELECT
        id,
        "targetStatus",
        COUNT(*) OVER ()::integer
          AS "aantalTotaal",
        ROW_NUMBER() OVER (
          ORDER BY
            ${sorteerVolgorde},
            id ASC
        ) AS "positie"
      FROM statussen
      WHERE TRUE
      ${targetFilter}
    )
    SELECT
      g.id,
      g."targetStatus",
      g."aantalTotaal"
    FROM gerangschikt g
    ${cursorVoorwaarde}
    ORDER BY
      g."positie" ASC
    LIMIT ${limiet + 1}
  `;

  return prisma.$queryRaw<PersoonscertificaatSelectieRij[]>(query);
}

export type PersoonscertificaatFilterwaarde = {
  waarde: string;
  aantal: number;
};

export async function laadPersoonscertificaatFilterwaarden({
  kolom,
  zoekterm,
}: {
  kolom: PersoonscertificaatSortering;
  zoekterm: string;
}) {
  const expressie = sorteerExpressie(kolom);

  const zoekvoorwaarde = zoekterm
    ? Prisma.sql`
        AND ${tekstBevat(expressie, zoekterm)}
      `
    : Prisma.empty;

  const limiet = kolom === "uitgereiktOp" ? 2000 : 300;

  return prisma.$queryRaw<PersoonscertificaatFilterwaarde[]>(Prisma.sql`
    SELECT
      COALESCE(
        NULLIF(
          BTRIM(
            (${expressie})::text
          ),
          ''
        ),
        ''
      ) AS "waarde",
      COUNT(*)::integer AS "aantal"
    FROM "leden" l
    WHERE
      l."verwijderd_op" IS NULL
      ${zoekvoorwaarde}
    GROUP BY
      COALESCE(
        NULLIF(
          BTRIM(
            (${expressie})::text
          ),
          ''
        ),
        ''
      )
    ORDER BY
      CASE
        WHEN COALESCE(
          NULLIF(
            BTRIM(
              (${expressie})::text
            ),
            ''
          ),
          ''
        ) = ''
        THEN 0
        ELSE 1
      END,
      LOWER(
        COALESCE(
          NULLIF(
            BTRIM(
              (${expressie})::text
            ),
            ''
          ),
          ''
        )
      ) ASC
    LIMIT ${limiet}
  `);
}

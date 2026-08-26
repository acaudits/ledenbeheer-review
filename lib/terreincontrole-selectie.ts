import "server-only";

import { Prisma } from "../generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  type TerreincontroleLijstcontract,
  type TerreincontroleSorteercriterium,
  type TerreincontroleSortering,
  type TerreincontroleTekstfilters,
} from "@/lib/terreincontrole-lijstcontract";
import { OngeldigePagineringFout } from "@/lib/server-paginering";

export type TerreincontroleSelectieRij = {
  id: number;
  auditeur: string;
  naamAdi: string;
  linkAttest: string;
  attestnummer: string;
  certificatiePlatform: string;
  opmerkingen: string;
  datumControle: string;
  adres: string;
  persoonsId: string;
  bedrijfsnaam: string;
  ondernemingsnummer: string;
  persoonscertificaat: string;
  procescertificaat: string;
  attestId: string;
  aantalTotaal: number;
};

export type TerreincontroleDashboardTellingen = {
  terreincontroles: number;
  nonConformiteiten: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract: TerreincontroleLijstcontract;
  sorteringen: TerreincontroleSorteercriterium[];
  limiet: number;
  cursorId: number | null;
};

const tekstExpressies: Record<keyof TerreincontroleTekstfilters, Prisma.Sql> = {
  auditeur: Prisma.sql`d."auditeur"`,
  naamAdi: Prisma.sql`d."naam_adi"`,
  linkAttest: Prisma.sql`d."link_attest"`,
  attestnummer: Prisma.sql`d."attestnummer"`,
  certificatiePlatform: Prisma.sql`d."certificatie_platform"`,
  opmerkingen: Prisma.sql`d."opmerkingen"`,
  datumControle: Prisma.sql`
    TO_CHAR(
      d."datum_controle",
      'YYYY-MM-DD'
    )
  `,
  adres: Prisma.sql`d."adres"`,
  persoonsId: Prisma.sql`d."persoons_id"`,
  bedrijfsnaam: Prisma.sql`d."bedrijfsnaam"`,
  ondernemingsnummer: Prisma.sql`d."ondernemingsnummer"`,
  persoonscertificaat: Prisma.sql`d."persoonscertificaat_nummer"`,
  procescertificaat: Prisma.sql`d."procescertificaat_nummer"`,
  attestId: Prisma.sql`d."attest_id"::text`,
};

function bevat(expressie: Prisma.Sql, waarde: string) {
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
  return Prisma.sql`
    CASE
      WHEN LENGTH(
        REGEXP_REPLACE(
          COALESCE(
            (${expressie})::text,
            ''
          ),
          '[^0-9]',
          '',
          'g'
        )
      ) = 9
      THEN '0' || REGEXP_REPLACE(
        COALESCE(
          (${expressie})::text,
          ''
        ),
        '[^0-9]',
        '',
        'g'
      )
      ELSE REGEXP_REPLACE(
        COALESCE(
          (${expressie})::text,
          ''
        ),
        '[^0-9]',
        '',
        'g'
      )
    END
  `;
}

function ondernemingsnummerBevat(expressie: Prisma.Sql, waarde: string) {
  const cijfers = waarde.replace(/\D/g, "");

  if (!cijfers) {
    return bevat(expressie, waarde);
  }

  const genormaliseerd = cijfers.length === 9 ? `0${cijfers}` : cijfers;

  return Prisma.sql`
    STRPOS(
      ${normaliseerOndernemingsnummerExpressie(expressie)},
      ${genormaliseerd}
    ) > 0
  `;
}

function sorteerExpressie(sortering: TerreincontroleSortering) {
  if (sortering === "datumControle") {
    return Prisma.sql`
      TO_CHAR(
        d."datum_controle",
        'YYYY-MM-DD'
      )
    `;
  }

  return tekstExpressies[sortering];
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
      return null;
    }

    const kandidaat = inhoud as Record<string, unknown>;

    if (
      (kandidaat.modus !== "insluiten" && kandidaat.modus !== "uitsluiten") ||
      !Array.isArray(kandidaat.waarden) ||
      kandidaat.waarden.length > 2000 ||
      typeof kandidaat.legeCellenGeselecteerd !== "boolean"
    ) {
      return null;
    }

    const waarden = kandidaat.waarden.filter(
      (item): item is string =>
        typeof item === "string" && item.length <= 500 && item.trim() !== "",
    );

    if (waarden.length !== kandidaat.waarden.length) {
      return null;
    }

    return {
      modus: kandidaat.modus,
      waarden: Array.from(new Set(waarden)),
      legeCellenGeselecteerd: kandidaat.legeCellenGeselecteerd,
    };
  } catch {
    return null;
  }
}

function maakExcelWaardeVoorwaarde(
  expressie: Prisma.Sql,
  filter: ExcelWaardeFilter,
) {
  const genormaliseerdeExpressie = Prisma.sql`
    LOWER(
      TRIM(
        COALESCE(
          (${expressie})::text,
          ''
        )
      )
    )
  `;

  const waarden = filter.waarden.map((waarde) =>
    waarde.trim().toLocaleLowerCase("nl-BE"),
  );

  if (filter.modus === "insluiten") {
    const mogelijkheden: Prisma.Sql[] = [];

    if (waarden.length > 0) {
      mogelijkheden.push(
        Prisma.sql`
          ${genormaliseerdeExpressie}
          IN (${Prisma.join(waarden)})
        `,
      );
    }

    if (filter.legeCellenGeselecteerd) {
      mogelijkheden.push(
        Prisma.sql`
          ${genormaliseerdeExpressie} = ''
        `,
      );
    }

    if (mogelijkheden.length === 0) {
      return Prisma.sql`FALSE`;
    }

    return Prisma.sql`
      (${Prisma.join(mogelijkheden, " OR ")})
    `;
  }

  const voorwaarden: Prisma.Sql[] = [];

  if (waarden.length > 0) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerdeExpressie}
        NOT IN (${Prisma.join(waarden)})
      `,
    );
  }

  if (!filter.legeCellenGeselecteerd) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerdeExpressie} <> ''
      `,
    );
  }

  if (voorwaarden.length === 0) {
    return Prisma.sql`TRUE`;
  }

  return Prisma.sql`
    (${Prisma.join(voorwaarden, " AND ")})
  `;
}

function maakFiltervoorwaarden({
  zoekterm,
  contract,
}: {
  zoekterm: string;
  contract: TerreincontroleLijstcontract;
}) {
  const voorwaarden: Prisma.Sql[] = [
    Prisma.sql`
        d."verwijderd_op" IS NULL
      `,
  ];

  if (zoekterm) {
    const algemeneExpressie = Prisma.sql`
        CONCAT_WS(
          ' ',
          d."auditeur",
          d."naam_adi",
          d."link_attest",
          d."attestnummer",
          d."certificatie_platform",
          d."opmerkingen",
          TO_CHAR(
            d."datum_controle",
            'DD/MM/YYYY'
          ),
          d."adres",
          d."persoons_id",
          d."bedrijfsnaam",
          d."ondernemingsnummer",
          d."persoonscertificaat_nummer",
          d."procescertificaat_nummer",
          d."attest_id"::text
        )
      `;

    voorwaarden.push(
      Prisma.sql`
        (
          ${bevat(algemeneExpressie, zoekterm)}
          OR
          ${ondernemingsnummerBevat(
            Prisma.sql`
              d."ondernemingsnummer"
            `,
            zoekterm,
          )}
        )
      `,
    );
  }

  for (const [sleutel, waarde] of Object.entries(contract.tekstfilters) as [
    keyof TerreincontroleTekstfilters,
    string,
  ][]) {
    if (!waarde) {
      continue;
    }

    const expressie = tekstExpressies[sleutel];
    const excelFilter = leesExcelWaardeFilter(waarde);

    if (excelFilter) {
      voorwaarden.push(maakExcelWaardeVoorwaarde(expressie, excelFilter));
      continue;
    }

    voorwaarden.push(
      sleutel === "ondernemingsnummer"
        ? ondernemingsnummerBevat(expressie, waarde)
        : bevat(expressie, waarde),
    );
  }

  if (contract.datumControleJaar !== null) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          YEAR FROM
          d."datum_controle"
        ) = ${contract.datumControleJaar}
      `,
    );
  }

  if (contract.datumControleMaand !== null) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          MONTH FROM
          d."datum_controle"
        ) = ${contract.datumControleMaand}
      `,
    );
  }

  return Prisma.join(voorwaarden, " AND ");
}

export async function laadTerreincontroleSelectie({
  zoekterm,
  contract,
  sorteringen,
  limiet,
  cursorId,
}: SelectieInvoer) {
  if (!Number.isInteger(limiet) || limiet < 1 || limiet > 50) {
    throw new OngeldigePagineringFout(
      "De paginalimiet voor terreincontroles is ongeldig.",
    );
  }

  if (cursorId !== null && (!Number.isInteger(cursorId) || cursorId <= 0)) {
    throw new OngeldigePagineringFout(
      "De cursor voor terreincontroles is ongeldig.",
    );
  }

  if (sorteringen.length === 0) {
    throw new OngeldigePagineringFout(
      "Er moet minstens één sortering gekozen zijn.",
    );
  }

  const voorwaarden = maakFiltervoorwaarden({
    zoekterm,
    contract,
  });

  const sorteerKolommen = sorteringen.map((sortering, index) => {
    const expressie = sorteerExpressie(sortering.sleutel);

    return {
      isLeegAlias: Prisma.raw(`"isLeeg${index}"`),
      waardeAlias: Prisma.raw(`"sorteerWaarde${index}"`),
      gIsLeeg: Prisma.raw(`g."isLeeg${index}"`),
      cIsLeeg: Prisma.raw(`c."isLeeg${index}"`),
      gWaarde: Prisma.raw(`g."sorteerWaarde${index}"`),
      cWaarde: Prisma.raw(`c."sorteerWaarde${index}"`),
      richting: sortering.richting,
      expressie,
    };
  });

  const sorteerSelecties = Prisma.join(
    sorteerKolommen.map(
      (kolom) =>
        Prisma.sql`
            ,
            (
              COALESCE(
                (${kolom.expressie})::text,
                ''
              ) = ''
            ) AS ${kolom.isLeegAlias},
            LOWER(
              COALESCE(
                (${kolom.expressie})::text,
                ''
              )
            ) AS ${kolom.waardeAlias}
          `,
    ),
    "\n",
  );

  const cursorSelecties = Prisma.join(
    sorteerKolommen.map(
      (kolom) =>
        Prisma.sql`
            ,
            ${kolom.gIsLeeg}
              AS ${kolom.isLeegAlias},
            ${kolom.gWaarde}
              AS ${kolom.waardeAlias}
          `,
    ),
    "\n",
  );

  const atomen: {
    g: Prisma.Sql;
    c: Prisma.Sql;
    richting: "asc" | "desc";
  }[] = [];

  for (const kolom of sorteerKolommen) {
    atomen.push({
      g: kolom.gIsLeeg,
      c: kolom.cIsLeeg,
      richting: "asc",
    });

    atomen.push({
      g: kolom.gWaarde,
      c: kolom.cWaarde,
      richting: kolom.richting,
    });
  }

  atomen.push({
    g: Prisma.raw("g.id"),
    c: Prisma.raw("c.id"),
    richting: "asc",
  });

  const cursorVoorwaarde =
    cursorId === null
      ? Prisma.sql`TRUE`
      : Prisma.join(
          atomen.map((atoom, index) => {
            const eerdere = atomen.slice(0, index).map(
              (eerder) =>
                Prisma.sql`
                        ${eerder.g} =
                          ${eerder.c}
                      `,
            );

            const operator = Prisma.raw(atoom.richting === "asc" ? ">" : "<");

            return Prisma.sql`
                (
                  ${
                    eerdere.length
                      ? Prisma.sql`
                          ${Prisma.join(eerdere, " AND ")}
                          AND
                        `
                      : Prisma.empty
                  }
                  ${atoom.g}
                    ${operator}
                    ${atoom.c}
                )
              `;
          }),
          " OR ",
        );

  const orderBy = Prisma.join(
    atomen.map(
      (atoom) =>
        Prisma.sql`
            ${atoom.g}
            ${Prisma.raw(atoom.richting === "asc" ? "ASC" : "DESC")}
          `,
    ),
    ", ",
  );

  const cursorJoin =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          CROSS JOIN "cursorRij" c
        `;

  return prisma.$queryRaw<TerreincontroleSelectieRij[]>(Prisma.sql`
    WITH "gefilterd" AS (
      SELECT
        d.id,
        d."auditeur",
        d."naam_adi" AS "naamAdi",
        d."link_attest" AS "linkAttest",
        d."attestnummer",
        COALESCE(
          d."certificatie_platform",
          ''
        ) AS "certificatiePlatform",
        COALESCE(
          d."opmerkingen",
          ''
        ) AS "opmerkingen",
        TO_CHAR(
          d."datum_controle",
          'DD/MM/YYYY'
        ) AS "datumControle",
        COALESCE(
          d."adres",
          ''
        ) AS "adres",
        d."persoons_id" AS "persoonsId",
        d."bedrijfsnaam",
        d."ondernemingsnummer",
        d."persoonscertificaat_nummer"
          AS "persoonscertificaat",
        d."procescertificaat_nummer"
          AS "procescertificaat",
        d."attest_id"::text AS "attestId",
        COUNT(*) OVER()::integer
          AS "aantalTotaal"
        ${sorteerSelecties}
      FROM
        "terreincontrole_dossiers" d
      WHERE
        ${voorwaarden}
    ),
    "cursorRij" AS (
      SELECT
        g.id
        ${cursorSelecties}
      FROM "gefilterd" g
      WHERE
        g.id = ${cursorId ?? -1}
    )
    SELECT
      g.id,
      g."auditeur",
      g."naamAdi",
      g."linkAttest",
      g."attestnummer",
      g."certificatiePlatform",
      g."opmerkingen",
      g."datumControle",
      g."adres",
      g."persoonsId",
      g."bedrijfsnaam",
      g."ondernemingsnummer",
      g."persoonscertificaat",
      g."procescertificaat",
      g."attestId",
      g."aantalTotaal"
    FROM "gefilterd" g
    ${cursorJoin}
    WHERE
      ${cursorVoorwaarde}
    ORDER BY
      ${orderBy}
    LIMIT ${limiet + 1}
  `);
}

export async function laadTerreincontroleDashboardTellingen() {
  const [tellingen] = await prisma.$queryRaw<
    TerreincontroleDashboardTellingen[]
  >(Prisma.sql`
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM
            "terreincontrole_dossiers" d
          WHERE
            d."verwijderd_op" IS NULL
        ) AS "terreincontroles",
        (
          SELECT COUNT(*)::integer
          FROM
            "terreincontrole_vaststellingen" v
          INNER JOIN
            "terreincontrole_dossiers" d
          ON
            d.id =
              v."terreincontrole_dossier_id"
          WHERE
            d."verwijderd_op" IS NULL
        ) AS "nonConformiteiten"
    `);

  return (
    tellingen ?? {
      terreincontroles: 0,
      nonConformiteiten: 0,
    }
  );
}

export type TerreincontroleFilterwaarde = {
  waarde: string;
  aantal: number;
};

export async function laadTerreincontroleFilterwaarden({
  kolom,
  zoekterm,
}: {
  kolom: TerreincontroleSortering;
  zoekterm: string;
}) {
  const expressie = sorteerExpressie(kolom);
  const zoekvoorwaarde = zoekterm
    ? Prisma.sql`
        AND ${bevat(expressie, zoekterm)}
      `
    : Prisma.empty;

  const limiet = kolom === "datumControle" ? 2000 : 300;

  return prisma.$queryRaw<TerreincontroleFilterwaarde[]>(Prisma.sql`
    SELECT
      COALESCE(
        NULLIF(
          TRIM(
            (${expressie})::text
          ),
          ''
        ),
        ''
      ) AS "waarde",
      COUNT(*)::integer AS "aantal"
    FROM
      "terreincontrole_dossiers" d
    WHERE
      d."verwijderd_op" IS NULL
      ${zoekvoorwaarde}
    GROUP BY
      COALESCE(
        NULLIF(
          TRIM(
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
            TRIM(
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
            TRIM(
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

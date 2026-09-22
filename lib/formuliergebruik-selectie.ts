import "server-only";

import { Prisma } from "@/generated/prisma/client";

import {
  type FormuliergebruikFilters,
  type FormuliergebruikSorteercriterium,
  type FormuliergebruikSortering,
} from "@/lib/formuliergebruik-lijstcontract";
import { prisma } from "@/lib/prisma";
import { OngeldigePagineringFout } from "@/lib/server-paginering";

export type FormuliergebruikSelectieRij = {
  id: number;
  gestartOp: Date;
  laatsteActiviteitOp: Date;
  actieveDuurSeconden: number;
  status: string;
  stap: string;
  apparaat: string;
  naamAdi: string;
  persoonsId: string;
  foutcode: string | null;
  foutmelding: string | null;
  validatiePogingen: number;
  ovamLinkGeklikt: boolean;
  ovamLinkKlikken: number;
  ovamLinkLaatstOp: Date | null;
  referentie: string | null;
  aantalPlaatsbezoeken: number;
  momentopname: Prisma.JsonValue | null;
  aantalTotaal: number;
};

export type FormuliergebruikFilterwaarde = {
  waarde: string;
  aantal: number;
};

type SelectieInvoer = {
  zoekterm: string;
  filters: FormuliergebruikFilters;
  sorteringen: FormuliergebruikSorteercriterium[];
  limiet: number;
  cursorId: number | null;
};

const EXCEL_FILTER_PREFIX = "__excel__";

type ExcelFilter = {
  modus: "insluiten" | "uitsluiten";
  waarden: string[];
  legeCellenGeselecteerd: boolean;
};

const bezoekenExpressie = Prisma.sql`
    COALESCE(
      jsonb_array_length(
        CASE
          WHEN
            jsonb_typeof(
              s."momentopname"->'bezoeken'
            ) = 'array'
          THEN
            s."momentopname"->'bezoeken'
          ELSE
            '[]'::jsonb
        END
      ),
      0
    )
  `;

const expressies: Record<FormuliergebruikSortering, Prisma.Sql> = {
  gestartOp: Prisma.sql`s."gestart_op"`,
  laatsteActiviteitOp: Prisma.sql`s."laatste_activiteit_op"`,
  actieveDuurSeconden: Prisma.sql`s."actieve_duur_seconden"`,
  status: Prisma.sql`s."status"::text`,
  stap: Prisma.sql`s."stap"::text`,
  apparaat: Prisma.sql`s."apparaat"::text`,
  naamAdi: Prisma.sql`s."momentopname"->>'naamAdi'`,
  persoonsId: Prisma.sql`s."momentopname"->>'persoonsId'`,
  foutcode: Prisma.sql`s."foutcode"`,
  foutmelding: Prisma.sql`s."foutmelding"`,
  ovamLinkGeklikt: Prisma.sql`
      CASE
        WHEN s."ovam_link_geklikt"
        THEN 'Ja'
        ELSE 'Nee'
      END
    `,
  ovamLinkKlikken: Prisma.sql`s."ovam_link_klikken"`,
  ovamLinkLaatstOp: Prisma.sql`s."ovam_link_laatst_op"`,
  referentie: Prisma.sql`m."referentie"`,
  aantalPlaatsbezoeken: bezoekenExpressie,
  id: Prisma.sql`s."id"`,
};

function brusselseDatum(expressie: Prisma.Sql) {
  return Prisma.sql`
    TO_CHAR(
      (
        ${expressie}
        AT TIME ZONE
          'Europe/Brussels'
      ),
      'YYYY-MM-DD'
    )
  `;
}

const filterExpressies: Record<keyof FormuliergebruikFilters, Prisma.Sql> = {
  ...expressies,
  gestartOp: brusselseDatum(expressies.gestartOp),
  laatsteActiviteitOp: brusselseDatum(expressies.laatsteActiviteitOp),
  ovamLinkLaatstOp: brusselseDatum(expressies.ovamLinkLaatstOp),
};

function leesExcelFilter(waarde: string): ExcelFilter | null {
  if (!waarde.startsWith(EXCEL_FILTER_PREFIX)) {
    return null;
  }

  try {
    const inhoud = JSON.parse(
      decodeURIComponent(waarde.slice(EXCEL_FILTER_PREFIX.length)),
    ) as unknown;

    if (typeof inhoud !== "object" || inhoud === null) {
      throw new Error();
    }

    const kandidaat = inhoud as Record<string, unknown>;

    if (
      (kandidaat.modus !== "insluiten" && kandidaat.modus !== "uitsluiten") ||
      !Array.isArray(kandidaat.waarden) ||
      typeof kandidaat.legeCellenGeselecteerd !== "boolean" ||
      kandidaat.waarden.length > 2000
    ) {
      throw new Error();
    }

    const waarden = kandidaat.waarden.map((item) => {
      if (typeof item !== "string" || item.length > 500) {
        throw new Error();
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
      "De gekozen filterwaarden zijn ongeldig.",
    );
  }
}

function alsTekst(expressie: Prisma.Sql) {
  return Prisma.sql`
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
}

function bevat(expressie: Prisma.Sql, waarde: string) {
  return Prisma.sql`
    STRPOS(
      LOWER(
        ${alsTekst(expressie)}
      ),
      LOWER(${waarde})
    ) > 0
  `;
}

function maakFilter(expressie: Prisma.Sql, waarde: string) {
  if (!waarde) {
    return Prisma.empty;
  }

  const excelFilter = leesExcelFilter(waarde);

  if (!excelFilter) {
    return Prisma.sql`
      AND ${bevat(expressie, waarde)}
    `;
  }

  const genormaliseerd = alsTekst(expressie);

  if (excelFilter.modus === "insluiten") {
    const voorwaarden: Prisma.Sql[] = [];

    if (excelFilter.waarden.length > 0) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerd}
          IN (
            ${Prisma.join(excelFilter.waarden)}
          )
        `,
      );
    }

    if (excelFilter.legeCellenGeselecteerd) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerd} = ''
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
        ${genormaliseerd}
        NOT IN (
          ${Prisma.join(excelFilter.waarden)}
        )
      `,
    );
  }

  if (!excelFilter.legeCellenGeselecteerd) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerd} <> ''
      `,
    );
  }

  if (voorwaarden.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`
    AND
      ${Prisma.join(voorwaarden, " AND ")}
  `;
}

function maakFilterVoorwaarden(filters: FormuliergebruikFilters) {
  const voorwaarden = Object.entries(filters)
    .filter(([, waarde]) => Boolean(waarde))
    .map(([sleutel, waarde]) =>
      maakFilter(
        filterExpressies[sleutel as keyof FormuliergebruikFilters],
        waarde,
      ),
    );

  return voorwaarden.length > 0 ? Prisma.join(voorwaarden, " ") : Prisma.empty;
}

function maakZoekVoorwaarde(zoekterm: string) {
  if (!zoekterm) {
    return Prisma.empty;
  }

  const zoekExpressies = [
    expressies.naamAdi,
    expressies.persoonsId,
    expressies.foutcode,
    expressies.foutmelding,
    expressies.referentie,
    expressies.status,
    expressies.stap,
    expressies.apparaat,
  ];

  return Prisma.sql`
    AND (
      ${Prisma.join(
        zoekExpressies.map((expressie) => bevat(expressie, zoekterm)),
        " OR ",
      )}
    )
  `;
}

function maakSortering(sorteringen: FormuliergebruikSorteercriterium[]) {
  const delen: Prisma.Sql[] = [];

  for (const sortering of sorteringen) {
    const expressie = expressies[sortering.sleutel];

    delen.push(
      Prisma.sql`
        CASE
          WHEN
            NULLIF(
              BTRIM(
                (${expressie})::text
              ),
              ''
            ) IS NULL
          THEN 1
          ELSE 0
        END ASC
      `,
    );

    delen.push(
      sortering.richting === "asc"
        ? Prisma.sql`
            ${expressie} ASC
          `
        : Prisma.sql`
            ${expressie} DESC
          `,
    );
  }

  if (!sorteringen.some((sortering) => sortering.sleutel === "id")) {
    delen.push(Prisma.sql`s."id" DESC`);
  }

  return Prisma.join(delen, ", ");
}

export async function laadFormuliergebruikSelectie({
  zoekterm,
  filters,
  sorteringen,
  limiet,
  cursorId,
}: SelectieInvoer) {
  const filterVoorwaarden = maakFilterVoorwaarden(filters);

  const zoekVoorwaarde = maakZoekVoorwaarde(zoekterm);

  const sortering = maakSortering(sorteringen);

  return prisma.$queryRaw<FormuliergebruikSelectieRij[]>(Prisma.sql`
      WITH gerangschikt AS (
        SELECT
          s."id",
          s."gestart_op"
            AS "gestartOp",
          s."laatste_activiteit_op"
            AS "laatsteActiviteitOp",
          s."actieve_duur_seconden"
            AS "actieveDuurSeconden",
          s."status"::text
            AS "status",
          s."stap"::text
            AS "stap",
          s."apparaat"::text
            AS "apparaat",
          COALESCE(
            s."momentopname"->>'naamAdi',
            ''
          ) AS "naamAdi",
          COALESCE(
            s."momentopname"->>'persoonsId',
            ''
          ) AS "persoonsId",
          s."foutcode",
          s."foutmelding",
          s."validatie_pogingen"
            AS "validatiePogingen",
          s."ovam_link_geklikt"
            AS "ovamLinkGeklikt",
          s."ovam_link_klikken"
            AS "ovamLinkKlikken",
          s."ovam_link_laatst_op"
            AS "ovamLinkLaatstOp",
          m."referentie",
          ${bezoekenExpressie}::integer
            AS "aantalPlaatsbezoeken",
          s."momentopname",
          COUNT(*) OVER ()::integer
            AS "aantalTotaal",
          ROW_NUMBER() OVER (
            ORDER BY
              ${sortering}
          )::integer AS "rang"
        FROM
          "laattijdige_formulier_sessies" s
        LEFT JOIN
          "laattijdige_plaatsbezoek_meldingen" m
        ON
          m."id" =
            s."melding_id"
        WHERE
          TRUE
          ${zoekVoorwaarde}
          ${filterVoorwaarden}
      ),
      cursorpositie AS (
        SELECT
          "rang"
        FROM
          gerangschikt
        WHERE
          "id" =
            ${cursorId}
      )
      SELECT
        "id",
        "gestartOp",
        "laatsteActiviteitOp",
        "actieveDuurSeconden",
        "status",
        "stap",
        "apparaat",
        "naamAdi",
        "persoonsId",
        "foutcode",
        "foutmelding",
        "validatiePogingen",
        "ovamLinkGeklikt",
        "ovamLinkKlikken",
        "ovamLinkLaatstOp",
        "referentie",
        "aantalPlaatsbezoeken",
        "momentopname",
        "aantalTotaal"
      FROM
        gerangschikt
      WHERE
        ${cursorId}::integer
          IS NULL
        OR "rang" > COALESCE(
          (
            SELECT "rang"
            FROM cursorpositie
          ),
          0
        )
      ORDER BY
        "rang"
      LIMIT
        ${limiet + 1}
    `);
}

export async function laadFormuliergebruikFilterwaarden({
  kolom,
  zoekterm,
}: {
  kolom: FormuliergebruikSortering;
  zoekterm: string;
}) {
  const expressie = expressies[kolom];

  const zoekVoorwaarde = zoekterm
    ? Prisma.sql`
          WHERE
            ${bevat(expressie, zoekterm)}
        `
    : Prisma.empty;

  const isDatum =
    kolom === "gestartOp" ||
    kolom === "laatsteActiviteitOp" ||
    kolom === "ovamLinkLaatstOp";

  const waardeExpressie = isDatum
    ? Prisma.sql`
          COALESCE(
            TO_CHAR(
              (
                ${expressie}
                AT TIME ZONE
                  'Europe/Brussels'
              ),
              'YYYY-MM-DD'
            ),
            ''
          )
        `
    : alsTekst(expressie);

  const limiet = isDatum ? 2000 : 300;

  return prisma.$queryRaw<FormuliergebruikFilterwaarde[]>(Prisma.sql`
      SELECT
        ${waardeExpressie}
          AS "waarde",
        COUNT(*)::integer
          AS "aantal"
      FROM
        "laattijdige_formulier_sessies" s
      LEFT JOIN
        "laattijdige_plaatsbezoek_meldingen" m
      ON
        m."id" =
          s."melding_id"
      ${zoekVoorwaarde}
      GROUP BY
        ${waardeExpressie}
      ORDER BY
        CASE
          WHEN
            ${waardeExpressie} = ''
          THEN 0
          ELSE 1
        END,
        LOWER(
          ${waardeExpressie}
        ) ASC
      LIMIT
        ${limiet}
    `);
}

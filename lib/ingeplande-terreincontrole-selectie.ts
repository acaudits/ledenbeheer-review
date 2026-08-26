import "server-only";

import { Prisma } from "../generated/prisma/client";

import {
  type IngeplandeTerreincontroleLijstcontract,
  type IngeplandeTerreincontroleSorteercriterium,
  type IngeplandeTerreincontroleSortering,
  type IngeplandeTerreincontroleTekstfilters,
} from "@/lib/ingeplande-terreincontrole-lijstcontract";
import { prisma } from "@/lib/prisma";
import { OngeldigePagineringFout } from "@/lib/server-paginering";

export type IngeplandeTerreincontroleSelectieRij = {
  id: number;
  afgerond: boolean;
  auditeur: string | null;
  factuurVerzonden: boolean | null;
  status: "GEARCHIVEERD_ATTEST" | "ACTUEEL_ATTEST" | "IN_OPMAAK" | null;
  inspectielocatie: string | null;
  bouwjaar: number | null;
  vloeroppervlakteM2: string | null;
  datumPlaatsbezoek: string | null;
  uurPlaatsbezoek: string | null;
  ovamId: string | null;
  naamAdi: string | null;
  attestUrl: string | null;
  bedrijfsnaam: string | null;
  postcode: string | null;
  gemeente: string | null;
  straat: string | null;
  huisnummer: string | null;
  extraAdresDetails: string | null;
  perceelGemeenteCode: string | null;
  perceelAfdelingscode: string | null;
  perceelSectieCode: string | null;
  attestId: string;
  opmerkingen: string | null;
  aantalTotaal: number;
};

export type IngeplandeTerreincontroleDashboardTellingen = {
  plaatsbezoeken: number;
  inOpmaak: number;
  gearchiveerd: number;
  actueelAttest: number;
  nietVerzondenFacturen: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract: IngeplandeTerreincontroleLijstcontract;
  sorteringen: IngeplandeTerreincontroleSorteercriterium[];
  limiet: number;
  cursorId: number | null;
};

const statusExpressie = Prisma.sql`
    COALESCE(
      t."status"::text,
      ''
    )
  `;

const factuurExpressie = Prisma.sql`
    CASE
      WHEN
        t."factuur_verzonden"
          IS TRUE
      THEN 'Ja'
      WHEN
        t."factuur_verzonden"
          IS FALSE
      THEN 'Nee'
      ELSE 'NVT'
    END
  `;

const afgerondExpressie = Prisma.sql`
    CASE
      WHEN t."afgerond" IS TRUE
      THEN 'Ja'
      ELSE 'Nee'
    END
  `;

const datumSorteerExpressie = Prisma.sql`
    TO_CHAR(
      t."datum_plaatsbezoek",
      'YYYY-MM-DD'
    )
  `;

const uurExpressie = Prisma.sql`
    TO_CHAR(
      t."uur_plaatsbezoek",
      'HH24:MI'
    )
  `;

const tekstExpressies: Record<
  keyof IngeplandeTerreincontroleTekstfilters,
  Prisma.Sql
> = {
  afgerond: afgerondExpressie,
  status: statusExpressie,
  auditeur: Prisma.sql`t."auditeur"`,
  factuurVerzonden: factuurExpressie,
  inspectielocatie: Prisma.sql`t."inspectielocatie"`,
  bouwjaar: Prisma.sql`t."bouwjaar"`,
  vloeroppervlakteM2: Prisma.sql`t."vloeroppervlakte_m2"`,
  datumPlaatsbezoek: datumSorteerExpressie,
  uurPlaatsbezoek: uurExpressie,
  ovamId: Prisma.sql`t."ovam_id"`,
  naamAdi: Prisma.sql`t."naam_adi"`,
  attestUrl: Prisma.sql`t."attest_url"`,
  bedrijfsnaam: Prisma.sql`t."bedrijfsnaam"`,
  postcode: Prisma.sql`t."postcode"`,
  gemeente: Prisma.sql`t."gemeente"`,
  straat: Prisma.sql`t."straat"`,
  huisnummer: Prisma.sql`t."huisnummer"`,
  extraAdresDetails: Prisma.sql`t."extra_adres_details"`,
  perceelGemeenteCode: Prisma.sql`t."perceel_gemeente_code"`,
  perceelAfdelingscode: Prisma.sql`t."perceel_afdelingscode"`,
  perceelSectieCode: Prisma.sql`t."perceel_sectie_code"`,
  attestId: Prisma.sql`t."attest_id"::text`,
  opmerkingen: Prisma.sql`t."opmerkingen"`,
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
  const excelFilter = leesExcelWaardeFilter(waarde);

  if (!excelFilter) {
    return bevat(expressie, waarde);
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
          IN (
            ${Prisma.join(excelFilter.waarden)}
          )
        `,
      );
    }

    if (excelFilter.legeCellenGeselecteerd) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerdeExpressie}
          = ''
        `,
      );
    }

    if (voorwaarden.length === 0) {
      return Prisma.sql`FALSE`;
    }

    return Prisma.sql`
      (
        ${Prisma.join(voorwaarden, " OR ")}
      )
    `;
  }

  const voorwaarden: Prisma.Sql[] = [];

  if (excelFilter.waarden.length > 0) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerdeExpressie}
        NOT IN (
          ${Prisma.join(excelFilter.waarden)}
        )
      `,
    );
  }

  if (!excelFilter.legeCellenGeselecteerd) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerdeExpressie}
        <> ''
      `,
    );
  }

  if (voorwaarden.length === 0) {
    return Prisma.sql`TRUE`;
  }

  return Prisma.sql`
    (
      ${Prisma.join(voorwaarden, " AND ")}
    )
  `;
}

function sorteerExpressie(sortering: IngeplandeTerreincontroleSortering) {
  if (sortering === "datumPlaatsbezoek") {
    return datumSorteerExpressie;
  }

  return tekstExpressies[sortering];
}

function maakFiltervoorwaarden({
  zoekterm,
  contract,
}: {
  zoekterm: string;
  contract: IngeplandeTerreincontroleLijstcontract;
}) {
  const voorwaarden: Prisma.Sql[] = [
    Prisma.sql`
        t."verwijderd_op" IS NULL
        AND t."afwezig_op" IS NULL
      `,
  ];

  if (zoekterm) {
    const algemeneExpressie = Prisma.sql`
        CONCAT_WS(
          ' ',
          t."auditeur",
          ${afgerondExpressie},
          ${factuurExpressie},
          ${statusExpressie},
          t."inspectielocatie",
          t."bouwjaar",
          t."vloeroppervlakte_m2",
          TO_CHAR(
            t."datum_plaatsbezoek",
            'DD/MM/YYYY'
          ),
          TO_CHAR(
            t."datum_plaatsbezoek",
            'YYYY-MM-DD'
          ),
          ${uurExpressie},
          t."ovam_id",
          t."naam_adi",
          t."attest_url",
          t."bedrijfsnaam",
          t."postcode",
          t."gemeente",
          t."straat",
          t."huisnummer",
          t."extra_adres_details",
          t."perceel_gemeente_code",
          t."perceel_afdelingscode",
          t."perceel_sectie_code",
          t."attest_id"::text,
          t."opmerkingen"
        )
      `;

    voorwaarden.push(bevat(algemeneExpressie, zoekterm));
  }

  for (const [sleutel, waarde] of Object.entries(contract.tekstfilters) as [
    keyof IngeplandeTerreincontroleTekstfilters,
    string,
  ][]) {
    if (!waarde) {
      continue;
    }

    voorwaarden.push(maakTekstfilter(tekstExpressies[sleutel], waarde));
  }

  if (contract.datumPlaatsbezoekJaar !== null) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          YEAR FROM
          t."datum_plaatsbezoek"
        ) =
        ${contract.datumPlaatsbezoekJaar}
      `,
    );
  }

  if (contract.datumPlaatsbezoekMaand !== null) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          MONTH FROM
          t."datum_plaatsbezoek"
        ) =
        ${contract.datumPlaatsbezoekMaand}
      `,
    );
  }

  return Prisma.join(voorwaarden, " AND ");
}

function valideerInvoer({
  limiet,
  cursorId,
}: Pick<SelectieInvoer, "limiet" | "cursorId">) {
  if (!Number.isInteger(limiet) || limiet < 1 || limiet > 50) {
    throw new OngeldigePagineringFout(
      "De paginalimiet voor ingeplande terreincontroles is ongeldig.",
    );
  }

  if (cursorId !== null && (!Number.isInteger(cursorId) || cursorId <= 0)) {
    throw new OngeldigePagineringFout(
      "De cursor voor ingeplande terreincontroles is ongeldig.",
    );
  }
}

export function laadIngeplandeTerreincontroleSelectie({
  zoekterm,
  contract,
  sorteringen,
  limiet,
  cursorId,
}: SelectieInvoer) {
  valideerInvoer({
    limiet,
    cursorId,
  });

  if (
    !Array.isArray(sorteringen) ||
    sorteringen.length === 0 ||
    sorteringen.length > 25 ||
    sorteringen.some(
      (sortering) =>
        sortering.richting !== "asc" && sortering.richting !== "desc",
    )
  ) {
    throw new OngeldigePagineringFout(
      "De sorteringen voor ingeplande terreincontroles zijn ongeldig.",
    );
  }

  const voorwaarden = maakFiltervoorwaarden({
    zoekterm,
    contract,
  });

  const sorteerSelecties = Prisma.join(
    sorteringen.map((sortering, index) => {
      const alias = Prisma.raw(`"sorteerWaarde${index}"`);

      return Prisma.sql`
        LOWER(
          COALESCE(
            (${sorteerExpressie(sortering.sleutel)})::text,
            ''
          )
        ) AS ${alias}
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
            WHEN ${alias} = ''
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

  const cursorVoorwaarde =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          WHERE g."positie" > (
            SELECT anker."positie"
            FROM "gerangschikt" anker
            WHERE anker.id = ${cursorId}
          )
        `;

  return prisma.$queryRaw<IngeplandeTerreincontroleSelectieRij[]>(Prisma.sql`
    WITH "gefilterd" AS (
      SELECT
        t.id,
        t."afgerond",
        t."auditeur",
        t."factuur_verzonden" AS "factuurVerzonden",
        t."status",
        t."inspectielocatie",
        t."bouwjaar",
        t."vloeroppervlakte_m2" AS "vloeroppervlakteM2",
        CASE
          WHEN t."datum_plaatsbezoek" IS NULL
          THEN NULL
          ELSE
            TO_CHAR(
              t."datum_plaatsbezoek",
              'YYYY-MM-DD'
            ) || 'T00:00:00.000Z'
        END AS "datumPlaatsbezoek",
        CASE
          WHEN t."uur_plaatsbezoek" IS NULL
          THEN NULL
          ELSE ${uurExpressie}
        END AS "uurPlaatsbezoek",
        t."ovam_id" AS "ovamId",
        t."naam_adi" AS "naamAdi",
        t."attest_url" AS "attestUrl",
        t."bedrijfsnaam",
        t."postcode",
        t."gemeente",
        t."straat",
        t."huisnummer",
        t."extra_adres_details" AS "extraAdresDetails",
        t."perceel_gemeente_code" AS "perceelGemeenteCode",
        t."perceel_afdelingscode" AS "perceelAfdelingscode",
        t."perceel_sectie_code" AS "perceelSectieCode",
        t."attest_id"::text AS "attestId",
        t."opmerkingen",
        COUNT(*) OVER()::integer AS "aantalTotaal",
        ${sorteerSelecties}
      FROM "terreincontroles" t
      WHERE ${voorwaarden}
    ),
    "gerangschikt" AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          ORDER BY
            ${sorteerVolgorde},
            id ASC
        ) AS "positie"
      FROM "gefilterd"
    )
    SELECT
      g.id,
      g."afgerond",
      g."auditeur",
      g."factuurVerzonden",
      g."status",
      g."inspectielocatie",
      g."bouwjaar",
      g."vloeroppervlakteM2",
      g."datumPlaatsbezoek",
      g."uurPlaatsbezoek",
      g."ovamId",
      g."naamAdi",
      g."attestUrl",
      g."bedrijfsnaam",
      g."postcode",
      g."gemeente",
      g."straat",
      g."huisnummer",
      g."extraAdresDetails",
      g."perceelGemeenteCode",
      g."perceelAfdelingscode",
      g."perceelSectieCode",
      g."attestId",
      g."opmerkingen",
      g."aantalTotaal"
    FROM "gerangschikt" g
    ${cursorVoorwaarde}
    ORDER BY g."positie" ASC
    LIMIT ${limiet + 1}
  `);
}

export async function laadIngeplandeTerreincontroleDashboardTellingen() {
  const [tellingen] = await prisma.$queryRaw<
    IngeplandeTerreincontroleDashboardTellingen[]
  >(Prisma.sql`
      SELECT
        COUNT(*)::integer
          AS "plaatsbezoeken",
        COUNT(*) FILTER (
          WHERE
            t."status"::text =
              'IN_OPMAAK'
        )::integer
          AS "inOpmaak",
        COUNT(*) FILTER (
          WHERE
            t."status"::text =
              'GEARCHIVEERD_ATTEST'
        )::integer
          AS "gearchiveerd",
        COUNT(*) FILTER (
          WHERE
            t."status"::text =
              'ACTUEEL_ATTEST'
        )::integer
          AS "actueelAttest",
        COUNT(*) FILTER (
          WHERE
            t."factuur_verzonden"
              IS FALSE
        )::integer
          AS "nietVerzondenFacturen"
      FROM
        "terreincontroles" t
      WHERE
        t."verwijderd_op" IS NULL
        AND t."afwezig_op" IS NULL
    `);

  return (
    tellingen ?? {
      plaatsbezoeken: 0,
      inOpmaak: 0,
      gearchiveerd: 0,
      actueelAttest: 0,
      nietVerzondenFacturen: 0,
    }
  );
}

export type IngeplandeTerreincontroleFilterwaarde = {
  waarde: string;
  aantal: number;
};

export function laadIngeplandeTerreincontroleFilterwaarden({
  kolom,
  zoekterm,
}: {
  kolom: IngeplandeTerreincontroleSortering;
  zoekterm: string;
}) {
  const expressie = sorteerExpressie(kolom);

  const zoekvoorwaarde = zoekterm
    ? Prisma.sql`
          AND ${bevat(expressie, zoekterm)}
        `
    : Prisma.empty;

  const limiet = kolom === "datumPlaatsbezoek" ? 2000 : 300;

  return prisma.$queryRaw<IngeplandeTerreincontroleFilterwaarde[]>(Prisma.sql`
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
      COUNT(*)::integer
        AS "aantal"
    FROM
      "terreincontroles" t
    WHERE
      t."verwijderd_op"
        IS NULL
      AND t."afwezig_op"
        IS NULL
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
        WHEN
          COALESCE(
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

import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";

import {
  type NaFinalisatieLijstcontract,
  type NaFinalisatieSortering,
  type NaFinalisatieTekstfilters,
} from "@/lib/na-finalisatie-lijstcontract";
import {
  prisma,
} from "@/lib/prisma";
import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type NaFinalisatieSelectieRij = {
  id: number;
  auditeur: string;
  naamAdi: string | null;
  geregistreerd: boolean;
  linkAttest: string;
  attestnummer: string;
  datumNaFinalisatie: string;
  plaatsbezoek: string;
  typeControle: string;
  reden: string | null;
  opmerking: string;
  inspectielocatie:
    string | null;
  naamBedrijf: string | null;
  persoonsId: string | null;
  attestId: string;
  aantalTotaal: number;
};

export type NaFinalisatieDashboardTellingen = {
  registraties: number;
  geregistreerd: number;
  nietGeregistreerd: number;
  spontaan: number;
  afspraakOfKlacht: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract:
    NaFinalisatieLijstcontract;
  sortering:
    NaFinalisatieSortering;
  richting:
    Sorteerrichting;
  limiet: number;
  cursorId: number | null;
};

const geregistreerdExpressie =
  Prisma.sql`
    CASE
      WHEN
        t."geregistreerd"
      THEN
        'Ja geregistreerd'
      ELSE
        'Nee niet geregistreerd'
    END
  `;

const plaatsbezoekExpressie =
  Prisma.sql`
    CASE
      WHEN
        t."plaatsbezoek"::text =
          'SPONTAAN'
      THEN 'Spontaan'
      WHEN
        t."plaatsbezoek"::text =
          'TELEFONISCHE_AFSPRAAK'
      THEN
        'Telefonische afspraak'
      WHEN
        t."plaatsbezoek"::text =
          'EMAILAFSPRAAK'
      THEN
        'E-mailafspraak'
      WHEN
        t."plaatsbezoek"::text =
          'KLACHT'
      THEN 'Klacht'
      ELSE
        COALESCE(
          t."plaatsbezoek"::text,
          ''
        )
    END
  `;

const typeControleExpressie =
  Prisma.sql`
    CASE
      WHEN
        t."type_controle"::text =
          'GEHEEL'
      THEN 'Geheel'
      WHEN
        t."type_controle"::text =
          'DEELS'
      THEN 'Deels'
      WHEN
        t."type_controle"::text =
          'ENKEL_OPENBARE_WEG'
      THEN
        'Enkel van openbare weg'
      ELSE
        COALESCE(
          t."type_controle"::text,
          ''
        )
    END
  `;

const datumSorteerExpressie =
  Prisma.sql`
    TO_CHAR(
      t."datum_na_finalisatie",
      'YYYY-MM-DD'
    )
  `;

const tekstExpressies: Record<
  keyof NaFinalisatieTekstfilters,
  Prisma.Sql
> = {
  auditeur:
    Prisma.sql`t."auditeur"`,
  naamAdi:
    Prisma.sql`t."naam_adi"`,
  geregistreerd:
    geregistreerdExpressie,
  linkAttest:
    Prisma.sql`t."link_attest"`,
  attestnummer:
    Prisma.sql`t."attestnummer"`,
  datumNaFinalisatie:
    datumSorteerExpressie,
  plaatsbezoek:
    plaatsbezoekExpressie,
  typeControle:
    typeControleExpressie,
  reden:
    Prisma.sql`t."reden"`,
  opmerking:
    Prisma.sql`t."opmerking"`,
  inspectielocatie:
    Prisma.sql`t."inspectielocatie"`,
  naamBedrijf:
    Prisma.sql`t."naam_bedrijf"`,
  persoonsId:
    Prisma.sql`t."persoons_id"`,
  attestId:
    Prisma.sql`t."attest_id"::text`,
};

function bevat(
  expressie: Prisma.Sql,
  waarde: string,
) {
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

const EXCEL_FILTER_PREFIX =
  "__excel__";

type ExcelWaardeFilter = {
  modus:
    | "insluiten"
    | "uitsluiten";
  waarden: string[];
  legeCellenGeselecteerd:
    boolean;
};

function leesExcelWaardeFilter(
  waarde: string,
): ExcelWaardeFilter | null {
  if (
    !waarde.startsWith(
      EXCEL_FILTER_PREFIX,
    )
  ) {
    return null;
  }

  try {
    const inhoud =
      JSON.parse(
        decodeURIComponent(
          waarde.slice(
            EXCEL_FILTER_PREFIX.length,
          ),
        ),
      ) as unknown;

    if (
      typeof inhoud !==
        "object" ||
      inhoud === null
    ) {
      throw new Error(
        "Ongeldige filterinhoud.",
      );
    }

    const kandidaat =
      inhoud as Record<
        string,
        unknown
      >;

    if (
      (
        kandidaat.modus !==
          "insluiten" &&
        kandidaat.modus !==
          "uitsluiten"
      ) ||
      !Array.isArray(
        kandidaat.waarden,
      ) ||
      typeof kandidaat
        .legeCellenGeselecteerd !==
        "boolean"
    ) {
      throw new Error(
        "Ongeldige filtervelden.",
      );
    }

    if (
      kandidaat.waarden.length >
      2000
    ) {
      throw new Error(
        "Te veel filterwaarden.",
      );
    }

    const waarden =
      kandidaat.waarden.map(
        (item) => {
          if (
            typeof item !==
              "string" ||
            item.length > 500
          ) {
            throw new Error(
              "Ongeldige filterwaarde.",
            );
          }

          return item.trim();
        },
      );

    return {
      modus:
        kandidaat.modus,
      waarden:
        Array.from(
          new Set(
            waarden.filter(
              (item) =>
                item !== "",
            ),
          ),
        ),
      legeCellenGeselecteerd:
        kandidaat
          .legeCellenGeselecteerd,
    };
  } catch {
    throw new OngeldigePagineringFout(
      "De gekozen filterwaarden zijn ongeldig.",
    );
  }
}

function maakTekstfilter(
  expressie: Prisma.Sql,
  waarde: string,
) {
  const excelFilter =
    leesExcelWaardeFilter(
      waarde,
    );

  if (!excelFilter) {
    return bevat(
      expressie,
      waarde,
    );
  }

  const genormaliseerd =
    Prisma.sql`
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

  if (
    excelFilter.modus ===
    "insluiten"
  ) {
    const voorwaarden:
      Prisma.Sql[] = [];

    if (
      excelFilter
        .waarden.length > 0
    ) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerd}
          IN (
            ${Prisma.join(
              excelFilter.waarden,
            )}
          )
        `,
      );
    }

    if (
      excelFilter
        .legeCellenGeselecteerd
    ) {
      voorwaarden.push(
        Prisma.sql`
          ${genormaliseerd} = ''
        `,
      );
    }

    if (
      voorwaarden.length === 0
    ) {
      return Prisma.sql`
        FALSE
      `;
    }

    return Prisma.sql`
      (
        ${Prisma.join(
          voorwaarden,
          " OR ",
        )}
      )
    `;
  }

  const voorwaarden:
    Prisma.Sql[] = [];

  if (
    excelFilter
      .waarden.length > 0
  ) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerd}
        NOT IN (
          ${Prisma.join(
            excelFilter.waarden,
          )}
        )
      `,
    );
  }

  if (
    !excelFilter
      .legeCellenGeselecteerd
  ) {
    voorwaarden.push(
      Prisma.sql`
        ${genormaliseerd} <> ''
      `,
    );
  }

  if (
    voorwaarden.length === 0
  ) {
    return Prisma.sql`
      TRUE
    `;
  }

  return Prisma.sql`
    (
      ${Prisma.join(
        voorwaarden,
        " AND ",
      )}
    )
  `;
}

function sorteerExpressie(
  sortering:
    NaFinalisatieSortering,
) {
  if (
    sortering ===
    "datumNaFinalisatie"
  ) {
    return datumSorteerExpressie;
  }

  return tekstExpressies[
    sortering
  ];
}

function maakFiltervoorwaarden({
  zoekterm,
  contract,
}: {
  zoekterm: string;
  contract:
    NaFinalisatieLijstcontract;
}) {
  const voorwaarden:
    Prisma.Sql[] = [
      Prisma.sql`
        t."verwijderd_op" IS NULL
      `,
    ];

  if (zoekterm) {
    const algemeneExpressie =
      Prisma.sql`
        CONCAT_WS(
          ' ',
          t."auditeur",
          t."naam_adi",
          ${geregistreerdExpressie},
          t."link_attest",
          t."attestnummer",
          TO_CHAR(
            t."datum_na_finalisatie",
            'DD/MM/YYYY'
          ),
          TO_CHAR(
            t."datum_na_finalisatie",
            'YYYY-MM-DD'
          ),
          ${plaatsbezoekExpressie},
          ${typeControleExpressie},
          t."reden",
          t."opmerking",
          t."inspectielocatie",
          t."naam_bedrijf",
          t."persoons_id",
          t."attest_id"::text
        )
      `;

    voorwaarden.push(
      bevat(
        algemeneExpressie,
        zoekterm,
      ),
    );
  }

  for (
    const [
      sleutel,
      waarde,
    ] of Object.entries(
      contract.tekstfilters,
    ) as [
      keyof NaFinalisatieTekstfilters,
      string,
    ][]
  ) {
    if (!waarde) {
      continue;
    }

    voorwaarden.push(
      maakTekstfilter(
        tekstExpressies[
          sleutel
        ],
        waarde,
      ),
    );
  }

  if (
    contract
      .datumNaFinalisatieJaar !==
    null
  ) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          YEAR FROM
          t."datum_na_finalisatie"
        ) =
        ${contract.datumNaFinalisatieJaar}
      `,
    );
  }

  if (
    contract
      .datumNaFinalisatieMaand !==
    null
  ) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          MONTH FROM
          t."datum_na_finalisatie"
        ) =
        ${contract.datumNaFinalisatieMaand}
      `,
    );
  }

  return Prisma.join(
    voorwaarden,
    " AND ",
  );
}

function valideerInvoer({
  limiet,
  cursorId,
}: Pick<
  SelectieInvoer,
  "limiet" | "cursorId"
>) {
  if (
    !Number.isInteger(limiet) ||
    limiet < 1 ||
    limiet > 50
  ) {
    throw new OngeldigePagineringFout(
      "De paginalimiet voor Na finalisatie is ongeldig.",
    );
  }

  if (
    cursorId !== null &&
    (
      !Number.isInteger(
        cursorId,
      ) ||
      cursorId <= 0
    )
  ) {
    throw new OngeldigePagineringFout(
      "De cursor voor Na finalisatie is ongeldig.",
    );
  }
}

export function laadNaFinalisatieSelectie({
  zoekterm,
  contract,
  sortering,
  richting,
  limiet,
  cursorId,
}: SelectieInvoer) {
  valideerInvoer({
    limiet,
    cursorId,
  });

  const voorwaarden =
    maakFiltervoorwaarden({
      zoekterm,
      contract,
    });

  const sorteerWaarde =
    sorteerExpressie(
      sortering,
    );

  const richtingSql =
    richting === "asc"
      ? Prisma.sql`ASC`
      : Prisma.sql`DESC`;

  const waardeVergelijking =
    richting === "asc"
      ? Prisma.sql`
          g."sorteerWaarde" >
            c."sorteerWaarde"
        `
      : Prisma.sql`
          g."sorteerWaarde" <
            c."sorteerWaarde"
        `;

  const idVergelijking =
    richting === "asc"
      ? Prisma.sql`
          g.id > c.id
        `
      : Prisma.sql`
          g.id < c.id
        `;

  const cursorJoin =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          CROSS JOIN
            "cursorRij" c
        `;

  const cursorVoorwaarde =
    cursorId === null
      ? Prisma.sql`TRUE`
      : Prisma.sql`
          (
            g."isLeeg" >
              c."isLeeg"
            OR (
              g."isLeeg" =
                c."isLeeg"
              AND (
                (
                  g."isLeeg" = 1
                  AND
                  ${idVergelijking}
                )
                OR (
                  g."isLeeg" = 0
                  AND (
                    ${waardeVergelijking}
                    OR (
                      g."sorteerWaarde"
                        IS NOT DISTINCT FROM
                      c."sorteerWaarde"
                      AND
                      ${idVergelijking}
                    )
                  )
                )
              )
            )
          )
        `;

  return prisma.$queryRaw<
    NaFinalisatieSelectieRij[]
  >(Prisma.sql`
    WITH "gefilterd" AS (
      SELECT
        t.id,
        t."auditeur",
        t."naam_adi"
          AS "naamAdi",
        t."geregistreerd",
        t."link_attest"
          AS "linkAttest",
        t."attestnummer",
        TO_CHAR(
          t."datum_na_finalisatie",
          'YYYY-MM-DD'
        ) ||
        'T00:00:00.000Z'
          AS "datumNaFinalisatie",
        t."plaatsbezoek"::text
          AS "plaatsbezoek",
        t."type_controle"::text
          AS "typeControle",
        t."reden",
        t."opmerking",
        t."inspectielocatie",
        t."naam_bedrijf"
          AS "naamBedrijf",
        t."persoons_id"
          AS "persoonsId",
        t."attest_id"::text
          AS "attestId",
        COUNT(*) OVER()::integer
          AS "aantalTotaal",
        CASE
          WHEN
            ${sorteerWaarde}
              IS NULL
            OR BTRIM(
              (${sorteerWaarde})::text
            ) = ''
          THEN 1
          ELSE 0
        END AS "isLeeg",
        LOWER(
          COALESCE(
            (${sorteerWaarde})::text,
            ''
          )
        ) AS "sorteerWaarde"
      FROM
        "na_finalisatie" t
      WHERE
        ${voorwaarden}
    ),
    "cursorRij" AS (
      SELECT
        g.id,
        g."isLeeg",
        g."sorteerWaarde"
      FROM
        "gefilterd" g
      WHERE
        g.id =
          ${cursorId ?? -1}
    )
    SELECT
      g.id,
      g."auditeur",
      g."naamAdi",
      g."geregistreerd",
      g."linkAttest",
      g."attestnummer",
      g."datumNaFinalisatie",
      g."plaatsbezoek",
      g."typeControle",
      g."reden",
      g."opmerking",
      g."inspectielocatie",
      g."naamBedrijf",
      g."persoonsId",
      g."attestId",
      g."aantalTotaal"
    FROM
      "gefilterd" g
    ${cursorJoin}
    WHERE
      ${cursorVoorwaarde}
    ORDER BY
      g."isLeeg" ASC,
      g."sorteerWaarde"
        ${richtingSql},
      g.id ${richtingSql}
    LIMIT ${limiet + 1}
  `);
}

export type NaFinalisatieFilterwaarde = {
  waarde: string;
  aantal: number;
};

export async function laadNaFinalisatieFilterwaarden({
  kolom,
  zoekterm,
}: {
  kolom:
    NaFinalisatieSortering;
  zoekterm: string;
}) {
  const expressie =
    sorteerExpressie(
      kolom,
    );

  const zoekvoorwaarde =
    zoekterm
      ? Prisma.sql`
          AND ${bevat(
            expressie,
            zoekterm,
          )}
        `
      : Prisma.empty;

  const limiet =
    kolom ===
    "datumNaFinalisatie"
      ? 2000
      : 300;

  return prisma.$queryRaw<
    NaFinalisatieFilterwaarde[]
  >(Prisma.sql`
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
      "na_finalisatie" t
    WHERE
      t."verwijderd_op" IS NULL
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

export async function laadNaFinalisatieDashboardTellingen() {
  const [tellingen] =
    await prisma.$queryRaw<
      NaFinalisatieDashboardTellingen[]
    >(Prisma.sql`
      SELECT
        COUNT(*)::integer
          AS "registraties",
        COUNT(*) FILTER (
          WHERE
            n."geregistreerd" =
              TRUE
        )::integer
          AS "geregistreerd",
        COUNT(*) FILTER (
          WHERE
            n."geregistreerd" =
              FALSE
        )::integer
          AS "nietGeregistreerd",
        COUNT(*) FILTER (
          WHERE
            n."plaatsbezoek"::text =
              'SPONTAAN'
        )::integer
          AS "spontaan",
        COUNT(*) FILTER (
          WHERE
            n."plaatsbezoek"::text <>
              'SPONTAAN'
        )::integer
          AS "afspraakOfKlacht"
      FROM
        "na_finalisatie" n
      WHERE
        n."verwijderd_op" IS NULL
    `);

  return tellingen ?? {
    registraties: 0,
    geregistreerd: 0,
    nietGeregistreerd: 0,
    spontaan: 0,
    afspraakOfKlacht: 0,
  };
}

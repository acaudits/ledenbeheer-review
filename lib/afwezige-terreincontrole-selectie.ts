import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";

import {
  type AfwezigeTerreincontroleLijstcontract,
  type AfwezigeTerreincontroleSortering,
  type AfwezigeTerreincontroleTekstfilters,
} from "@/lib/afwezige-terreincontrole-lijstcontract";
import {
  prisma,
} from "@/lib/prisma";
import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type AfwezigeTerreincontroleSelectieRij = {
  id: number;
  auditeur: string | null;
  factuurVerzonden: boolean;
  status:
    | "GEARCHIVEERD_ATTEST"
    | "ACTUEEL_ATTEST"
    | "IN_OPMAAK"
    | null;
  inspectielocatie: string | null;
  bouwjaar: number | null;
  vloeroppervlakteM2:
    string | null;
  datumPlaatsbezoek:
    string | null;
  uurPlaatsbezoek:
    string | null;
  ovamId: string | null;
  naamAdi: string | null;
  attestUrl: string | null;
  bedrijfsnaam: string | null;
  postcode: string | null;
  gemeente: string | null;
  straat: string | null;
  huisnummer: string | null;
  extraAdresDetails:
    string | null;
  perceelGemeenteCode:
    string | null;
  perceelAfdelingscode:
    string | null;
  perceelSectieCode:
    string | null;
  attestId: string;
  opmerkingen: string | null;
  afwezigReden: string | null;
  ovamIdRood: boolean;
  aantalTotaal: number;
};

export type AfwezigeTerreincontroleDashboardTellingen = {
  aantalAfwezigen: number;
  facturenVerzonden: number;
  aantalRodePersoonsIds:
    number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract:
    AfwezigeTerreincontroleLijstcontract;
  sortering:
    AfwezigeTerreincontroleSortering;
  richting:
    Sorteerrichting;
  limiet: number;
  cursorId: number | null;
};

const statusExpressie =
  Prisma.sql`
    COALESCE(
      t."status"::text,
      ''
    )
  `;

const factuurExpressie =
  Prisma.sql`
    CASE
      WHEN COALESCE(
        t."factuur_verzonden",
        FALSE
      )
      THEN 'Ja'
      ELSE 'Nee'
    END
  `;

const datumSorteerExpressie =
  Prisma.sql`
    TO_CHAR(
      t."datum_plaatsbezoek",
      'YYYY-MM-DD'
    )
  `;

const uurExpressie =
  Prisma.sql`
    TO_CHAR(
      t."uur_plaatsbezoek",
      'HH24:MI'
    )
  `;

const tekstExpressies: Record<
  keyof AfwezigeTerreincontroleTekstfilters,
  Prisma.Sql
> = {
  status:
    statusExpressie,
  auditeur:
    Prisma.sql`t."auditeur"`,
  factuurVerzonden:
    factuurExpressie,
  inspectielocatie:
    Prisma.sql`t."inspectielocatie"`,
  bouwjaar:
    Prisma.sql`t."bouwjaar"`,
  vloeroppervlakteM2:
    Prisma.sql`t."vloeroppervlakte_m2"`,
  uurPlaatsbezoek:
    uurExpressie,
  ovamId:
    Prisma.sql`t."ovam_id"`,
  naamAdi:
    Prisma.sql`t."naam_adi"`,
  attestUrl:
    Prisma.sql`t."attest_url"`,
  bedrijfsnaam:
    Prisma.sql`t."bedrijfsnaam"`,
  postcode:
    Prisma.sql`t."postcode"`,
  gemeente:
    Prisma.sql`t."gemeente"`,
  straat:
    Prisma.sql`t."straat"`,
  huisnummer:
    Prisma.sql`t."huisnummer"`,
  extraAdresDetails:
    Prisma.sql`t."extra_adres_details"`,
  perceelGemeenteCode:
    Prisma.sql`t."perceel_gemeente_code"`,
  perceelAfdelingscode:
    Prisma.sql`t."perceel_afdelingscode"`,
  perceelSectieCode:
    Prisma.sql`t."perceel_sectie_code"`,
  attestId:
    Prisma.sql`t."attest_id"::text`,
  opmerkingen:
    Prisma.sql`t."opmerkingen"`,
  afwezigReden:
    Prisma.sql`t."afwezig_reden"`,
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

function sorteerExpressie(
  sortering:
    AfwezigeTerreincontroleSortering,
) {
  if (
    sortering ===
    "datumPlaatsbezoek"
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
    AfwezigeTerreincontroleLijstcontract;
}) {
  const voorwaarden:
    Prisma.Sql[] = [
      Prisma.sql`
        t."verwijderd_op" IS NULL
        AND t."afwezig_op" IS NOT NULL
      `,
    ];

  if (zoekterm) {
    const algemeneExpressie =
      Prisma.sql`
        CONCAT_WS(
          ' ',
          t."auditeur",
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
          t."opmerkingen",
          t."afwezig_reden"
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
      keyof AfwezigeTerreincontroleTekstfilters,
      string,
    ][]
  ) {
    if (!waarde) {
      continue;
    }

    voorwaarden.push(
      bevat(
        tekstExpressies[
          sleutel
        ],
        waarde,
      ),
    );
  }

  if (contract.alleenRood) {
    voorwaarden.push(
      Prisma.sql`
        NULLIF(
          BTRIM(
            COALESCE(
              t."ovam_id",
              ''
            )
          ),
          ''
        ) IS NOT NULL
        AND (
          SELECT
            COUNT(*)
          FROM
            "terreincontroles" herhaling
          WHERE
            herhaling."verwijderd_op"
              IS NULL
            AND herhaling."afwezig_op"
              IS NOT NULL
            AND UPPER(
              BTRIM(
                herhaling."ovam_id"
              )
            ) = UPPER(
              BTRIM(
                t."ovam_id"
              )
            )
        ) >= 2
      `,
    );
  }

  if (
    contract
      .datumPlaatsbezoekJaar !==
    null
  ) {
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

  if (
    contract
      .datumPlaatsbezoekMaand !==
    null
  ) {
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
      "De paginalimiet voor afwezige terreincontroles is ongeldig.",
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
      "De cursor voor afwezige terreincontroles is ongeldig.",
    );
  }
}

export function laadAfwezigeTerreincontroleSelectie({
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
    AfwezigeTerreincontroleSelectieRij[]
  >(Prisma.sql`
    WITH "gefilterd" AS (
      SELECT
        t.id,
        t."auditeur",
        COALESCE(
          t."factuur_verzonden",
          FALSE
        ) AS "factuurVerzonden",
        t."status",
        t."inspectielocatie",
        t."bouwjaar",
        t."vloeroppervlakte_m2"
          AS "vloeroppervlakteM2",
        CASE
          WHEN
            t."datum_plaatsbezoek"
              IS NULL
          THEN NULL
          ELSE
            TO_CHAR(
              t."datum_plaatsbezoek",
              'YYYY-MM-DD'
            ) ||
            'T00:00:00.000Z'
        END AS "datumPlaatsbezoek",
        CASE
          WHEN
            t."uur_plaatsbezoek"
              IS NULL
          THEN NULL
          ELSE
            ${uurExpressie}
        END AS "uurPlaatsbezoek",
        t."ovam_id" AS "ovamId",
        t."naam_adi" AS "naamAdi",
        t."attest_url" AS "attestUrl",
        t."bedrijfsnaam",
        t."postcode",
        t."gemeente",
        t."straat",
        t."huisnummer",
        t."extra_adres_details"
          AS "extraAdresDetails",
        t."perceel_gemeente_code"
          AS "perceelGemeenteCode",
        t."perceel_afdelingscode"
          AS "perceelAfdelingscode",
        t."perceel_sectie_code"
          AS "perceelSectieCode",
        t."attest_id"::text
          AS "attestId",
        t."opmerkingen",
        t."afwezig_reden"
          AS "afwezigReden",
        CASE
          WHEN NULLIF(
            BTRIM(
              COALESCE(
                t."ovam_id",
                ''
              )
            ),
            ''
          ) IS NULL
          THEN FALSE
          ELSE (
            SELECT
              COUNT(*) >= 2
            FROM
              "terreincontroles" herhaling
            WHERE
              herhaling."verwijderd_op"
                IS NULL
              AND herhaling."afwezig_op"
                IS NOT NULL
              AND UPPER(
                BTRIM(
                  herhaling."ovam_id"
                )
              ) = UPPER(
                BTRIM(
                  t."ovam_id"
                )
              )
          )
        END AS "ovamIdRood",
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
        "terreincontroles" t
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
      g."afwezigReden",
      g."ovamIdRood",
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

export async function laadAfwezigeTerreincontroleDashboardTellingen() {
  const [tellingen] =
    await prisma.$queryRaw<
      AfwezigeTerreincontroleDashboardTellingen[]
    >(Prisma.sql`
      SELECT
        COUNT(*)::integer
          AS "aantalAfwezigen",
        COUNT(*) FILTER (
          WHERE
            COALESCE(
              t."factuur_verzonden",
              FALSE
            ) = TRUE
        )::integer
          AS "facturenVerzonden",
        (
          SELECT
            COUNT(*)::integer
          FROM (
            SELECT
              UPPER(
                BTRIM(
                  herhaling."ovam_id"
                )
              )
                AS "genormaliseerdOvamId"
            FROM
              "terreincontroles"
                herhaling
            WHERE
              herhaling."verwijderd_op"
                IS NULL
              AND herhaling."afwezig_op"
                IS NOT NULL
              AND NULLIF(
                BTRIM(
                  COALESCE(
                    herhaling."ovam_id",
                    ''
                  )
                ),
                ''
              ) IS NOT NULL
            GROUP BY
              UPPER(
                BTRIM(
                  herhaling."ovam_id"
                )
              )
            HAVING
              COUNT(*) >= 2
          ) rode_ids
        ) AS "aantalRodePersoonsIds"
      FROM
        "terreincontroles" t
      WHERE
        t."verwijderd_op" IS NULL
        AND t."afwezig_op" IS NOT NULL
    `);

  return tellingen ?? {
    aantalAfwezigen: 0,
    facturenVerzonden: 0,
    aantalRodePersoonsIds:
      0,
  };
}

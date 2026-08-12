import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";

import {
  type LaattijdigePlaatsbezoekenLijstcontract,
  type LaattijdigePlaatsbezoekenSortering,
  type LaattijdigePlaatsbezoekenTekstfilters,
} from "@/lib/laattijdige-plaatsbezoeken-lijstcontract";
import {
  prisma,
} from "@/lib/prisma";
import {
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type LaattijdigPlaatsbezoekSelectieRij = {
  id: number;
  startMomentIso: string;
  naamAdi: string;
  bedrijfsnaam: string;
  aantalAttesten: number;
  laatsteTerreincontrole: string;
  aantalTerreincontroles: number;
  terreincontroleNodig: boolean;
  waarschuwingTerreincontrole: boolean;
  inspectielocatie: string;
  latitude: number | null;
  longitude: number | null;
  datum: string;
  tijdstip: string;
  reden: string;
  gemeenschappelijkeDelen: string;
  extraAdresdetails: string;
  aangemeldOp: string;
  aantalTotaal: number;
};

export type LaattijdigePlaatsbezoekenOverzicht = {
  plaatsbezoeken: number;
  meldingen: number;
  referentieTijdIso: string;
};

type SelectieInvoer = {
  zoekterm: string;
  contract:
    LaattijdigePlaatsbezoekenLijstcontract;
  sortering:
    LaattijdigePlaatsbezoekenSortering;
  richting:
    Sorteerrichting;
  limiet: number;
  cursorId: number | null;
};

const tekstExpressies: Record<
  keyof LaattijdigePlaatsbezoekenTekstfilters,
  Prisma.Sql
> = {
  timer:
    Prisma.sql`b."timerTekst"`,
  naamAdi:
    Prisma.sql`b."naamAdi"`,
  bedrijfsnaam:
    Prisma.sql`b."bedrijfsnaam"`,
  aantalAttesten:
    Prisma.sql`b."aantalAttesten"`,
  laatsteTerreincontrole:
    Prisma.sql`b."laatsteTerreincontrole"`,
  aantalTerreincontroles:
    Prisma.sql`b."aantalTerreincontroles"`,
  inspectielocatie:
    Prisma.sql`b."inspectielocatie"`,
  tijdstip:
    Prisma.sql`b."tijdstip"`,
  gemeenschappelijkeDelen:
    Prisma.sql`b."gemeenschappelijkeDelen"`,
  extraAdresdetails:
    Prisma.sql`b."extraAdresdetails"`,
  reden:
    Prisma.sql`b."reden"`,
  aangemeldOp:
    Prisma.sql`b."aangemeldOp"`,
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
    LaattijdigePlaatsbezoekenSortering,
) {
  if (
    sortering === "timer"
  ) {
    return Prisma.sql`
      b."startMomentIso"
    `;
  }

  if (
    sortering === "datum"
  ) {
    return Prisma.sql`
      b."datumSorteer"
    `;
  }

  if (
    sortering === "aangemeldOp"
  ) {
    return Prisma.sql`
      b."aangemeldOpSorteer"
    `;
  }

  if (
    sortering === "aantalAttesten"
  ) {
    return Prisma.sql`
      LPAD(
        b."aantalAttesten"::text,
        12,
        '0'
      )
    `;
  }

  if (
    sortering ===
    "aantalTerreincontroles"
  ) {
    return Prisma.sql`
      LPAD(
        b."aantalTerreincontroles"::text,
        12,
        '0'
      )
    `;
  }

  return Prisma.sql`
    LOWER(
      COALESCE(
        (${tekstExpressies[
          sortering
        ]})::text,
        ''
      )
    )
  `;
}

function maakFiltervoorwaarden({
  zoekterm,
  contract,
}: {
  zoekterm: string;
  contract:
    LaattijdigePlaatsbezoekenLijstcontract;
}) {
  const voorwaarden:
    Prisma.Sql[] = [];

  if (zoekterm) {
    voorwaarden.push(
      bevat(
        Prisma.sql`
          CONCAT_WS(
            ' ',
            b."timerTekst",
            b."naamAdi",
            b."bedrijfsnaam",
            b."aantalAttesten",
            b."laatsteTerreincontrole",
            b."aantalTerreincontroles",
            b."inspectielocatie",
            b."datum",
            b."tijdstip",
            b."gemeenschappelijkeDelen",
            b."extraAdresdetails",
            b."reden",
            b."aangemeldOp"
          )
        `,
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
    ) as Array<
      [
        keyof LaattijdigePlaatsbezoekenTekstfilters,
        string,
      ]
    >
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

  if (
    contract.datumPlaatsbezoekJaar !==
    null
  ) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          YEAR FROM
            b."datumPlaatsbezoek"
        )::integer =
          ${contract.datumPlaatsbezoekJaar}
      `,
    );
  }

  if (
    contract.datumPlaatsbezoekMaand !==
    null
  ) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          MONTH FROM
            b."datumPlaatsbezoek"
        )::integer =
          ${contract.datumPlaatsbezoekMaand}
      `,
    );
  }

  if (voorwaarden.length === 0) {
    return Prisma.sql`TRUE`;
  }

  return Prisma.join(
    voorwaarden,
    " AND ",
  );
}

export async function selecteerLaattijdigePlaatsbezoeken({
  zoekterm,
  contract,
  sortering,
  richting,
  limiet,
  cursorId,
}: SelectieInvoer) {
  const filtervoorwaarden =
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

  const cursorJoin =
    cursorId === null
      ? Prisma.sql``
      : Prisma.sql`
          CROSS JOIN "cursorRij" c
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
                ${
                  richting === "asc"
                    ? Prisma.sql`
                        g."sorteerWaarde" >
                          c."sorteerWaarde"
                      `
                    : Prisma.sql`
                        g."sorteerWaarde" <
                          c."sorteerWaarde"
                      `
                }
                OR (
                  g."sorteerWaarde" =
                    c."sorteerWaarde"
                  AND
                    g.id
                    ${
                      richting === "asc"
                        ? Prisma.sql`>`
                        : Prisma.sql`<`
                    }
                    c.id
                )
              )
            )
          )
        `;

  return prisma.$queryRaw<
    LaattijdigPlaatsbezoekSelectieRij[]
  >(Prisma.sql`
    WITH
      "attestTellingen" AS (
        SELECT
          LOWER(
            BTRIM(
              a."persoons_id"
            )
          ) AS "ovamSleutel",
          MAX(
            a."aantal_attesten"
          )::integer
            AS "aantalAttesten"
        FROM
          "attest_persoon_statistieken"
            a
        GROUP BY
          LOWER(
            BTRIM(
              a."persoons_id"
            )
          )
      ),
      "controleTellingen" AS (
        SELECT
          LOWER(
            BTRIM(
              t."ovam_id"
            )
          ) AS "ovamSleutel",
          COUNT(*)::integer
            AS "aantalTerreincontroles",
          MAX(
            t."datum_plaatsbezoek"
          ) AS "laatsteTerreincontrole"
        FROM
          "terreincontroles" t
        WHERE
          t."verwijderd_op"
            IS NULL
          AND t."ovam_id"
            IS NOT NULL
          AND BTRIM(
            t."ovam_id"
          ) <> ''
        GROUP BY
          LOWER(
            BTRIM(
              t."ovam_id"
            )
          )
      ),
      "bron" AS (
        SELECT
          p.id,
          p."datum_plaatsbezoek"
            AS "datumPlaatsbezoek",
          TO_CHAR(
            (
              p."datum_plaatsbezoek" +
              p."tijdstip"
            )
              AT TIME ZONE
                'Europe/Brussels'
              AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ) AS "startMomentIso",
          CASE
            WHEN (
              p."datum_plaatsbezoek" +
              p."tijdstip"
            ) AT TIME ZONE
                'Europe/Brussels' >
              CURRENT_TIMESTAMP
            THEN
              'Toekomstig Tot plaatsbezoek'
            WHEN (
              p."datum_plaatsbezoek" +
              p."tijdstip"
            ) AT TIME ZONE
                'Europe/Brussels' >
              CURRENT_TIMESTAMP -
                INTERVAL '1 hour'
            THEN
              'Begonnen'
            ELSE
              'Verlopen'
          END AS "timerTekst",
          m."naam_adi"
            AS "naamAdi",
          m."bedrijfsnaam",
          COALESCE(
            a."aantalAttesten",
            0
          )::integer
            AS "aantalAttesten",
          CASE
            WHEN
              c."laatsteTerreincontrole"
                IS NULL
            THEN 'Nooit'
            ELSE
              TO_CHAR(
                c."laatsteTerreincontrole",
                'DD/MM/YYYY'
              )
          END
            AS "laatsteTerreincontrole",
          COALESCE(
            c."aantalTerreincontroles",
            0
          )::integer
            AS "aantalTerreincontroles",
          (
            COALESCE(
              c."aantalTerreincontroles",
              0
            ) <
            CASE
              WHEN COALESCE(
                a."aantalAttesten",
                0
              ) > 0
              THEN LEAST(
                4,
                CEIL(
                  a."aantalAttesten" /
                    100.0
                )::integer
              )
              ELSE 0
            END
          ) AS "terreincontroleNodig",
          (
            COALESCE(
              c."aantalTerreincontroles",
              0
            ) <
            CASE
              WHEN COALESCE(
                a."aantalAttesten",
                0
              ) > 0
              THEN LEAST(
                4,
                CEIL(
                  a."aantalAttesten" /
                    100.0
                )::integer
              )
              ELSE 0
            END
            AND (
              c."laatsteTerreincontrole"
                IS NULL
              OR
                c."laatsteTerreincontrole" <
                (
                  CURRENT_TIMESTAMP
                    AT TIME ZONE 'UTC'
                )::date - 14
            )
          ) AS
            "waarschuwingTerreincontrole",
          p."inspectielocatie",
          p."latitude"::double precision
            AS "latitude",
          p."longitude"::double precision
            AS "longitude",
          TO_CHAR(
            p."datum_plaatsbezoek",
            'DD/MM/YYYY'
          ) AS "datum",
          TO_CHAR(
            p."datum_plaatsbezoek",
            'YYYY-MM-DD'
          ) AS "datumSorteer",
          TO_CHAR(
            p."tijdstip",
            'HH24:MI'
          ) AS "tijdstip",
          p."reden",
          CASE
            WHEN
              p."gemeenschappelijke_delen"
            THEN 'Ja'
            ELSE 'Nee'
          END
            AS "gemeenschappelijkeDelen",
          COALESCE(
            p."extra_adresdetails",
            ''
          ) AS "extraAdresdetails",
          TO_CHAR(
            m."aangemeld_op"
              AT TIME ZONE
                'Europe/Brussels',
            'DD/MM/YYYY, HH24:MI'
          ) AS "aangemeldOp",
          TO_CHAR(
            m."aangemeld_op"
              AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS'
          ) AS "aangemeldOpSorteer"
        FROM
          "laattijdige_plaatsbezoeken"
            p
        INNER JOIN
          "laattijdige_plaatsbezoek_meldingen"
            m
          ON m.id =
            p."melding_id"
        INNER JOIN
          "leden" l
          ON l.id =
            m."lid_id"
        LEFT JOIN
          "attestTellingen" a
          ON a."ovamSleutel" =
            LOWER(
              BTRIM(
                l."ovam_id"
              )
            )
        LEFT JOIN
          "controleTellingen" c
          ON c."ovamSleutel" =
            LOWER(
              BTRIM(
                l."ovam_id"
              )
            )
      ),
      "gefilterd" AS (
        SELECT
          b.*,
          COUNT(*) OVER()::integer
            AS "aantalTotaal",
          (${sorteerWaarde})::text
            AS "sorteerWaarde",
          CASE
            WHEN
              ${sorteerWaarde}
                IS NULL
              OR BTRIM(
                (${sorteerWaarde})::text
              ) = ''
            THEN 1
            ELSE 0
          END AS "isLeeg"
        FROM
          "bron" b
        WHERE
          ${filtervoorwaarden}
      ),
      "cursorRij" AS (
        SELECT
          g.id,
          g."sorteerWaarde",
          g."isLeeg"
        FROM
          "gefilterd" g
        WHERE
          g.id = ${cursorId}
      )
    SELECT
      g.id,
      g."startMomentIso",
      g."naamAdi",
      g."bedrijfsnaam",
      g."aantalAttesten",
      g."laatsteTerreincontrole",
      g."aantalTerreincontroles",
      g."terreincontroleNodig",
      g."waarschuwingTerreincontrole",
      g."inspectielocatie",
      g."latitude",
      g."longitude",
      g."datum",
      g."tijdstip",
      g."reden",
      g."gemeenschappelijkeDelen",
      g."extraAdresdetails",
      g."aangemeldOp",
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

export async function laadLaattijdigePlaatsbezoekenOverzicht() {
  const [overzicht] =
    await prisma.$queryRaw<
      LaattijdigePlaatsbezoekenOverzicht[]
    >(Prisma.sql`
      SELECT
        (
          SELECT
            COUNT(*)::integer
          FROM
            "laattijdige_plaatsbezoeken"
        ) AS "plaatsbezoeken",
        (
          SELECT
            COUNT(*)::integer
          FROM
            "laattijdige_plaatsbezoek_meldingen"
        ) AS "meldingen",
        TO_CHAR(
          CURRENT_TIMESTAMP
            AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        ) AS "referentieTijdIso"
    `);

  return overzicht ?? {
    plaatsbezoeken: 0,
    meldingen: 0,
    referentieTijdIso:
      new Date(0).toISOString(),
  };
}

export type LaattijdigPlaatsbezoekKaartRij = {
  id: number;
  status: "ROOD" | "GROEN";
  knippert: boolean;
  naamAdi: string;
  bedrijfsnaam: string;
  inspectielocatie: string;
  datum: string;
  tijdstip: string;
  latitude: number;
  longitude: number;
};

export async function laadLaattijdigePlaatsbezoekenKaart() {
  return prisma.$queryRaw<
    LaattijdigPlaatsbezoekKaartRij[]
  >(Prisma.sql`
    WITH
      "attestTellingen" AS (
        SELECT
          LOWER(
            BTRIM(
              a."persoons_id"
            )
          ) AS "ovamSleutel",
          MAX(
            a."aantal_attesten"
          )::integer
            AS "aantalAttesten"
        FROM
          "attest_persoon_statistieken"
            a
        GROUP BY
          LOWER(
            BTRIM(
              a."persoons_id"
            )
          )
      ),
      "controleTellingen" AS (
        SELECT
          LOWER(
            BTRIM(
              t."ovam_id"
            )
          ) AS "ovamSleutel",
          COUNT(*)::integer
            AS "aantalTerreincontroles",
          MAX(
            t."datum_plaatsbezoek"
          ) AS "laatsteTerreincontrole"
        FROM
          "terreincontroles" t
        WHERE
          t."verwijderd_op"
            IS NULL
          AND t."ovam_id"
            IS NOT NULL
          AND BTRIM(
            t."ovam_id"
          ) <> ''
        GROUP BY
          LOWER(
            BTRIM(
              t."ovam_id"
            )
          )
      ),
      "kaartBron" AS (
        SELECT
          p.id,
          (
            p."datum_plaatsbezoek" +
            p."tijdstip"
          ) AT TIME ZONE
              'Europe/Brussels'
            AS "startMoment",
          m."naam_adi"
            AS "naamAdi",
          m."bedrijfsnaam",
          p."inspectielocatie",
          TO_CHAR(
            p."datum_plaatsbezoek",
            'DD/MM/YYYY'
          ) AS "datum",
          TO_CHAR(
            p."tijdstip",
            'HH24:MI'
          ) AS "tijdstip",
          p."latitude"::double precision
            AS "latitude",
          p."longitude"::double precision
            AS "longitude",
          (
            COALESCE(
              c."aantalTerreincontroles",
              0
            ) <
            CASE
              WHEN COALESCE(
                a."aantalAttesten",
                0
              ) > 0
              THEN LEAST(
                4,
                CEIL(
                  a."aantalAttesten" /
                    100.0
                )::integer
              )
              ELSE 0
            END
            AND (
              c."laatsteTerreincontrole"
                IS NULL
              OR
                c."laatsteTerreincontrole" <
                (
                  CURRENT_TIMESTAMP
                    AT TIME ZONE 'UTC'
                )::date - 14
            )
          ) AS "heeftWaarschuwing"
        FROM
          "laattijdige_plaatsbezoeken"
            p
        INNER JOIN
          "laattijdige_plaatsbezoek_meldingen"
            m
          ON m.id =
            p."melding_id"
        INNER JOIN
          "leden" l
          ON l.id =
            m."lid_id"
        LEFT JOIN
          "attestTellingen" a
          ON a."ovamSleutel" =
            LOWER(
              BTRIM(
                l."ovam_id"
              )
            )
        LEFT JOIN
          "controleTellingen" c
          ON c."ovamSleutel" =
            LOWER(
              BTRIM(
                l."ovam_id"
              )
            )
        WHERE
          p."latitude"
            IS NOT NULL
          AND p."longitude"
            IS NOT NULL
      )
    SELECT
      k.id,
      CASE
        WHEN
          k."heeftWaarschuwing"
        THEN 'ROOD'
        ELSE 'GROEN'
      END AS "status",
      (
        k."startMoment" <=
          CURRENT_TIMESTAMP
      ) AS "knippert",
      k."naamAdi",
      k."bedrijfsnaam",
      k."inspectielocatie",
      k."datum",
      k."tijdstip",
      k."latitude",
      k."longitude"
    FROM
      "kaartBron" k
    WHERE
      k."startMoment" >
        CURRENT_TIMESTAMP -
          INTERVAL '1 hour'
      AND
        k."latitude"
          IS NOT NULL
      AND
        k."longitude"
          IS NOT NULL
    ORDER BY
      k."startMoment" ASC,
      k.id ASC
  `);
}

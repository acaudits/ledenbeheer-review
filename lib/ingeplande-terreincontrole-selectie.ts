import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";

import {
  type IngeplandeTerreincontroleLijstcontract,
  type IngeplandeTerreincontroleSortering,
  type IngeplandeTerreincontroleTekstfilters,
} from "@/lib/ingeplande-terreincontrole-lijstcontract";
import {
  prisma,
} from "@/lib/prisma";
import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type IngeplandeTerreincontroleSelectieRij = {
  id: number;
  afgerond: boolean;
  auditeur: string | null;
  factuurVerzonden:
    boolean | null;
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
  aantalTotaal: number;
};

export type IngeplandeTerreincontroleDashboardTellingen = {
  plaatsbezoeken: number;
  inOpmaak: number;
  gearchiveerd: number;
  actueelAttest: number;
  nietVerzondenFacturen:
    number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract:
    IngeplandeTerreincontroleLijstcontract;
  sortering:
    IngeplandeTerreincontroleSortering;
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

const afgerondExpressie =
  Prisma.sql`
    CASE
      WHEN t."afgerond" IS TRUE
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
  keyof IngeplandeTerreincontroleTekstfilters,
  Prisma.Sql
> = {
  afgerond:
    afgerondExpressie,
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
    IngeplandeTerreincontroleSortering,
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
    IngeplandeTerreincontroleLijstcontract;
}) {
  const voorwaarden:
    Prisma.Sql[] = [
      Prisma.sql`
        t."verwijderd_op" IS NULL
        AND t."afwezig_op" IS NULL
      `,
    ];

  if (zoekterm) {
    const algemeneExpressie =
      Prisma.sql`
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
      keyof IngeplandeTerreincontroleTekstfilters,
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
      "De paginalimiet voor ingeplande terreincontroles is ongeldig.",
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
      "De cursor voor ingeplande terreincontroles is ongeldig.",
    );
  }
}

export function laadIngeplandeTerreincontroleSelectie({
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
    IngeplandeTerreincontroleSelectieRij[]
  >(Prisma.sql`
    WITH "gefilterd" AS (
      SELECT
        t.id,
        t."afgerond",
        t."auditeur",
        t."factuur_verzonden"
          AS "factuurVerzonden",
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

export async function laadIngeplandeTerreincontroleDashboardTellingen() {
  const [tellingen] =
    await prisma.$queryRaw<
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

  return tellingen ?? {
    plaatsbezoeken: 0,
    inOpmaak: 0,
    gearchiveerd: 0,
    actueelAttest: 0,
    nietVerzondenFacturen:
      0,
  };
}

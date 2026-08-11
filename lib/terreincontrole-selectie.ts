import "server-only";

import { Prisma } from "../generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  type TerreincontroleLijstcontract,
  type TerreincontroleSortering,
  type TerreincontroleTekstfilters,
} from "@/lib/terreincontrole-lijstcontract";
import {
  OngeldigePagineringFout,
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type TerreincontroleSelectieRij = {
  id: number;
  auditeur: string;
  naamAdi: string;
  linkAttest: string;
  attestnummer: string;
  status: string;
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
  contract:
    TerreincontroleLijstcontract;
  sortering:
    TerreincontroleSortering;
  richting:
    Sorteerrichting;
  limiet: number;
  cursorId: number | null;
};

const statusExpressie = Prisma.sql`
  CASE d."status"
    WHEN 'AFGEROND' THEN 'Afgerond'
    WHEN 'IN_OPMAAK' THEN 'In opmaak'
    WHEN 'GEACTUALISEERD' THEN 'Geactualiseerd'
    ELSE 'Geen'
  END
`;

const tekstExpressies: Record<
  keyof TerreincontroleTekstfilters,
  Prisma.Sql
> = {
  auditeur:
    Prisma.sql`d."auditeur"`,
  naamAdi:
    Prisma.sql`d."naam_adi"`,
  linkAttest:
    Prisma.sql`d."link_attest"`,
  attestnummer:
    Prisma.sql`d."attestnummer"`,
  status:
    statusExpressie,
  certificatiePlatform:
    Prisma.sql`d."certificatie_platform"`,
  opmerkingen:
    Prisma.sql`d."opmerkingen"`,
  adres:
    Prisma.sql`d."adres"`,
  persoonsId:
    Prisma.sql`d."persoons_id"`,
  bedrijfsnaam:
    Prisma.sql`d."bedrijfsnaam"`,
  ondernemingsnummer:
    Prisma.sql`d."ondernemingsnummer"`,
  persoonscertificaat:
    Prisma.sql`d."persoonscertificaat_nummer"`,
  procescertificaat:
    Prisma.sql`d."procescertificaat_nummer"`,
  attestId:
    Prisma.sql`d."attest_id"::text`,
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

function normaliseerOndernemingsnummerExpressie(
  expressie: Prisma.Sql,
) {
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

function ondernemingsnummerBevat(
  expressie: Prisma.Sql,
  waarde: string,
) {
  const cijfers =
    waarde.replace(/\D/g, "");

  if (!cijfers) {
    return bevat(
      expressie,
      waarde,
    );
  }

  const genormaliseerd =
    cijfers.length === 9
      ? `0${cijfers}`
      : cijfers;

  return Prisma.sql`
    STRPOS(
      ${normaliseerOndernemingsnummerExpressie(
        expressie,
      )},
      ${genormaliseerd}
    ) > 0
  `;
}

function sorteerExpressie(
  sortering:
    TerreincontroleSortering,
) {
  if (
    sortering ===
    "datumControle"
  ) {
    return Prisma.sql`
      TO_CHAR(
        d."datum_controle",
        'YYYY-MM-DD'
      )
    `;
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
    TerreincontroleLijstcontract;
}) {
  const voorwaarden:
    Prisma.Sql[] = [
      Prisma.sql`
        d."verwijderd_op" IS NULL
      `,
    ];

  if (zoekterm) {
    const algemeneExpressie =
      Prisma.sql`
        CONCAT_WS(
          ' ',
          d."auditeur",
          d."naam_adi",
          d."link_attest",
          d."attestnummer",
          ${statusExpressie},
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
          ${bevat(
            algemeneExpressie,
            zoekterm,
          )}
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

  for (
    const [sleutel, waarde]
    of Object.entries(
      contract.tekstfilters,
    ) as [
      keyof TerreincontroleTekstfilters,
      string,
    ][]
  ) {
    if (!waarde) {
      continue;
    }

    const expressie =
      tekstExpressies[sleutel];

    voorwaarden.push(
      sleutel ===
        "ondernemingsnummer"
        ? ondernemingsnummerBevat(
            expressie,
            waarde,
          )
        : bevat(
            expressie,
            waarde,
          ),
    );
  }

  if (
    contract.datumControleJaar !==
    null
  ) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          YEAR FROM
          d."datum_controle"
        ) = ${contract.datumControleJaar}
      `,
    );
  }

  if (
    contract.datumControleMaand !==
    null
  ) {
    voorwaarden.push(
      Prisma.sql`
        EXTRACT(
          MONTH FROM
          d."datum_controle"
        ) = ${contract.datumControleMaand}
      `,
    );
  }

  return Prisma.join(
    voorwaarden,
    " AND ",
  );
}

export async function laadTerreincontroleSelectie({
  zoekterm,
  contract,
  sortering,
  richting,
  limiet,
  cursorId,
}: SelectieInvoer) {
  if (
    !Number.isInteger(limiet) ||
    limiet < 1 ||
    limiet > 50
  ) {
    throw new OngeldigePagineringFout(
      "De paginalimiet voor terreincontroles is ongeldig.",
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
      "De cursor voor terreincontroles is ongeldig.",
    );
  }

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

  const cursorVergelijking =
    richting === "asc"
      ? Prisma.sql`
          (
            g."sorteerWaarde" >
              c."sorteerWaarde"
            OR (
              g."sorteerWaarde" =
                c."sorteerWaarde"
              AND g.id > c.id
            )
          )
        `
      : Prisma.sql`
          (
            g."sorteerWaarde" <
              c."sorteerWaarde"
            OR (
              g."sorteerWaarde" =
                c."sorteerWaarde"
              AND g.id < c.id
            )
          )
        `;

  const cursorJoin =
    cursorId === null
      ? Prisma.empty
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
              AND
              ${cursorVergelijking}
            )
          )
        `;

  return prisma.$queryRaw<
    TerreincontroleSelectieRij[]
  >(Prisma.sql`
    WITH "gefilterd" AS (
      SELECT
        d.id,
        d."auditeur",
        d."naam_adi" AS "naamAdi",
        d."link_attest" AS "linkAttest",
        d."attestnummer",
        ${statusExpressie} AS "status",
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
          AS "aantalTotaal",
        (
          COALESCE(
            (${sorteerWaarde})::text,
            ''
          ) = ''
        ) AS "isLeeg",
        LOWER(
          COALESCE(
            (${sorteerWaarde})::text,
            ''
          )
        ) AS "sorteerWaarde"
      FROM
        "terreincontrole_dossiers" d
      WHERE
        ${voorwaarden}
    ),
    "cursorRij" AS (
      SELECT
        g.id,
        g."isLeeg",
        g."sorteerWaarde"
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
      g."status",
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
      g."isLeeg" ASC,
      g."sorteerWaarde"
        ${richtingSql},
      g.id ${richtingSql}
    LIMIT ${limiet + 1}
  `);
}

export async function laadTerreincontroleDashboardTellingen() {
  const [tellingen] =
    await prisma.$queryRaw<
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

  return tellingen ?? {
    terreincontroles: 0,
    nonConformiteiten: 0,
  };
}

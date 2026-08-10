import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";
import {
  prisma,
} from "@/lib/prisma";
import {
  type ProcescertificaatLijstcontract,
  type ProcescertificaatSortering,
} from "@/lib/procescertificaat-lijstcontract";
import {
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type ProcescertificaatSelectieRij = {
  id: number;
  aantalTotaal: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract:
    ProcescertificaatLijstcontract;
  sortering:
    ProcescertificaatSortering;
  richting: Sorteerrichting;
  limiet: number;
  cursorId: number | null;
};

function tekstBevat(
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

function ondernemingsnummerBevat(
  expressie: Prisma.Sql,
  waarde: string,
) {
  const genormaliseerdeExpressie =
    normaliseerOndernemingsnummerExpressie(
      expressie,
    );

  const genormaliseerdeWaarde =
    normaliseerOndernemingsnummerExpressie(
      Prisma.sql`${waarde}`,
    );

  return Prisma.sql`
    STRPOS(
      ${genormaliseerdeExpressie},
      ${genormaliseerdeWaarde}
    ) > 0
  `;
}

function maakTekstfilter(
  expressie: Prisma.Sql,
  waarde: string,
) {
  return waarde
    ? Prisma.sql`
        AND ${tekstBevat(
          expressie,
          waarde,
        )}
      `
    : Prisma.empty;
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

function sorteerExpressie(
  sortering:
    ProcescertificaatSortering,
) {
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
    throw new Error(
      "De interne paginalimiet voor procescertificaten is ongeldig.",
    );
  }

  if (
    cursorId !== null &&
    (
      !Number.isInteger(cursorId) ||
      cursorId < 1
    )
  ) {
    throw new Error(
      "De interne cursor voor procescertificaten is ongeldig.",
    );
  }
}

export function laadProcescertificaatSelectie({
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

  const sorteerWaarde =
    sorteerExpressie(
      sortering,
    );

  const typeExpressie =
    ondernemingstypeExpressie();

  const algemeneZoekfilter =
    zoekterm
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
            ${tekstBevat(
              typeExpressie,
              zoekterm,
            )}
          )
        `
      : Prisma.empty;

  const {
    tekstfilters,
    uitgereiktJaar,
    uitgereiktMaand,
  } = contract;

  const kboFilter =
    tekstfilters.kboNummer
      ? Prisma.sql`
          AND ${ondernemingsnummerBevat(
            Prisma.sql`
              p."kbo_nummer"
            `,
            tekstfilters.kboNummer,
          )}
        `
      : Prisma.empty;

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

  const richtingSql =
    richting === "asc"
      ? Prisma.sql`ASC`
      : Prisma.sql`DESC`;

  const idVergelijking =
    richting === "asc"
      ? Prisma.sql`
          g.id > ca.id
        `
      : Prisma.sql`
          g.id < ca.id
        `;

  const waardeVergelijking =
    richting === "asc"
      ? Prisma.sql`
          g."sorteerWaarde" >
          ca."sorteerWaarde"
        `
      : Prisma.sql`
          g."sorteerWaarde" <
          ca."sorteerWaarde"
        `;

  const cursorJoin =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          CROSS JOIN
            cursoranker ca
        `;

  const cursorFilter =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          WHERE (
            g."isLeeg" >
              ca."isLeeg"
            OR (
              g."isLeeg" =
                ca."isLeeg"
              AND (
                (
                  g."isLeeg" = 1
                  AND ${idVergelijking}
                )
                OR (
                  g."isLeeg" = 0
                  AND (
                    ${waardeVergelijking}
                    OR (
                      g."sorteerWaarde"
                        IS NOT DISTINCT FROM
                      ca."sorteerWaarde"
                      AND ${idVergelijking}
                    )
                  )
                )
              )
            )
          )
        `;

  const query = Prisma.sql`
    WITH gefilterd AS (
      SELECT
        p.id AS id,
        ${sorteerWaarde}
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
        END AS "isLeeg",
        COUNT(*) OVER()::integer
          AS "aantalTotaal"
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
        ${maakTekstfilter(
          typeExpressie,
          tekstfilters.ondernemingstype,
        )}
        ${jaarFilter}
        ${maandFilter}
    ),
    cursoranker AS (
      SELECT
        g.id,
        g."sorteerWaarde",
        g."isLeeg"
      FROM
        gefilterd g
      WHERE
        g.id = ${cursorId ?? -1}
    )
    SELECT
      g.id AS id,
      g."aantalTotaal"
    FROM
      gefilterd g
    ${cursorJoin}
    ${cursorFilter}
    ORDER BY
      g."isLeeg" ASC,
      g."sorteerWaarde"
        ${richtingSql},
      g.id ${richtingSql}
    LIMIT ${limiet + 1}
  `;

  return prisma.$queryRaw<
    ProcescertificaatSelectieRij[]
  >(query);
}

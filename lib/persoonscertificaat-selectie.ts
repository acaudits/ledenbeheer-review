import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";
import {
  prisma,
} from "@/lib/prisma";
import {
  type PersoonscertificaatLijstcontract,
  type PersoonscertificaatSortering,
} from "@/lib/persoonscertificaat-lijstcontract";
import {
  type Sorteerrichting,
} from "@/lib/server-paginering";
import {
  type TargetStatus,
} from "@/lib/persoonscertificaat-targetselectie";

export type PersoonscertificaatSelectieRij = {
  id: number;
  targetStatus: TargetStatus;
  aantalTotaal: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract:
    PersoonscertificaatLijstcontract;
  sortering:
    PersoonscertificaatSortering;
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
          ${expressie},
          ''
        )
      ),
      LOWER(${waarde})
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

function sorteerExpressie(
  sortering:
    PersoonscertificaatSortering,
) {
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
  richting,
  limiet,
  cursorId,
}: SelectieInvoer) {
  if (
    typeof zoekterm !== "string" ||
    zoekterm.length > 100
  ) {
    throw new Error(
      "Ongeldige zoekterm in serverselectie.",
    );
  }

  if (
    richting !== "asc" &&
    richting !== "desc"
  ) {
    throw new Error(
      "Ongeldige sorteerrichting in serverselectie.",
    );
  }

  if (
    !Number.isInteger(limiet) ||
    limiet < 1 ||
    limiet > 50
  ) {
    throw new Error(
      "Ongeldige limiet in serverselectie.",
    );
  }

  if (
    cursorId !== null &&
    (
      !Number.isInteger(cursorId) ||
      cursorId <= 0
    )
  ) {
    throw new Error(
      "Ongeldige cursor-ID in serverselectie.",
    );
  }
}

export async function laadPersoonscertificaatSelectie(
  invoer: SelectieInvoer,
) {
  valideerInvoer(invoer);

  const {
    zoekterm,
    contract,
    sortering,
    richting,
    limiet,
    cursorId,
  } = invoer;

  const {
    tekstfilters,
    targetStatus,
    uitgereiktJaar,
    uitgereiktMaand,
  } = contract;

  const sorteerwaarde =
    sorteerExpressie(
      sortering,
    );

  const algemeenZoekfilter =
    zoekterm
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

  const richtingSql =
    richting === "asc"
      ? Prisma.sql`ASC`
      : Prisma.sql`DESC`;

  const waardeVergelijking =
    richting === "asc"
      ? Prisma.sql`
          g."sorteerWaarde" >
            a."sorteerWaarde"
        `
      : Prisma.sql`
          g."sorteerWaarde" <
            a."sorteerWaarde"
        `;

  const idVergelijking =
    richting === "asc"
      ? Prisma.sql`
          g.id > a.id
        `
      : Prisma.sql`
          g.id < a.id
        `;

  const cursorJoin =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          CROSS JOIN cursoranker a
        `;

  const cursorFilter =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          WHERE (
            g."isLeeg" >
              a."isLeeg"
            OR (
              g."isLeeg" =
                a."isLeeg"
              AND (
                ${waardeVergelijking}
                OR (
                  g."sorteerWaarde"
                    IS NOT DISTINCT FROM
                  a."sorteerWaarde"
                  AND ${idVergelijking}
                )
              )
            )
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
        ${sorteerwaarde}
          AS "sorteerWaarde",
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
          "lid_id",
          COUNT(*)::integer
            AS aantal
        FROM
          "terreincontrole_dossiers"
        WHERE "verwijderd_op"
          IS NULL
        GROUP BY "lid_id"
      ) tc
        ON tc."lid_id" = l.id
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
    gefilterd AS (
      SELECT
        id,
        "targetStatus",
        "sorteerWaarde",
        CASE
          WHEN "sorteerWaarde"
            IS NULL
            THEN 1
          ELSE 0
        END AS "isLeeg",
        COUNT(*) OVER ()::integer
          AS "aantalTotaal"
      FROM statussen
      WHERE TRUE
      ${targetFilter}
    ),
    cursoranker AS (
      SELECT
        id,
        "sorteerWaarde",
        "isLeeg"
      FROM gefilterd
      WHERE id = ${cursorId ?? -1}
    )
    SELECT
      g.id,
      g."targetStatus",
      g."aantalTotaal"
    FROM gefilterd g
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
    PersoonscertificaatSelectieRij[]
  >(query);
}

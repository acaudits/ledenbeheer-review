import "server-only";

import {
  Prisma,
} from "../generated/prisma/client";
import {
  prisma,
} from "@/lib/prisma";

export const TARGETSTATUSSEN = [
  "GRIJS",
  "ROOD",
  "GEEL",
  "GROEN",
] as const;

export type TargetStatus =
  (typeof TARGETSTATUSSEN)[number];

export type TargetSelectieRij = {
  id: number;
  naamPersoon: string;
  targetStatus: TargetStatus;
  aantalTotaal: number;
};

type TargetSelectieInvoer = {
  status: TargetStatus;
  zoekterm: string;
  richting: "asc" | "desc";
  limiet: number;
  cursorNaam: string | null;
  cursorId: number | null;
};

export function isTargetStatus(
  waarde: unknown,
): waarde is TargetStatus {
  return (
    typeof waarde === "string" &&
    TARGETSTATUSSEN.some(
      (status) => status === waarde,
    )
  );
}

function valideerInvoer({
  status,
  zoekterm,
  richting,
  limiet,
  cursorNaam,
  cursorId,
}: TargetSelectieInvoer) {
  if (!isTargetStatus(status)) {
    throw new Error(
      "Ongeldige targetstatus in serveraanvraag.",
    );
  }

  if (
    typeof zoekterm !== "string" ||
    zoekterm.length > 100
  ) {
    throw new Error(
      "Ongeldige zoekterm in serveraanvraag.",
    );
  }

  if (
    richting !== "asc" &&
    richting !== "desc"
  ) {
    throw new Error(
      "Ongeldige sorteerrichting in serveraanvraag.",
    );
  }

  if (
    !Number.isInteger(limiet) ||
    limiet < 1 ||
    limiet > 50
  ) {
    throw new Error(
      "Ongeldige paginalimiet in serveraanvraag.",
    );
  }

  const heeftCursorNaam =
    cursorNaam !== null;

  const heeftCursorId =
    cursorId !== null;

  if (
    heeftCursorNaam !== heeftCursorId ||
    (cursorNaam !== null &&
      cursorNaam.length > 300) ||
    (cursorId !== null &&
      (!Number.isInteger(cursorId) ||
        cursorId <= 0))
  ) {
    throw new Error(
      "Ongeldige cursor in serveraanvraag.",
    );
  }
}

export async function laadTargetSelectie({
  status,
  zoekterm,
  richting,
  limiet,
  cursorNaam,
  cursorId,
}: TargetSelectieInvoer) {
  valideerInvoer({
    status,
    zoekterm,
    richting,
    limiet,
    cursorNaam,
    cursorId,
  });

  const zoekFilter =
    zoekterm
      ? Prisma.sql`
          AND (
            STRPOS(
              LOWER(l."naam_persoon"),
              LOWER(${zoekterm})
            ) > 0
            OR STRPOS(
              LOWER(
                COALESCE(
                  l."telefoonnummer",
                  ''
                )
              ),
              LOWER(${zoekterm})
            ) > 0
            OR STRPOS(
              LOWER(
                COALESCE(
                  l."mailadres",
                  ''
                )
              ),
              LOWER(${zoekterm})
            ) > 0
            OR STRPOS(
              LOWER(l."ovam_id"),
              LOWER(${zoekterm})
            ) > 0
            OR STRPOS(
              LOWER(
                l."certificaatnummer"
              ),
              LOWER(${zoekterm})
            ) > 0
            OR STRPOS(
              LOWER(
                COALESCE(
                  l."bedrijf",
                  ''
                )
              ),
              LOWER(${zoekterm})
            ) > 0
            OR STRPOS(
              LOWER(
                COALESCE(
                  l."aansluiting",
                  ''
                )
              ),
              LOWER(${zoekterm})
            ) > 0
          )
        `
      : Prisma.empty;

  const cursorFilter =
    cursorNaam !== null &&
    cursorId !== null
      ? richting === "asc"
        ? Prisma.sql`
            WHERE (
              "naamPersoon" > ${cursorNaam}
              OR (
                "naamPersoon" = ${cursorNaam}
                AND id > ${cursorId}
              )
            )
          `
        : Prisma.sql`
            WHERE (
              "naamPersoon" < ${cursorNaam}
              OR (
                "naamPersoon" = ${cursorNaam}
                AND id < ${cursorId}
              )
            )
          `
      : Prisma.empty;

  const richtingSql =
    richting === "asc"
      ? Prisma.sql`ASC`
      : Prisma.sql`DESC`;

  const query = Prisma.sql`
    WITH controletellingen AS (
      SELECT
        l.id,
        l."naam_persoon" AS "naamPersoon",
        COALESCE(
          aps."aantal_attesten",
          0
        )::integer AS "aantalAttesten",
        COALESCE(
          dc.aantal,
          0
        )::integer AS "aantalDeskcontroles",
        COALESCE(
          tc.aantal,
          0
        )::integer AS "aantalTerreincontroles"
      FROM "leden" l
      LEFT JOIN
        "attest_persoon_statistieken" aps
        ON aps."persoons_id" = l."ovam_id"
      LEFT JOIN (
        SELECT
          "lid_id",
          COUNT(*)::integer AS aantal
        FROM "deskcontroles"
        WHERE "verwijderd_op" IS NULL
        GROUP BY "lid_id"
      ) dc
        ON dc."lid_id" = l.id
      LEFT JOIN (
        SELECT
          "lid_id",
          COUNT(*)::integer AS aantal
        FROM "terreincontrole_dossiers"
        WHERE "verwijderd_op" IS NULL
        GROUP BY "lid_id"
      ) tc
        ON tc."lid_id" = l.id
      WHERE l."verwijderd_op" IS NULL
      ${zoekFilter}
    ),
    statussen AS (
      SELECT
        id,
        "naamPersoon",
        CASE
          WHEN "aantalAttesten" = 0
            THEN 'GRIJS'
          WHEN
            "aantalDeskcontroles" = 0
            OR "aantalTerreincontroles" = 0
            THEN 'ROOD'
          WHEN
            "aantalDeskcontroles" >=
              CEIL(
                "aantalAttesten" * 0.05
              )
            AND
            "aantalTerreincontroles" >=
              LEAST(
                4,
                CEIL(
                  "aantalAttesten" / 100.0
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
        "naamPersoon",
        "targetStatus",
        COUNT(*) OVER ()::integer
          AS "aantalTotaal"
      FROM statussen
      WHERE "targetStatus" = ${status}
    )
    SELECT
      id,
      "naamPersoon",
      "targetStatus",
      "aantalTotaal"
    FROM gefilterd
    ${cursorFilter}
    ORDER BY
      "naamPersoon" ${richtingSql},
      id ${richtingSql}
    LIMIT ${limiet + 1}
  `;

  return prisma.$queryRaw<
    TargetSelectieRij[]
  >(query);
}

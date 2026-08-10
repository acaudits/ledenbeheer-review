import "server-only";

import { Prisma } from "../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type DeskcontroleDashboardFilter,
  type DeskcontroleDatumveld,
  type DeskcontroleLijstcontract,
  type DeskcontroleSortering,
  type DeskcontroleTekstfilters,
} from "@/lib/deskcontrole-lijstcontract";
import {
  type Sorteerrichting,
} from "@/lib/server-paginering";

export type DeskcontroleSelectieRij = {
  id: number;
  auditeur: string | null;
  naamAdi: string;
  afgerond: string;
  linkAttest: string | null;
  attestnummer: string | null;
  status: string;
  deadlineSanctie: string;
  mailSanctieVerzonden: string;
  typeControle: string;
  deadlineCorrectie: string;
  mailCorrectieVerzonden: string;
  oneDrive: string | null;
  voorwaardelijkeOpheffing: string;
  certificatiePlatform: string;
  opmerkingen: string | null;
  datumControle: string;
  adres: string | null;
  persoonsId: string;
  bedrijfsnaam: string;
  ondernemingsnummer: string;
  persoonscertificaat: string;
  procescertificaat: string;
  finalisatieDatum: string;
  attestId: string;
  aantalTotaal: number;
};

export type DeskcontroleDashboardTellingen = {
  afgerond: number;
  inOpmaak: number;
  geactualiseerd: number;
  openstaand: number;
  binnenZevenDagen: number;
  verstreken: number;
};

type SelectieInvoer = {
  zoekterm: string;
  contract: DeskcontroleLijstcontract;
  sortering: DeskcontroleSortering;
  richting: Sorteerrichting;
  limiet: number;
  cursorId: number | null;
};

const tekstExpressies: Record<
  keyof DeskcontroleTekstfilters,
  Prisma.Sql
> = {
  auditeur: Prisma.sql`d."auditeur"`,
  naamAdi: Prisma.sql`l."naam_persoon"`,
  afgerond: Prisma.sql`
    CASE WHEN d."status" = 'AFGEROND'
      THEN 'Ja' ELSE 'Nee' END
  `,
  linkAttest: Prisma.sql`d."link_attest"`,
  attestnummer: Prisma.sql`d."attestnummer"`,
  status: Prisma.sql`
    CASE d."status"
      WHEN 'AFGEROND' THEN 'Afgerond'
      WHEN 'IN_OPMAAK' THEN 'In opmaak'
      WHEN 'GEACTUALISEERD' THEN 'Geactualiseerd'
      ELSE 'Geen'
    END
  `,
  mailSanctieVerzonden: Prisma.sql`
    CASE WHEN COALESCE(d."mail_sanctie_verzonden", false)
      THEN 'Ja' ELSE 'Nee' END
  `,
  typeControle: Prisma.sql`
    CASE WHEN d."type_controle" = 'NIEUWE_CONTROLE'
      THEN 'Nieuwe controle' ELSE 'Opvolging' END
  `,
  mailCorrectieVerzonden: Prisma.sql`
    CASE WHEN COALESCE(d."mail_correctie_verzonden", false)
      THEN 'Ja' ELSE 'Nee' END
  `,
  oneDrive: Prisma.sql`d."onedrive_url"`,
  voorwaardelijkeOpheffing: Prisma.sql`
    CASE WHEN COALESCE(d."voorwaardelijke_opheffing", false)
      THEN 'Ja' ELSE 'Nee' END
  `,
  certificatiePlatform:
    Prisma.sql`l."certificatie_platform"`,
  opmerkingen: Prisma.sql`d."opmerkingen"`,
  adres: Prisma.sql`d."adres"`,
  persoonsId: Prisma.sql`l."ovam_id"`,
  bedrijfsnaam: Prisma.sql`pc."naam_bedrijf"`,
  ondernemingsnummer: Prisma.sql`pc."kbo_nummer"`,
  persoonscertificaat:
    Prisma.sql`l."certificaatnummer"`,
  procescertificaat:
    Prisma.sql`pc."certificaatnummer"`,
  attestId: Prisma.sql`d."attest_id"::text`,
};

const datumExpressies: Record<
  DeskcontroleDatumveld,
  Prisma.Sql
> = {
  deadlineSanctie:
    Prisma.sql`d."deadline_sanctie"`,
  deadlineCorrectie:
    Prisma.sql`d."deadline_correctie"`,
  datumControle:
    Prisma.sql`d."datum_controle"`,
  finalisatieDatum:
    Prisma.sql`d."finalisatie_datum"`,
};

function bevat(
  expressie: Prisma.Sql,
  waarde: string,
) {
  return Prisma.sql`
    STRPOS(
      LOWER(COALESCE((${expressie})::text, '')),
      LOWER(${waarde})
    ) > 0
  `;
}

function dashboardVoorwaarde(
  filter: DeskcontroleDashboardFilter | null,
) {
  switch (filter) {
    case "afgerond":
      return Prisma.sql`d."status" = 'AFGEROND'`;

    case "in-opmaak":
      return Prisma.sql`d."status" = 'IN_OPMAAK'`;

    case "geactualiseerd":
      return Prisma.sql`d."status" = 'GEACTUALISEERD'`;

    case "openstaand":
      return Prisma.sql`d."status" = 'GEEN'`;

    case "verstreken":
      return Prisma.sql`
        d."status" NOT IN ('AFGEROND', 'GEACTUALISEERD')
        AND (
          d."deadline_sanctie" < CURRENT_DATE
          OR d."deadline_correctie" < CURRENT_DATE
        )
      `;

    case "binnen-zeven-dagen":
      return Prisma.sql`
        d."status" NOT IN ('AFGEROND', 'GEACTUALISEERD')
        AND NOT (
          d."deadline_sanctie" < CURRENT_DATE
          OR d."deadline_correctie" < CURRENT_DATE
        )
        AND (
          d."deadline_sanctie"
            BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
          OR d."deadline_correctie"
            BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
        )
      `;

    default:
      return Prisma.sql`TRUE`;
  }
}

function sorteerExpressie(
  sortering: DeskcontroleSortering,
) {
  if (sortering in tekstExpressies) {
    return tekstExpressies[
      sortering as keyof DeskcontroleTekstfilters
    ];
  }

  if (sortering in datumExpressies) {
    return datumExpressies[
      sortering as DeskcontroleDatumveld
    ];
  }

  throw new Error("Ongeldige deskcontrolesortering.");
}

function maakFilters({
  zoekterm,
  contract,
}: Pick<SelectieInvoer, "zoekterm" | "contract">) {
  const filters: Prisma.Sql[] = [
    Prisma.sql`d."verwijderd_op" IS NULL`,
    dashboardVoorwaarde(
      contract.dashboardFilter,
    ),
  ];

  if (zoekterm) {
    const expressies = [
      ...Object.values(tekstExpressies),
      ...Object.values(datumExpressies).map(
        (expressie) =>
          Prisma.sql`TO_CHAR(${expressie}, 'DD/MM/YYYY')`,
      ),
    ];

    filters.push(
      Prisma.sql`(${Prisma.join(
        expressies.map(
          (expressie) =>
            bevat(expressie, zoekterm),
        ),
        " OR ",
      )})`,
    );
  }

  for (
    const [sleutel, waarde]
    of Object.entries(contract.tekstfilters)
  ) {
    if (!waarde) {
      continue;
    }

    filters.push(
      bevat(
        tekstExpressies[
          sleutel as keyof DeskcontroleTekstfilters
        ],
        waarde,
      ),
    );
  }

  for (
    const [sleutel, filter]
    of Object.entries(contract.datumfilters)
  ) {
    const expressie =
      datumExpressies[
        sleutel as DeskcontroleDatumveld
      ];

    if (filter.jaar !== null) {
      filters.push(
        Prisma.sql`
          EXTRACT(YEAR FROM ${expressie}) =
          ${filter.jaar}
        `,
      );
    }

    if (filter.maand !== null) {
      filters.push(
        Prisma.sql`
          EXTRACT(MONTH FROM ${expressie}) =
          ${filter.maand}
        `,
      );
    }
  }

  return Prisma.join(filters, " AND ");
}

function valideerInvoer({
  zoekterm,
  richting,
  limiet,
  cursorId,
}: SelectieInvoer) {
  if (
    typeof zoekterm !== "string" ||
    zoekterm.length > 100 ||
    (richting !== "asc" && richting !== "desc") ||
    !Number.isInteger(limiet) ||
    limiet < 1 ||
    limiet > 50 ||
    (
      cursorId !== null &&
      (
        !Number.isInteger(cursorId) ||
        cursorId <= 0
      )
    )
  ) {
    throw new Error(
      "Ongeldige invoer voor deskcontroleselectie.",
    );
  }
}

export async function laadDeskcontroleSelectie(
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

  const filters =
    maakFilters({ zoekterm, contract });

  const sorteerwaarde =
    sorteerExpressie(sortering);

  const richtingSql =
    richting === "asc"
      ? Prisma.sql`ASC`
      : Prisma.sql`DESC`;

  const cursorJoin =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          CROSS JOIN cursoranker ca
        `;

  const cursorFilter =
    cursorId === null
      ? Prisma.empty
      : richting === "asc"
        ? Prisma.sql`
            WHERE
              g."isLeeg" > ca."isLeeg"
              OR (
                g."isLeeg" = ca."isLeeg"
                AND (
                  g."sorteerWaarde" > ca."sorteerWaarde"
                  OR (
                    g."sorteerWaarde"
                      IS NOT DISTINCT FROM ca."sorteerWaarde"
                    AND g.id > ca.id
                  )
                )
              )
          `
        : Prisma.sql`
            WHERE
              g."isLeeg" > ca."isLeeg"
              OR (
                g."isLeeg" = ca."isLeeg"
                AND (
                  g."sorteerWaarde" < ca."sorteerWaarde"
                  OR (
                    g."sorteerWaarde"
                      IS NOT DISTINCT FROM ca."sorteerWaarde"
                    AND g.id < ca.id
                  )
                )
              )
          `;

  return prisma.$queryRaw<
    DeskcontroleSelectieRij[]
  >(Prisma.sql`
    WITH gefilterd AS (
      SELECT
        d.id,
        d."auditeur",
        l."naam_persoon" AS "naamAdi",
        CASE WHEN d."status" = 'AFGEROND'
          THEN 'Ja' ELSE 'Nee' END AS "afgerond",
        d."link_attest" AS "linkAttest",
        d."attestnummer",
        CASE d."status"
          WHEN 'AFGEROND' THEN 'Afgerond'
          WHEN 'IN_OPMAAK' THEN 'In opmaak'
          WHEN 'GEACTUALISEERD' THEN 'Geactualiseerd'
          ELSE 'Geen'
        END AS "status",
        COALESCE(
          TO_CHAR(d."deadline_sanctie", 'DD/MM/YYYY'),
          ''
        ) AS "deadlineSanctie",
        CASE WHEN COALESCE(
          d."mail_sanctie_verzonden", false
        ) THEN 'Ja' ELSE 'Nee'
        END AS "mailSanctieVerzonden",
        CASE WHEN d."type_controle" = 'NIEUWE_CONTROLE'
          THEN 'Nieuwe controle' ELSE 'Opvolging'
        END AS "typeControle",
        COALESCE(
          TO_CHAR(d."deadline_correctie", 'DD/MM/YYYY'),
          ''
        ) AS "deadlineCorrectie",
        CASE WHEN COALESCE(
          d."mail_correctie_verzonden", false
        ) THEN 'Ja' ELSE 'Nee'
        END AS "mailCorrectieVerzonden",
        d."onedrive_url" AS "oneDrive",
        CASE WHEN COALESCE(
          d."voorwaardelijke_opheffing", false
        ) THEN 'Ja' ELSE 'Nee'
        END AS "voorwaardelijkeOpheffing",
        COALESCE(
          l."certificatie_platform", ''
        ) AS "certificatiePlatform",
        d."opmerkingen",
        TO_CHAR(
          d."datum_controle", 'DD/MM/YYYY'
        ) AS "datumControle",
        d."adres",
        l."ovam_id" AS "persoonsId",
        COALESCE(
          pc."naam_bedrijf", 'Niet gekoppeld'
        ) AS "bedrijfsnaam",
        COALESCE(
          pc."kbo_nummer", 'Niet gekoppeld'
        ) AS "ondernemingsnummer",
        l."certificaatnummer"
          AS "persoonscertificaat",
        COALESCE(
          pc."certificaatnummer", 'Niet gekoppeld'
        ) AS "procescertificaat",
        COALESCE(
          TO_CHAR(d."finalisatie_datum", 'DD/MM/YYYY'),
          ''
        ) AS "finalisatieDatum",
        COALESCE(
          d."attest_id"::text, ''
        ) AS "attestId",
        ${sorteerwaarde} AS "sorteerWaarde",
        CASE
          WHEN ${sorteerwaarde} IS NULL
            OR BTRIM((${sorteerwaarde})::text) = ''
          THEN 1 ELSE 0
        END AS "isLeeg",
        COUNT(*) OVER ()::integer AS "aantalTotaal"
      FROM "deskcontroles" d
      JOIN "leden" l ON l.id = d."lid_id"
      LEFT JOIN "procescertificaten" pc
        ON pc.id = d."procescertificaat_id"
      WHERE ${filters}
    ),
    cursoranker AS (
      SELECT id, "sorteerWaarde", "isLeeg"
      FROM gefilterd
      WHERE id = ${cursorId ?? -1}
    )
    SELECT
      g.id AS id,
      "auditeur",
      "naamAdi",
      "afgerond",
      "linkAttest",
      "attestnummer",
      "status",
      "deadlineSanctie",
      "mailSanctieVerzonden",
      "typeControle",
      "deadlineCorrectie",
      "mailCorrectieVerzonden",
      "oneDrive",
      "voorwaardelijkeOpheffing",
      "certificatiePlatform",
      "opmerkingen",
      "datumControle",
      "adres",
      "persoonsId",
      "bedrijfsnaam",
      "ondernemingsnummer",
      "persoonscertificaat",
      "procescertificaat",
      "finalisatieDatum",
      "attestId",
      "aantalTotaal"
    FROM gefilterd g
    ${cursorJoin}
    ${cursorFilter}
    ORDER BY
      g."isLeeg" ASC,
      g."sorteerWaarde" ${richtingSql},
      g.id ${richtingSql}
    LIMIT ${limiet + 1}
  `);
}

export async function laadDeskcontroleDashboardTellingen() {
  const [rij] = await prisma.$queryRaw<
    DeskcontroleDashboardTellingen[]
  >(Prisma.sql`
    SELECT
      COUNT(*) FILTER (
        WHERE "status" = 'AFGEROND'
      )::integer AS "afgerond",
      COUNT(*) FILTER (
        WHERE "status" = 'IN_OPMAAK'
      )::integer AS "inOpmaak",
      COUNT(*) FILTER (
        WHERE "status" = 'GEACTUALISEERD'
      )::integer AS "geactualiseerd",
      COUNT(*) FILTER (
        WHERE "status" = 'GEEN'
      )::integer AS "openstaand",
      COUNT(*) FILTER (
        WHERE
          "status" NOT IN ('AFGEROND', 'GEACTUALISEERD')
          AND NOT (
            "deadline_sanctie" < CURRENT_DATE
            OR "deadline_correctie" < CURRENT_DATE
          )
          AND (
            "deadline_sanctie"
              BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
            OR "deadline_correctie"
              BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
          )
      )::integer AS "binnenZevenDagen",
      COUNT(*) FILTER (
        WHERE
          "status" NOT IN ('AFGEROND', 'GEACTUALISEERD')
          AND (
            "deadline_sanctie" < CURRENT_DATE
            OR "deadline_correctie" < CURRENT_DATE
          )
      )::integer AS "verstreken"
    FROM "deskcontroles"
    WHERE "verwijderd_op" IS NULL
  `);

  return rij ?? {
    afgerond: 0,
    inOpmaak: 0,
    geactualiseerd: 0,
    openstaand: 0,
    binnenZevenDagen: 0,
    verstreken: 0,
  };
}

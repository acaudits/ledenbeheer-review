import "server-only";

import { Prisma } from "../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { OngeldigePagineringFout } from "@/lib/server-paginering";

export const NON_CONFORMITEIT_SORTERINGEN = [
  "bron",
  "ncId",
  "categorie",
  "parameter",
  "naamAdi",
  "ovamId",
  "datumControle",
  "attestnummer",
  "adres",
  "vastgesteldDoorCi",
  "groteImpact",
] as const;

export type NonConformiteitSortering =
  (typeof NON_CONFORMITEIT_SORTERINGEN)[number];

export type NonConformiteitSorteercriterium = {
  sleutel: NonConformiteitSortering;
  richting: "asc" | "desc";
};

export type NonConformiteitFilters = Record<NonConformiteitSortering, string>;

export type NonConformiteitSelectieRij = {
  lijstId: number;
  vaststellingId: number;
  controleId: number;
  bron: string;
  bronSleutel: string;
  excelRij: number;
  parameter: string;
  ncId: string;
  omschrijving: string;
  vastgesteldDoorCi: string;
  verduidelijking: string;
  groteImpact: string;
  categorie: string;
  motivatieAanpassing: string;
  aangemaaktOp: Date;
  auditeur: string;
  naamAdi: string;
  ovamId: string;
  datumControle: Date;
  attestnummer: string;
  linkAttest: string;
  certificatiePlatform: string;
  adres: string;
  bedrijfsnaam: string;
  ondernemingsnummer: string;
  persoonscertificaat: string;
  procescertificaat: string;
  aantalTotaal: number;
};

export type NonConformiteitFilterwaarde = {
  waarde: string;
  aantal: number;
};

export type NonConformiteitTrendPunt = {
  periode: string;
  aantal: number;
};

type NonConformiteitTrendRij = NonConformiteitTrendPunt & {
  ncId: string;
};

const FILTERPARAMETERS: Record<NonConformiteitSortering, string> = {
  bron: "filterBron",
  ncId: "filterNcId",
  categorie: "filterCategorie",
  parameter: "filterParameter",
  naamAdi: "filterNaamAdi",
  ovamId: "filterOvamId",
  datumControle: "filterDatumControle",
  attestnummer: "filterAttestnummer",
  adres: "filterAdres",
  vastgesteldDoorCi: "filterVastgesteldDoorCi",
  groteImpact: "filterGroteImpact",
};

const EXCEL_FILTER_PREFIX = "__excel__";
const MAXIMALE_FILTERLENGTE = 12000;

type ExcelFilter = {
  modus: "insluiten" | "uitsluiten";
  waarden: string[];
  legeCellenGeselecteerd: boolean;
};

function isSortering(waarde: string): waarde is NonConformiteitSortering {
  return NON_CONFORMITEIT_SORTERINGEN.some((sortering) => sortering === waarde);
}

function normaliseerFilter(waarde: string | null, label: string) {
  const resultaat = (waarde ?? "").replace(/\s+/g, " ").trim();

  if (resultaat.length > MAXIMALE_FILTERLENGTE) {
    throw new OngeldigePagineringFout(
      `${label} mag maximaal ${MAXIMALE_FILTERLENGTE} tekens bevatten.`,
    );
  }

  return resultaat;
}

function leesExcelFilter(waarde: string): ExcelFilter | null {
  if (!waarde.startsWith(EXCEL_FILTER_PREFIX)) {
    return null;
  }

  try {
    const inhoud = JSON.parse(
      decodeURIComponent(waarde.slice(EXCEL_FILTER_PREFIX.length)),
    ) as unknown;

    if (
      typeof inhoud !== "object" ||
      inhoud === null ||
      Array.isArray(inhoud)
    ) {
      throw new Error("Ongeldige filterinhoud.");
    }

    const kandidaat = inhoud as Record<string, unknown>;

    if (
      (kandidaat.modus !== "insluiten" && kandidaat.modus !== "uitsluiten") ||
      !Array.isArray(kandidaat.waarden) ||
      typeof kandidaat.legeCellenGeselecteerd !== "boolean"
    ) {
      throw new Error("Ongeldige filtervelden.");
    }

    if (kandidaat.waarden.length > 2000) {
      throw new Error("Te veel filterwaarden.");
    }

    const waarden = kandidaat.waarden.map((item) => {
      if (typeof item !== "string" || item.length > 2000) {
        throw new Error("Ongeldige filterwaarde.");
      }

      return item.trim();
    });

    return {
      modus: kandidaat.modus,
      waarden: Array.from(new Set(waarden.filter(Boolean))),
      legeCellenGeselecteerd: kandidaat.legeCellenGeselecteerd,
    };
  } catch {
    throw new OngeldigePagineringFout(
      "De gekozen filterwaarden zijn ongeldig.",
    );
  }
}

export function leesNonConformiteitFilters(url: URL) {
  return Object.fromEntries(
    NON_CONFORMITEIT_SORTERINGEN.map((sleutel) => [
      sleutel,
      normaliseerFilter(
        url.searchParams.get(FILTERPARAMETERS[sleutel]),
        `Filter ${sleutel}`,
      ),
    ]),
  ) as NonConformiteitFilters;
}

export function leesNonConformiteitSorteringen(
  url: URL,
): NonConformiteitSorteercriterium[] {
  const parameter = url.searchParams.get("sorteringen");

  if (!parameter) {
    return [
      {
        sleutel: "datumControle",
        richting: "desc",
      },
    ];
  }

  if (parameter.length > 1000) {
    throw new OngeldigePagineringFout("De sorteringen zijn te lang.");
  }

  const gezien = new Set<NonConformiteitSortering>();

  const sorteringen = parameter
    .split(",")
    .map((onderdeel, index): NonConformiteitSorteercriterium => {
      const [sleutel, richting, ...rest] = onderdeel.split(":");

      if (
        rest.length ||
        !sleutel ||
        !isSortering(sleutel) ||
        (richting !== "asc" && richting !== "desc")
      ) {
        throw new OngeldigePagineringFout(
          `Sortering ${index + 1} is ongeldig.`,
        );
      }

      if (gezien.has(sleutel)) {
        throw new OngeldigePagineringFout(
          "Een kolom mag maar één keer gesorteerd worden.",
        );
      }

      gezien.add(sleutel);

      return {
        sleutel,
        richting,
      };
    });

  if (
    sorteringen.length === 0 ||
    sorteringen.length > NON_CONFORMITEIT_SORTERINGEN.length
  ) {
    throw new OngeldigePagineringFout("Het aantal sorteringen is ongeldig.");
  }

  return sorteringen;
}

function basisCte() {
  return Prisma.sql`
    "basis" AS (
      SELECT
        (v.id * 2)::integer AS "lijstId",
        v.id AS "vaststellingId",
        d.id AS "controleId",
        'Deskcontrole'::text AS "bron",
        'deskcontrole'::text AS "bronSleutel",
        v."excel_rij" AS "excelRij",
        COALESCE(v.parameter, '')::text AS parameter,
        v."nc_id"::text AS "ncId",
        COALESCE(v.omschrijving, '')::text AS omschrijving,
        COALESCE(v."vastgesteld_door_ci", '')::text AS "vastgesteldDoorCi",
        COALESCE(v.verduidelijking, '')::text AS verduidelijking,
        COALESCE(v."grote_impact", '')::text AS "groteImpact",
        COALESCE(v.categorie, '')::text AS categorie,
        COALESCE(v."motivatie_aanpassing", '')::text AS "motivatieAanpassing",
        v."aangemaakt_op" AS "aangemaaktOp",
        COALESCE(d.auditeur, '')::text AS auditeur,
        COALESCE(l."naam_persoon", '')::text AS "naamAdi",
        COALESCE(l."ovam_id", '')::text AS "ovamId",
        d."datum_controle" AS "datumControle",
        COALESCE(d.attestnummer, '')::text AS attestnummer,
        COALESCE(d."link_attest", '')::text AS "linkAttest",
        COALESCE(l."certificatie_platform", '')::text AS "certificatiePlatform",
        COALESCE(d.adres, '')::text AS adres,
        COALESCE(pc."naam_bedrijf", l.bedrijf, '')::text AS bedrijfsnaam,
        COALESCE(pc."kbo_nummer", '')::text AS ondernemingsnummer,
        COALESCE(l.certificaatnummer, '')::text AS persoonscertificaat,
        COALESCE(pc.certificaatnummer, '')::text AS procescertificaat
      FROM "deskcontrole_vaststellingen" v
      INNER JOIN "deskcontroles" d ON d.id = v."deskcontrole_id"
      INNER JOIN "leden" l ON l.id = d."lid_id"
      LEFT JOIN "procescertificaten" pc ON pc.id = d."procescertificaat_id"
      WHERE d."verwijderd_op" IS NULL

      UNION ALL

      SELECT
        (v.id * 2 + 1)::integer AS "lijstId",
        v.id AS "vaststellingId",
        t.id AS "controleId",
        'Terreincontrole'::text AS "bron",
        'terreincontrole'::text AS "bronSleutel",
        v."excel_rij" AS "excelRij",
        COALESCE(v.parameter, '')::text AS parameter,
        v."nc_id"::text AS "ncId",
        COALESCE(v.omschrijving, '')::text AS omschrijving,
        COALESCE(v."vastgesteld_door_ci", '')::text AS "vastgesteldDoorCi",
        COALESCE(v.verduidelijking, '')::text AS verduidelijking,
        COALESCE(v."grote_impact", '')::text AS "groteImpact",
        COALESCE(v.categorie, '')::text AS categorie,
        COALESCE(v."motivatie_aanpassing", '')::text AS "motivatieAanpassing",
        v."aangemaakt_op" AS "aangemaaktOp",
        COALESCE(t.auditeur, '')::text AS auditeur,
        COALESCE(t."naam_adi", l."naam_persoon", '')::text AS "naamAdi",
        COALESCE(t."persoons_id", l."ovam_id", '')::text AS "ovamId",
        t."datum_controle" AS "datumControle",
        COALESCE(t.attestnummer, '')::text AS attestnummer,
        COALESCE(t."link_attest", '')::text AS "linkAttest",
        COALESCE(t."certificatie_platform", '')::text AS "certificatiePlatform",
        COALESCE(t.adres, '')::text AS adres,
        COALESCE(t.bedrijfsnaam, '')::text AS bedrijfsnaam,
        COALESCE(t.ondernemingsnummer, '')::text AS ondernemingsnummer,
        COALESCE(t."persoonscertificaat_nummer", '')::text AS persoonscertificaat,
        COALESCE(t."procescertificaat_nummer", '')::text AS procescertificaat
      FROM "terreincontrole_vaststellingen" v
      INNER JOIN "terreincontrole_dossiers" t
        ON t.id = v."terreincontrole_dossier_id"
      INNER JOIN "leden" l ON l.id = t."lid_id"
      WHERE t."verwijderd_op" IS NULL
    )
  `;
}

function tekstExpressie(sleutel: NonConformiteitSortering, alias = "b") {
  const prefix = Prisma.raw(`"${alias}".`);

  switch (sleutel) {
    case "datumControle":
      return Prisma.sql`TO_CHAR(${prefix}"datumControle", 'DD/MM/YYYY')`;
    case "bron":
      return Prisma.sql`${prefix}"bron"`;
    case "ncId":
      return Prisma.sql`${prefix}"ncId"`;
    case "categorie":
      return Prisma.sql`${prefix}"categorie"`;
    case "parameter":
      return Prisma.sql`${prefix}"parameter"`;
    case "naamAdi":
      return Prisma.sql`${prefix}"naamAdi"`;
    case "ovamId":
      return Prisma.sql`${prefix}"ovamId"`;
    case "attestnummer":
      return Prisma.sql`${prefix}"attestnummer"`;
    case "adres":
      return Prisma.sql`${prefix}"adres"`;
    case "vastgesteldDoorCi":
      return Prisma.sql`${prefix}"vastgesteldDoorCi"`;
    case "groteImpact":
      return Prisma.sql`${prefix}"groteImpact"`;
  }
}

function sorteerExpressie(sleutel: NonConformiteitSortering, alias = "f") {
  const prefix = Prisma.raw(`"${alias}".`);

  if (sleutel === "datumControle") {
    return Prisma.sql`${prefix}"datumControle"`;
  }

  return Prisma.sql`NULLIF(BTRIM((${tekstExpressie(sleutel, alias)})::text), '')`;
}

function maakFilterVoorwaarde(expressie: Prisma.Sql, waarde: string) {
  if (!waarde) {
    return Prisma.empty;
  }

  const excelFilter = leesExcelFilter(waarde);
  const genormaliseerd = Prisma.sql`
    COALESCE(NULLIF(BTRIM((${expressie})::text), ''), '')
  `;

  if (!excelFilter) {
    return Prisma.sql`
      AND STRPOS(LOWER(${genormaliseerd}), LOWER(${waarde})) > 0
    `;
  }

  if (excelFilter.modus === "insluiten") {
    const voorwaarden: Prisma.Sql[] = [];

    if (excelFilter.waarden.length) {
      voorwaarden.push(
        Prisma.sql`${genormaliseerd} IN (${Prisma.join(excelFilter.waarden)})`,
      );
    }

    if (excelFilter.legeCellenGeselecteerd) {
      voorwaarden.push(Prisma.sql`${genormaliseerd} = ''`);
    }

    if (!voorwaarden.length) {
      return Prisma.sql`AND FALSE`;
    }

    return Prisma.sql`
      AND (${Prisma.join(voorwaarden, " OR ")})
    `;
  }

  const voorwaarden: Prisma.Sql[] = [];

  if (excelFilter.waarden.length) {
    voorwaarden.push(
      Prisma.sql`${genormaliseerd} NOT IN (${Prisma.join(
        excelFilter.waarden,
      )})`,
    );
  }

  if (!excelFilter.legeCellenGeselecteerd) {
    voorwaarden.push(Prisma.sql`${genormaliseerd} <> ''`);
  }

  if (!voorwaarden.length) {
    return Prisma.empty;
  }

  return Prisma.sql`
    AND (${Prisma.join(voorwaarden, " AND ")})
  `;
}

function maakZoekVoorwaarde(zoekterm: string) {
  if (!zoekterm) {
    return Prisma.empty;
  }

  const expressies: Prisma.Sql[] = [
    Prisma.sql`b."bron"`,
    Prisma.sql`b."ncId"`,
    Prisma.sql`b.categorie`,
    Prisma.sql`b.parameter`,
    Prisma.sql`b."naamAdi"`,
    Prisma.sql`b."ovamId"`,
    Prisma.sql`TO_CHAR(b."datumControle", 'DD/MM/YYYY')`,
    Prisma.sql`b.attestnummer`,
    Prisma.sql`b.adres`,
    Prisma.sql`b.omschrijving`,
    Prisma.sql`b."vastgesteldDoorCi"`,
    Prisma.sql`b.verduidelijking`,
    Prisma.sql`b."groteImpact"`,
    Prisma.sql`b."motivatieAanpassing"`,
    Prisma.sql`b.auditeur`,
    Prisma.sql`b.bedrijfsnaam`,
    Prisma.sql`b.ondernemingsnummer`,
    Prisma.sql`b.persoonscertificaat`,
    Prisma.sql`b.procescertificaat`,
  ];

  return Prisma.sql`
    AND (
      ${Prisma.join(
        expressies.map(
          (expressie) =>
            Prisma.sql`STRPOS(
              LOWER(COALESCE((${expressie})::text, '')),
              LOWER(${zoekterm})
            ) > 0`,
        ),
        " OR ",
      )}
    )
  `;
}

function maakFilters(filters: NonConformiteitFilters) {
  return Prisma.join(
    NON_CONFORMITEIT_SORTERINGEN.map((sleutel) =>
      maakFilterVoorwaarde(tekstExpressie(sleutel), filters[sleutel]),
    ),
    " ",
  );
}

function maakSorteervolgorde(sorteringen: NonConformiteitSorteercriterium[]) {
  const onderdelen: Prisma.Sql[] = [];

  for (const sortering of sorteringen) {
    const expressie = sorteerExpressie(sortering.sleutel);
    const richting =
      sortering.richting === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    onderdelen.push(Prisma.sql`(${expressie} IS NULL) ASC`);
    onderdelen.push(Prisma.sql`${expressie} ${richting}`);
  }

  onderdelen.push(Prisma.sql`f."lijstId" ASC`);

  return Prisma.join(onderdelen, ", ");
}

export async function laadNonConformiteiten({
  zoekterm,
  filters,
  sorteringen,
  limiet,
  cursorId,
}: {
  zoekterm: string;
  filters: NonConformiteitFilters;
  sorteringen: NonConformiteitSorteercriterium[];
  limiet: number | null;
  cursorId: number | null;
}) {
  const cursorVoorwaarde =
    cursorId === null
      ? Prisma.empty
      : Prisma.sql`
          WHERE g."positie" >
            COALESCE(
              (
                SELECT c."positie"
                FROM "gerangschikt" c
                WHERE c."lijstId" = ${cursorId}
              ),
              0
            )
        `;

  const limietVoorwaarde =
    limiet === null ? Prisma.empty : Prisma.sql`LIMIT ${limiet + 1}`;

  return prisma.$queryRaw<NonConformiteitSelectieRij[]>(Prisma.sql`
    WITH
    ${basisCte()},
    "gefilterd" AS (
      SELECT b.*
      FROM "basis" b
      WHERE TRUE
      ${maakZoekVoorwaarde(zoekterm)}
      ${maakFilters(filters)}
    ),
    "gerangschikt" AS (
      SELECT
        f.*,
        COUNT(*) OVER ()::integer AS "aantalTotaal",
        ROW_NUMBER() OVER (
          ORDER BY ${maakSorteervolgorde(sorteringen)}
        ) AS "positie"
      FROM "gefilterd" f
    )
    SELECT
      g."lijstId",
      g."vaststellingId",
      g."controleId",
      g."bron",
      g."bronSleutel",
      g."excelRij",
      g.parameter,
      g."ncId",
      g.omschrijving,
      g."vastgesteldDoorCi",
      g.verduidelijking,
      g."groteImpact",
      g.categorie,
      g."motivatieAanpassing",
      g."aangemaaktOp",
      g.auditeur,
      g."naamAdi",
      g."ovamId",
      g."datumControle",
      g.attestnummer,
      g."linkAttest",
      g."certificatiePlatform",
      g.adres,
      g.bedrijfsnaam,
      g.ondernemingsnummer,
      g.persoonscertificaat,
      g.procescertificaat,
      g."aantalTotaal"
    FROM "gerangschikt" g
    ${cursorVoorwaarde}
    ORDER BY g."positie" ASC
    ${limietVoorwaarde}
  `);
}

export async function laadNonConformiteitTrends(ncIds: string[]) {
  const uniekeNcIds = Array.from(
    new Set(ncIds.map((ncId) => ncId.trim()).filter(Boolean)),
  );

  const resultaat: Record<string, NonConformiteitTrendPunt[]> = {};

  for (const ncId of uniekeNcIds) {
    resultaat[ncId] = [];
  }

  if (uniekeNcIds.length === 0) {
    return resultaat;
  }

  const rijen = await prisma.$queryRaw<NonConformiteitTrendRij[]>(
    Prisma.sql`
        WITH ${basisCte()}
        SELECT
          BTRIM(b."ncId") AS "ncId",
          TO_CHAR(
            DATE_TRUNC('month', b."datumControle"),
            'YYYY-MM'
          ) AS periode,
          COUNT(*)::integer AS aantal
        FROM "basis" b
        WHERE
          b."datumControle" IS NOT NULL
          AND BTRIM(b."ncId") IN (${Prisma.join(uniekeNcIds)})
        GROUP BY
          BTRIM(b."ncId"),
          DATE_TRUNC('month', b."datumControle")
        ORDER BY
          BTRIM(b."ncId") ASC,
          DATE_TRUNC('month', b."datumControle") ASC
      `,
  );

  for (const rij of rijen) {
    const trend = resultaat[rij.ncId] ?? [];

    trend.push({
      periode: rij.periode,
      aantal: rij.aantal,
    });

    resultaat[rij.ncId] = trend;
  }

  return resultaat;
}

export async function laadNonConformiteitFilterwaarden({
  kolom,
  zoekterm,
}: {
  kolom: NonConformiteitSortering;
  zoekterm: string;
}) {
  const expressie = tekstExpressie(kolom);

  const zoekvoorwaarde = zoekterm
    ? Prisma.sql`
        WHERE STRPOS(
          LOWER(COALESCE((${expressie})::text, '')),
          LOWER(${zoekterm})
        ) > 0
      `
    : Prisma.empty;

  return prisma.$queryRaw<NonConformiteitFilterwaarde[]>(Prisma.sql`
    WITH ${basisCte()}
    SELECT
      COALESCE(NULLIF(BTRIM((${expressie})::text), ''), '') AS waarde,
      COUNT(*)::integer AS aantal
    FROM "basis" b
    ${zoekvoorwaarde}
    GROUP BY COALESCE(NULLIF(BTRIM((${expressie})::text), ''), '')
    ORDER BY
      CASE
        WHEN COALESCE(NULLIF(BTRIM((${expressie})::text), ''), '') = ''
        THEN 0
        ELSE 1
      END,
      LOWER(COALESCE(NULLIF(BTRIM((${expressie})::text), ''), '')) ASC
    LIMIT 500
  `);
}

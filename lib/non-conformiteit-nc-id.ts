import { prisma } from "@/lib/prisma";

const MAXIMAAL_AANTAL_ALIASES_PER_QUERY = 1000;

export function normaliseerNcIdAlias(ncId: string) {
  return ncId.trim().toLowerCase();
}

export async function laadCanoniekeNcIdKaart(
  ncIds: readonly string[],
): Promise<Map<string, string>> {
  const aliases = Array.from(
    new Set(ncIds.map(normaliseerNcIdAlias).filter(Boolean)),
  );

  const resultaat = new Map<string, string>();

  for (
    let begin = 0;
    begin < aliases.length;
    begin += MAXIMAAL_AANTAL_ALIASES_PER_QUERY
  ) {
    const deel = aliases.slice(
      begin,
      begin + MAXIMAAL_AANTAL_ALIASES_PER_QUERY,
    );

    const koppelingen = await prisma.nonConformiteitNcIdAlias.findMany({
      where: {
        aliasGenormaliseerd: {
          in: deel,
        },
      },
      select: {
        aliasGenormaliseerd: true,
        canoniekeNcId: true,
      },
    });

    for (const koppeling of koppelingen) {
      resultaat.set(
        koppeling.aliasGenormaliseerd,
        koppeling.canoniekeNcId.trim(),
      );
    }
  }

  return resultaat;
}

export function geefCanoniekeNcId(
  ncId: string,
  canoniekeNcIdKaart: ReadonlyMap<string, string>,
) {
  const origineel = ncId.trim();

  if (!origineel) {
    return "";
  }

  return canoniekeNcIdKaart.get(normaliseerNcIdAlias(origineel)) ?? origineel;
}

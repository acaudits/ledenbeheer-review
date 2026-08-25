"use server";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RESERVERING_DUUR_MS =
  10 * 60 * 1000;

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlaatsbezoekBeschikbaarheid =
  | "BESCHIKBAAR"
  | "DOOR_MIJ"
  | "DOOR_ANDER"
  | "INGEPLAND"
  | "AFWEZIG"
  | "VERWIJDERD";

export type PlaatsbezoekBeschikbaarheidRij = {
  attestId: string;
  beschikbaarheid:
    PlaatsbezoekBeschikbaarheid;
  gereserveerdDoor: string | null;
  reserveringVerlooptOp: string | null;
  ingeplandDoor: string | null;
  ingeplandAdres?: string | null;
};

export type ReserveerResultaat = {
  attestId: string;
  succes: boolean;
  beschikbaarheid:
    PlaatsbezoekBeschikbaarheid;
  gereserveerdDoor: string | null;
  reserveringVerlooptOp: string | null;
  ingeplandDoor: string | null;
  ingeplandAdres?: string | null;
  message: string;
};

function uniekeGeldigeAttestIds(
  attestIds: string[],
) {
  return [
    ...new Set(
      attestIds
        .map((attestId) =>
          attestId.trim().toLowerCase(),
        )
        .filter((attestId) =>
          UUID_PATROON.test(attestId),
        ),
    ),
  ].slice(0, 5000);
}

function gebruikersnaam(gebruiker: {
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
  email: string;
}) {
  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    volledigeNaam ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

type BestaandPlaatsbezoek = {
  verwijderdOp: Date | null;
  afwezigOp: Date | null;
  inspectielocatie: string | null;
  adres: string | null;
};

function bepaalBestaandeBeschikbaarheid(
  bezoek: BestaandPlaatsbezoek,
): PlaatsbezoekBeschikbaarheid {
  if (bezoek.verwijderdOp) {
    return "VERWIJDERD";
  }

  if (bezoek.afwezigOp) {
    return "AFWEZIG";
  }

  return "INGEPLAND";
}

function bepaalBestaandAdres(
  bezoek: BestaandPlaatsbezoek,
) {
  return (
    bezoek.inspectielocatie?.trim() ||
    bezoek.adres?.trim() ||
    null
  );
}

function maakDatabaseMelding({
  beschikbaarheid,
  eigenaar,
  adres,
}: {
  beschikbaarheid:
    PlaatsbezoekBeschikbaarheid;
  eigenaar: string | null;
  adres: string | null;
}) {
  const basis =
    beschikbaarheid === "AFWEZIG"
      ? `Bij afwezigen${eigenaar ? ` – ${eigenaar}` : ""}`
      : beschikbaarheid === "VERWIJDERD"
        ? `Verwijderd${eigenaar ? ` – ${eigenaar}` : ""}`
        : eigenaar
          ? `Reeds ingepland door ${eigenaar}`
          : "Reeds ingepland";

  return `${basis}. Op adres ${adres || "onbekend"}.`;
}

function isUniekheidsfout(
  fout: unknown,
) {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

async function reserveerEen(
  attestIdInvoer: string,
  gebruiker: {
    id: number;
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
    email: string;
  },
): Promise<ReserveerResultaat> {
  const attestId =
    attestIdInvoer
      .trim()
      .toLowerCase();

  if (!UUID_PATROON.test(attestId)) {
    return {
      attestId,
      succes: false,
      beschikbaarheid:
        "BESCHIKBAAR",
      gereserveerdDoor: null,
      reserveringVerlooptOp: null,
      ingeplandDoor: null,
      message:
        "Geen geldig Attest-ID gevonden.",
    };
  }

  const nu = new Date();
  const verlooptOp = new Date(
    nu.getTime() +
      RESERVERING_DUUR_MS,
  );

  try {
    return await prisma.$transaction(
      async (tx) => {
        const ingepland =
          await tx.terreincontrole.findUnique({
            where: {
              attestId,
            },
            select: {
              auditeur: true,
              verwijderdOp: true,
              afwezigOp: true,
              inspectielocatie: true,
              adres: true,
              auditeurGebruiker: {
                select: {
                  naam: true,
                  voornaam: true,
                  achternaam: true,
                  email: true,
                },
              },
            },
          });

        if (ingepland) {
          const eigenaar =
            ingepland.auditeurGebruiker
              ? gebruikersnaam(
                  ingepland.auditeurGebruiker,
                )
              : ingepland.auditeur;

          const beschikbaarheid =
            bepaalBestaandeBeschikbaarheid(
              ingepland,
            );

          const ingeplandAdres =
            bepaalBestaandAdres(
              ingepland,
            );

          return {
            attestId,
            succes: false,
            beschikbaarheid,
            gereserveerdDoor: null,
            reserveringVerlooptOp: null,
            ingeplandDoor:
              eigenaar || null,
            ingeplandAdres,
            message:
              maakDatabaseMelding({
                beschikbaarheid,
                eigenaar:
                  eigenaar || null,
                adres:
                  ingeplandAdres,
              }),
          };
        }

        await tx.terreincontroleReservering.deleteMany({
          where: {
            attestId,
            verlooptOp: {
              lte: nu,
            },
          },
        });

        const bestaande =
          await tx.terreincontroleReservering.findUnique({
            where: {
              attestId,
            },
            include: {
              gebruiker: {
                select: {
                  naam: true,
                  voornaam: true,
                  achternaam: true,
                  email: true,
                },
              },
            },
          });

        if (
          bestaande &&
          bestaande.gebruikerId !==
            gebruiker.id
        ) {
          const eigenaar =
            gebruikersnaam(
              bestaande.gebruiker,
            );

          return {
            attestId,
            succes: false,
            beschikbaarheid:
              "DOOR_ANDER" as const,
            gereserveerdDoor:
              eigenaar,
            reserveringVerlooptOp:
              bestaande.verlooptOp.toISOString(),
            ingeplandDoor: null,
            message:
              `Tijdelijk gereserveerd door ${eigenaar}.`,
          };
        }

        const reservering =
          bestaande
            ? await tx.terreincontroleReservering.update({
                where: {
                  attestId,
                },
                data: {
                  verlooptOp,
                },
              })
            : await tx.terreincontroleReservering.create({
                data: {
                  attestId,
                  gebruikerId:
                    gebruiker.id,
                  verlooptOp,
                },
              });

        return {
          attestId,
          succes: true,
          beschikbaarheid:
            "DOOR_MIJ" as const,
          gereserveerdDoor:
            gebruikersnaam(gebruiker),
          reserveringVerlooptOp:
            reservering.verlooptOp.toISOString(),
          ingeplandDoor: null,
          message:
            "Plaatsbezoek is gedurende 10 minuten voor jou gereserveerd.",
        };
      },
    );
  } catch (fout) {
    if (isUniekheidsfout(fout)) {
      const bestaande =
        await prisma.terreincontroleReservering.findUnique({
          where: {
            attestId,
          },
          include: {
            gebruiker: {
              select: {
                naam: true,
                voornaam: true,
                achternaam: true,
                email: true,
              },
            },
          },
        });

      const eigenaar =
        bestaande
          ? gebruikersnaam(
              bestaande.gebruiker,
            )
          : "een andere auditeur";

      return {
        attestId,
        succes: false,
        beschikbaarheid:
          "DOOR_ANDER",
        gereserveerdDoor:
          eigenaar,
        reserveringVerlooptOp:
          bestaande?.verlooptOp.toISOString() ??
          null,
        ingeplandDoor: null,
        message:
          `Dit plaatsbezoek werd ondertussen gereserveerd door ${eigenaar}.`,
      };
    }

    console.error(
      "Plaatsbezoek reserveren mislukt:",
      fout,
    );

    return {
      attestId,
      succes: false,
      beschikbaarheid:
        "BESCHIKBAAR",
      gereserveerdDoor: null,
      reserveringVerlooptOp: null,
      ingeplandDoor: null,
      message:
        "Reserveren is door een technische fout mislukt.",
    };
  }
}

export async function reserveerPlaatsbezoek(
  attestId: string,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  return reserveerEen(
    attestId,
    gebruiker,
  );
}

export async function reserveerPlaatsbezoeken(
  attestIds: string[],
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const ids =
    uniekeGeldigeAttestIds(
      attestIds,
    );

  const resultaten:
    ReserveerResultaat[] = [];

  for (const attestId of ids) {
    resultaten.push(
      await reserveerEen(
        attestId,
        gebruiker,
      ),
    );
  }

  return resultaten;
}

export async function geefPlaatsbezoekVrij(
  attestIdInvoer: string,
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const attestId =
    attestIdInvoer
      .trim()
      .toLowerCase();

  if (!UUID_PATROON.test(attestId)) {
    return {
      succes: false,
      message:
        "Geen geldig Attest-ID gevonden.",
    };
  }

  await prisma.terreincontroleReservering.deleteMany({
    where: {
      attestId,
      gebruikerId:
        gebruiker.id,
    },
  });

  return {
    succes: true,
    message:
      "Reservering vrijgegeven.",
  };
}

export async function vernieuwPlaatsbezoekReserveringen(
  attestIds: string[],
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const ids =
    uniekeGeldigeAttestIds(
      attestIds,
    );

  if (ids.length === 0) {
    return {
      succes: true,
      aantalVernieuwd: 0,
    };
  }

  const nu = new Date();
  const verlooptOp = new Date(
    nu.getTime() +
      RESERVERING_DUUR_MS,
  );

  const resultaat =
    await prisma.terreincontroleReservering.updateMany({
      where: {
        attestId: {
          in: ids,
        },
        gebruikerId:
          gebruiker.id,
        verlooptOp: {
          gt: nu,
        },
      },
      data: {
        verlooptOp,
      },
    });

  return {
    succes: true,
    aantalVernieuwd:
      resultaat.count,
    verlooptOp:
      verlooptOp.toISOString(),
  };
}

export async function haalPlaatsbezoekBeschikbaarheidOp(
  attestIds: string[],
): Promise<
  PlaatsbezoekBeschikbaarheidRij[]
> {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const ids =
    uniekeGeldigeAttestIds(
      attestIds,
    );

  if (ids.length === 0) {
    return [];
  }

  const nu = new Date();

  await prisma.terreincontroleReservering.deleteMany({
    where: {
      attestId: {
        in: ids,
      },
      verlooptOp: {
        lte: nu,
      },
    },
  });

  const [
    ingeplandeBezoeken,
    reserveringen,
  ] = await Promise.all([
    prisma.terreincontrole.findMany({
      where: {
        attestId: {
          in: ids,
        },
      },
      select: {
        attestId: true,
        auditeur: true,
        verwijderdOp: true,
        afwezigOp: true,
        inspectielocatie: true,
        adres: true,
        auditeurGebruiker: {
          select: {
            naam: true,
            voornaam: true,
            achternaam: true,
            email: true,
          },
        },
      },
    }),

    prisma.terreincontroleReservering.findMany({
      where: {
        attestId: {
          in: ids,
        },
        verlooptOp: {
          gt: nu,
        },
      },
      include: {
        gebruiker: {
          select: {
            naam: true,
            voornaam: true,
            achternaam: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const ingeplandPerId =
    new Map(
      ingeplandeBezoeken.map(
        (bezoek) => [
          bezoek.attestId,
          bezoek,
        ],
      ),
    );

  const reserveringPerId =
    new Map(
      reserveringen.map(
        (reservering) => [
          reservering.attestId,
          reservering,
        ],
      ),
    );

  return ids.map((attestId) => {
    const ingepland =
      ingeplandPerId.get(
        attestId,
      );

    if (ingepland) {
      return {
        attestId,
        beschikbaarheid:
          bepaalBestaandeBeschikbaarheid(
            ingepland,
          ),
        gereserveerdDoor: null,
        reserveringVerlooptOp: null,
        ingeplandDoor:
          ingepland.auditeurGebruiker
            ? gebruikersnaam(
                ingepland.auditeurGebruiker,
              )
            : ingepland.auditeur,
        ingeplandAdres:
          bepaalBestaandAdres(
            ingepland,
          ),
      };
    }

    const reservering =
      reserveringPerId.get(
        attestId,
      );

    if (!reservering) {
      return {
        attestId,
        beschikbaarheid:
          "BESCHIKBAAR",
        gereserveerdDoor: null,
        reserveringVerlooptOp: null,
        ingeplandDoor: null,
      };
    }

    return {
      attestId,
      beschikbaarheid:
        reservering.gebruikerId ===
        gebruiker.id
          ? "DOOR_MIJ"
          : "DOOR_ANDER",
      gereserveerdDoor:
        gebruikersnaam(
          reservering.gebruiker,
        ),
      reserveringVerlooptOp:
        reservering.verlooptOp.toISOString(),
      ingeplandDoor: null,
    };
  });
}

export async function controleerReserveringenVoorOpslaan(
  attestIds: string[],
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const ids =
    uniekeGeldigeAttestIds(
      attestIds,
    );

  if (
    ids.length === 0 ||
    ids.length !==
      attestIds.length
  ) {
    return {
      succes: false,
      message:
        "Niet alle geselecteerde rijen hebben een geldig en uniek Attest-ID.",
    };
  }

  const nu = new Date();

  const bestaand =
    await prisma.terreincontrole.findFirst({
      where: {
        attestId: {
          in: ids,
        },
      },
      select: {
        attestId: true,
        auditeur: true,
        verwijderdOp: true,
        afwezigOp: true,
        inspectielocatie: true,
        adres: true,
      },
    });

  if (bestaand) {
    return {
      succes: false,
      message:
        maakDatabaseMelding({
          beschikbaarheid:
            bepaalBestaandeBeschikbaarheid(
              bestaand,
            ),
          eigenaar:
            bestaand.auditeur,
          adres:
            bepaalBestaandAdres(
              bestaand,
            ),
        }),
    };
  }

  const reserveringen =
    await prisma.terreincontroleReservering.findMany({
      where: {
        attestId: {
          in: ids,
        },
        gebruikerId:
          gebruiker.id,
        verlooptOp: {
          gt: nu,
        },
      },
      select: {
        attestId: true,
      },
    });

  if (
    reserveringen.length !==
    ids.length
  ) {
    return {
      succes: false,
      message:
        "Minstens één reservering is verlopen of behoort ondertussen aan een andere auditeur. Selecteer de rijen opnieuw.",
    };
  }

  const verlooptOp = new Date(
    nu.getTime() +
      RESERVERING_DUUR_MS,
  );

  await prisma.terreincontroleReservering.updateMany({
    where: {
      attestId: {
        in: ids,
      },
      gebruikerId:
        gebruiker.id,
      verlooptOp: {
        gt: nu,
      },
    },
    data: {
      verlooptOp,
    },
  });

  return {
    succes: true,
    message:
      "Reserveringen zijn geldig.",
  };
}

export async function voltooiPlaatsbezoekReserveringen(
  attestIds: string[],
) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const ids =
    uniekeGeldigeAttestIds(
      attestIds,
    );

  if (ids.length === 0) {
    return;
  }

  await prisma.$transaction([
    prisma.terreincontrole.updateMany({
      where: {
        attestId: {
          in: ids,
        },
      },
      data: {
        auditeurGebruikerId:
          gebruiker.id,
        auditeur:
          gebruikersnaam(gebruiker),
      },
    }),

    prisma.terreincontroleReservering.deleteMany({
      where: {
        attestId: {
          in: ids,
        },
        gebruikerId:
          gebruiker.id,
      },
    }),
  ]);
}

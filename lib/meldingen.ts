import "server-only";

import { prisma } from "@/lib/prisma";

const DAG_IN_MILLSECONDEN =
  86_400_000;

function beginVanVandaag() {
  const vandaag = new Date();

  vandaag.setUTCHours(
    0,
    0,
    0,
    0,
  );

  return vandaag;
}

function datumSleutel(
  datum: Date,
) {
  return datum
    .toISOString()
    .slice(0, 10);
}

function formatteerDatum(
  datum: Date,
) {
  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

function urgentieTekst(
  datum: Date,
  vandaag: Date,
) {
  const verschilDagen =
    Math.round(
      (
        datum.getTime() -
        vandaag.getTime()
      ) /
        DAG_IN_MILLSECONDEN,
    );

  if (verschilDagen < 0) {
    const aantal =
      Math.abs(verschilDagen);

    return `${aantal} dag${aantal === 1 ? "" : "en"} verlopen`;
  }

  if (verschilDagen === 0) {
    return "vandaag";
  }

  return `binnen ${verschilDagen} dag${verschilDagen === 1 ? "" : "en"}`;
}

type DeadlineMelding = {
  sleutel: string;
  type: string;
  titel: string;
  bericht: string;
  href: string;
};

export async function synchroniseerDeadlineMeldingen(
  gebruikerId: number,
) {
  const vandaag =
    beginVanVandaag();

  const deadlineGrens =
    new Date(vandaag);

  deadlineGrens.setUTCDate(
    deadlineGrens.getUTCDate() +
      30,
  );

  const controles =
    await prisma.deskcontrole.findMany({
      where: {
        auditeurGebruikerId:
          gebruikerId,
        verwijderdOp: null,
        status: {
          not: "AFGEROND",
        },
        OR: [
          {
            deadlineSanctie: {
              lte: deadlineGrens,
            },
          },
          {
            deadlineCorrectie: {
              lte: deadlineGrens,
            },
          },
        ],
      },
      select: {
        id: true,
        attestnummer: true,
        deadlineSanctie: true,
        deadlineCorrectie: true,
        lid: {
          select: {
            naamPersoon: true,
          },
        },
      },
    });

  const actieveMeldingen:
    DeadlineMelding[] = [];

  for (const controle of controles) {
    const controleLabel =
      controle.attestnummer ??
      `deskcontrole #${controle.id}`;

    if (
      controle.deadlineSanctie &&
      controle.deadlineSanctie <=
        deadlineGrens
    ) {
      const datum =
        controle.deadlineSanctie;

      actieveMeldingen.push({
        sleutel:
          `deskcontrole:${controle.id}:sanctie:${datumSleutel(datum)}`,
        type:
          "DESKCONTROLE_DEADLINE",
        titel:
          datum < vandaag
            ? "Sanctiedeadline verlopen"
            : "Sanctiedeadline nadert",
        bericht:
          `De sanctiedeadline voor ${controleLabel} van ${controle.lid.naamPersoon} is ${urgentieTekst(datum, vandaag)} (${formatteerDatum(datum)}).`,
        href:
          `/deskcontroles/${controle.id}`,
      });
    }

    if (
      controle.deadlineCorrectie &&
      controle.deadlineCorrectie <=
        deadlineGrens
    ) {
      const datum =
        controle.deadlineCorrectie;

      actieveMeldingen.push({
        sleutel:
          `deskcontrole:${controle.id}:correctie:${datumSleutel(datum)}`,
        type:
          "DESKCONTROLE_DEADLINE",
        titel:
          datum < vandaag
            ? "Correctiedeadline verlopen"
            : "Correctiedeadline nadert",
        bericht:
          `De correctiedeadline voor ${controleLabel} van ${controle.lid.naamPersoon} is ${urgentieTekst(datum, vandaag)} (${formatteerDatum(datum)}).`,
        href:
          `/deskcontroles/${controle.id}`,
      });
    }
  }

  const actieveSleutels =
    actieveMeldingen.map(
      (melding) =>
        melding.sleutel,
    );

  const bewerkingen =
    actieveMeldingen.map(
      (melding) =>
        prisma.melding.upsert({
          where: {
            gebruikerId_sleutel: {
              gebruikerId,
              sleutel:
                melding.sleutel,
            },
          },
          create: {
            gebruikerId,
            sleutel:
              melding.sleutel,
            type: melding.type,
            titel:
              melding.titel,
            bericht:
              melding.bericht,
            href: melding.href,
          },
          update: {
            type: melding.type,
            titel:
              melding.titel,
            bericht:
              melding.bericht,
            href: melding.href,
          },
        }),
    );

  const verwijderVerouderdeMeldingen =
    prisma.melding.deleteMany({
      where: {
        gebruikerId,
        type:
          "DESKCONTROLE_DEADLINE",
        ...(actieveSleutels.length >
        0
          ? {
              sleutel: {
                notIn:
                  actieveSleutels,
              },
            }
          : {}),
      },
    });

  await prisma.$transaction([
    ...bewerkingen,
    verwijderVerouderdeMeldingen,
  ]);

  return {
    aantal:
      actieveMeldingen.length,
  };
}

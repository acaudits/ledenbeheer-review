import "server-only";

import webpush from "web-push";

import {
  prisma,
} from "@/lib/prisma";

type NieuwRoodPlaatsbezoek = {
  id: number;
  inspectielocatie: string;
  datumPlaatsbezoek: Date;
  tijdstip: Date;
  reden: string;
};

type VerwerkNieuweMeldingInvoer = {
  ovamId: string;
  naamAdi: string;
  bedrijfsnaam: string;
  bezoeken: NieuwRoodPlaatsbezoek[];
};

type ProviderFout = {
  statusCode?: unknown;
};

function normaliseerMeldingstekst(
  waarde: string,
  maximum: number,
) {
  const tekst =
    waarde
      .replace(/\s+/g, " ")
      .trim();

  if (tekst.length <= maximum) {
    return tekst;
  }

  return `${tekst.slice(
    0,
    Math.max(0, maximum - 1),
  )}…`;
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

function formatteerTijd(
  tijd: Date,
) {
  return tijd
    .toISOString()
    .slice(11, 16);
}

function haalStatusCodeOp(
  fout: unknown,
) {
  if (
    typeof fout !== "object" ||
    fout === null
  ) {
    return null;
  }

  const mogelijkeFout =
    fout as ProviderFout;

  return typeof mogelijkeFout
    .statusCode === "number"
    ? mogelijkeFout.statusCode
    : null;
}

function laadVapidConfiguratie() {
  const publiekeSleutel =
    process.env
      .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const privateSleutel =
    process.env.VAPID_PRIVATE_KEY;

  const onderwerp =
    process.env.VAPID_SUBJECT;

  if (
    !publiekeSleutel ||
    !privateSleutel ||
    !onderwerp
  ) {
    return null;
  }

  return {
    publiekeSleutel,
    privateSleutel,
    onderwerp,
  };
}

async function isRodeTerreincontrole(
  ovamId: string,
) {
  const [
    atteststatistiek,
    terreincontroles,
    tijdResultaat,
  ] = await Promise.all([
    prisma.attestPersoonStatistiek.findFirst({
      where: {
        persoonsId: ovamId,
      },
      select: {
        aantalAttesten: true,
      },
    }),

    prisma.terreincontrole.aggregate({
      where: {
        verwijderdOp: null,
        ovamId: {
          equals: ovamId,
          mode: "insensitive",
        },
      },
      _count: {
        _all: true,
      },
      _max: {
        datumPlaatsbezoek: true,
      },
    }),

    prisma.$queryRaw<
      Array<{ nu: Date }>
    >`SELECT CURRENT_TIMESTAMP AS nu`,
  ]);

  const nu =
    tijdResultaat[0]?.nu;

  if (!nu) {
    throw new Error(
      "Databasetijd ontbreekt.",
    );
  }

  const aantalAttesten =
    atteststatistiek
      ?.aantalAttesten ?? 0;

  const aantalTerreincontroles =
    terreincontroles._count._all;

  const laatsteTerreincontrole =
    terreincontroles._max
      .datumPlaatsbezoek;

  const terreincontroleTarget =
    aantalAttesten > 0
      ? Math.min(
          4,
          Math.ceil(
            aantalAttesten / 100,
          ),
        )
      : 0;

  const terreincontroleNodig =
    aantalTerreincontroles <
    terreincontroleTarget;

  const grensVeertienDagen =
    new Date(nu);

  grensVeertienDagen.setUTCHours(
    0,
    0,
    0,
    0,
  );

  grensVeertienDagen.setUTCDate(
    grensVeertienDagen.getUTCDate() -
      14,
  );

  const laatsteControleTeOud =
    laatsteTerreincontrole === null ||
    laatsteTerreincontrole
      .getTime() <
      grensVeertienDagen.getTime();

  return (
    terreincontroleNodig &&
    laatsteControleTeOud
  );
}

async function verstuurNaarAbonnement({
  abonnement,
  bezoek,
  naamAdi,
  bedrijfsnaam,
}: {
  abonnement: {
    id: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  };
  bezoek: NieuwRoodPlaatsbezoek;
  naamAdi: string;
  bedrijfsnaam: string;
}) {
  const verzending =
    await prisma.pushVerzending.upsert({
      where: {
        plaatsbezoekId_abonnementId: {
          plaatsbezoekId:
            bezoek.id,
          abonnementId:
            abonnement.id,
        },
      },
      create: {
        plaatsbezoekId:
          bezoek.id,
        abonnementId:
          abonnement.id,
        status: "WACHTEND",
      },
      update: {},
    });

  const claim =
    await prisma.pushVerzending.updateMany({
      where: {
        id: verzending.id,
        status: "WACHTEND",
        pogingen: 0,
      },
      data: {
        status: "BEZIG",
        pogingen: {
          increment: 1,
        },
        laatsteFout: null,
      },
    });

  if (claim.count !== 1) {
    return;
  }

  const reden =
    normaliseerMeldingstekst(
      bezoek.reden,
      240,
    );

  const inhoud = {
    title:
      "Rode laattijdige plaatsbezoekmelding",
    body: [
      `ADI: ${normaliseerMeldingstekst(
        naamAdi,
        120,
      )}`,
      `Bedrijf: ${normaliseerMeldingstekst(
        bedrijfsnaam,
        160,
      )}`,
      `Adres: ${normaliseerMeldingstekst(
        bezoek.inspectielocatie,
        220,
      )}`,
      `Datum en tijd: ${formatteerDatum(
        bezoek.datumPlaatsbezoek,
      )} om ${formatteerTijd(
        bezoek.tijdstip,
      )}`,
      `Reden: ${reden}`,
    ].join("\n"),
    url:
      "/laattijdige-plaatsbezoeken",
    tag:
      `rood-laattijdig-${bezoek.id}`,
    renotify: true,
  };

  try {
    await webpush.sendNotification(
      {
        endpoint:
          abonnement.endpoint,
        keys: {
          p256dh:
            abonnement.p256dh,
          auth: abonnement.auth,
        },
      },
      JSON.stringify(inhoud),
      {
        TTL: 60 * 60,
        urgency: "high",
      },
    );

    await prisma.pushVerzending.update({
      where: {
        id: verzending.id,
      },
      data: {
        status: "VERZONDEN",
        verzondenOp: new Date(),
        laatsteFout: null,
      },
    });
  } catch (fout) {
    const statusCode =
      haalStatusCodeOp(fout);

    await prisma.pushVerzending.update({
      where: {
        id: verzending.id,
      },
      data: {
        status: "MISLUKT",
        laatsteFout:
          statusCode === null
            ? "Pushdienst niet bereikbaar."
            : `Pushdienst gaf HTTP-status ${statusCode}.`,
      },
    });

    if (
      statusCode === 404 ||
      statusCode === 410
    ) {
      await prisma.pushAbonnement.deleteMany({
        where: {
          id: abonnement.id,
        },
      });
    }
  }
}

export async function verwerkPushVoorNieuweLaattijdigeMelding({
  ovamId,
  naamAdi,
  bedrijfsnaam,
  bezoeken,
}: VerwerkNieuweMeldingInvoer) {
  if (bezoeken.length === 0) {
    return;
  }

  const vapid =
    laadVapidConfiguratie();

  if (!vapid) {
    console.error(
      "Pushmelding overgeslagen: VAPID-configuratie ontbreekt.",
    );

    return;
  }

  const rood =
    await isRodeTerreincontrole(
      ovamId,
    );

  if (!rood) {
    return;
  }

  const abonnementen =
    await prisma.pushAbonnement.findMany({
      where: {
        gebruiker: {
          actief: true,
          rol: {
            in: [
              "BEHEERDER",
              "AUDITEUR",
            ],
          },
        },
      },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

  if (abonnementen.length === 0) {
    return;
  }

  webpush.setVapidDetails(
    vapid.onderwerp,
    vapid.publiekeSleutel,
    vapid.privateSleutel,
  );

  const taken =
    bezoeken.flatMap(
      (bezoek) =>
        abonnementen.map(
          (abonnement) =>
            verstuurNaarAbonnement({
              abonnement,
              bezoek,
              naamAdi,
              bedrijfsnaam,
            }),
        ),
    );

  await Promise.allSettled(taken);
}

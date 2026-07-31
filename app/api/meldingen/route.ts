import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  synchroniseerDeadlineMeldingen,
} from "@/lib/meldingen";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

function geenCacheHeaders() {
  return {
    "Cache-Control":
      "no-store",
  };
}

async function haalActieveGebruikerOp() {
  const gebruiker =
    await haalIngelogdeGebruikerOp();

  if (
    !gebruiker ||
    !gebruiker.actief
  ) {
    return null;
  }

  return gebruiker;
}

export async function GET() {
  try {
    const gebruiker =
      await haalActieveGebruikerOp();

    if (!gebruiker) {
      return NextResponse.json(
        {
          melding:
            "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers:
            geenCacheHeaders(),
        },
      );
    }

    await synchroniseerDeadlineMeldingen(
      gebruiker.id,
    );

    const [
      meldingen,
      aantalOngelezen,
    ] = await Promise.all([
      prisma.melding.findMany({
        where: {
          gebruikerId:
            gebruiker.id,
        },
        select: {
          id: true,
          type: true,
          titel: true,
          bericht: true,
          href: true,
          gelezenOp: true,
          aangemaaktOp: true,
        },
        orderBy: [
          {
            gelezenOp: "asc",
          },
          {
            aangemaaktOp:
              "desc",
          },
        ],
        take: 50,
      }),

      prisma.melding.count({
        where: {
          gebruikerId:
            gebruiker.id,
          gelezenOp: null,
        },
      }),
    ]);

    return NextResponse.json(
      {
        meldingen,
        aantalOngelezen,
      },
      {
        headers:
          geenCacheHeaders(),
      },
    );
  } catch (fout) {
    console.error(
      "Meldingen ophalen mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        melding:
          "De meldingen konden niet worden opgehaald.",
      },
      {
        status: 500,
        headers:
          geenCacheHeaders(),
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const origin =
      request.headers.get(
        "origin",
      );

    const doorgestuurdeHost =
      request.headers.get(
        "x-forwarded-host",
      );

    const aanvraagHost =
      (
        doorgestuurdeHost ??
        request.headers.get(
          "host",
        )
      )
        ?.split(",")[0]
        .trim();

    const originHost =
      origin
        ? new URL(origin).host
        : null;

    if (
      originHost &&
      (
        !aanvraagHost ||
        originHost !==
          aanvraagHost
      )
    ) {
      return NextResponse.json(
        {
          melding:
            "Ongeldige aanvraag.",
        },
        {
          status: 403,
          headers:
            geenCacheHeaders(),
        },
      );
    }

    const gebruiker =
      await haalActieveGebruikerOp();

    if (!gebruiker) {
      return NextResponse.json(
        {
          melding:
            "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers:
            geenCacheHeaders(),
        },
      );
    }

    const gegevens =
      await request
        .json()
        .catch(() => null);

    if (
      gegevens?.alles ===
      true
    ) {
      const resultaat =
        await prisma.melding.updateMany({
          where: {
            gebruikerId:
              gebruiker.id,
            gelezenOp: null,
          },
          data: {
            gelezenOp:
              new Date(),
          },
        });

      return NextResponse.json(
        {
          succes: true,
          aantal:
            resultaat.count,
        },
        {
          headers:
            geenCacheHeaders(),
        },
      );
    }

    const meldingId =
      Number(
        gegevens?.id,
      );

    if (
      !Number.isInteger(
        meldingId,
      ) ||
      meldingId <= 0
    ) {
      return NextResponse.json(
        {
          melding:
            "Ongeldige melding.",
        },
        {
          status: 400,
          headers:
            geenCacheHeaders(),
        },
      );
    }

    const gelezen =
      gegevens?.gelezen !==
      false;

    const resultaat =
      await prisma.melding.updateMany({
        where: {
          id: meldingId,
          gebruikerId:
            gebruiker.id,
        },
        data: {
          gelezenOp: gelezen
            ? new Date()
            : null,
        },
      });

    if (
      resultaat.count === 0
    ) {
      return NextResponse.json(
        {
          melding:
            "Melding niet gevonden.",
        },
        {
          status: 404,
          headers:
            geenCacheHeaders(),
        },
      );
    }

    return NextResponse.json(
      {
        succes: true,
      },
      {
        headers:
          geenCacheHeaders(),
      },
    );
  } catch (fout) {
    console.error(
      "Meldingstatus aanpassen mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        melding:
          "De meldingstatus kon niet worden aangepast.",
      },
      {
        status: 500,
        headers:
          geenCacheHeaders(),
      },
    );
  }
}

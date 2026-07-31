import {
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

export async function GET() {
  try {
    const gebruiker =
      await haalIngelogdeGebruikerOp();

    if (
      !gebruiker ||
      !gebruiker.actief
    ) {
      return NextResponse.json(
        {
          melding:
            "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
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
        headers: {
          "Cache-Control":
            "no-store",
        },
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
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

import {
  NextResponse,
} from "next/server";

import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const GEEN_CACHE = {
  "Cache-Control":
    "private, no-store, max-age=0",
};

export async function GET() {
  try {
    const gebruiker =
      await haalIngelogdeGebruikerOp();

    if (
      !gebruiker?.actief
    ) {
      return NextResponse.json(
        {
          melding:
            "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers: GEEN_CACHE,
        },
      );
    }

    const aantalOngelezen =
      await prisma.melding.count({
        where: {
          gebruikerId:
            gebruiker.id,
          gelezenOp: null,
        },
      });

    return NextResponse.json(
      {
        aantalOngelezen,
      },
      {
        headers: GEEN_CACHE,
      },
    );
  } catch (fout) {
    console.error(
      "Aantal ongelezen meldingen ophalen mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        melding:
          "Het aantal meldingen kon niet worden opgehaald.",
      },
      {
        status: 500,
        headers: GEEN_CACHE,
      },
    );
  }
}

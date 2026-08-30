import {
  NextResponse,
} from "next/server";

import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  bepaalPrimaireRol,
  normaliseerRollen,
} from "@/lib/autorisatie";

export async function GET() {
  try {
    const gebruiker =
      await haalIngelogdeGebruikerOp();

    const rollen =
      normaliseerRollen(
        gebruiker?.rollen,
      );

    if (
      !gebruiker ||
      !gebruiker.actief ||
      rollen.length === 0
    ) {
      return NextResponse.json(
        {
          ingelogd: false,
          beheerder: false,
          rol: null,
          rollen: [],
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      ingelogd: true,
      beheerder:
        rollen.includes(
          "BEHEERDER",
        ),

      /*
       * Tijdelijk behouden voor oudere
       * clientcomponenten.
       */
      rol:
        bepaalPrimaireRol(
          rollen,
        ),

      rollen,
      naam: gebruiker.naam,
      email: gebruiker.email,
    });
  } catch (fout) {
    console.error(
      "Ingelogde gebruiker ophalen mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        ingelogd: false,
        beheerder: false,
        rol: null,
        rollen: [],
      },
      {
        status: 500,
      },
    );
  }
}

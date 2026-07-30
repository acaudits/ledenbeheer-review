import {
  NextResponse,
} from "next/server";

import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  isGebruikersrol,
} from "@/lib/autorisatie";

export async function GET() {
  try {
    const gebruiker =
      await haalIngelogdeGebruikerOp();

    if (
      !gebruiker ||
      !gebruiker.actief ||
      !isGebruikersrol(
        gebruiker.rol,
      )
    ) {
      return NextResponse.json(
        {
          ingelogd: false,
          beheerder: false,
          rol: null,
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      ingelogd: true,

      /*
       * Tijdelijk behouden voor componenten
       * die nog de oude eigenschap gebruiken.
       */
      beheerder:
        gebruiker.rol ===
        "BEHEERDER",

      rol: gebruiker.rol,
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
      },
      {
        status: 500,
      },
    );
  }
}

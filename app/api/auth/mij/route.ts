import { NextResponse } from "next/server";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";

export async function GET() {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker || !gebruiker.actief) {
      return NextResponse.json(
        {
          ingelogd: false,
          beheerder: false,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ingelogd: true,
      beheerder: gebruiker.beheerder,
      naam: gebruiker.naam,
      email: gebruiker.email,
    });
  } catch (fout) {
    console.error("Ingelogde gebruiker ophalen mislukt:", fout);

    return NextResponse.json(
      {
        ingelogd: false,
        beheerder: false,
      },
      { status: 500 },
    );
  }
}

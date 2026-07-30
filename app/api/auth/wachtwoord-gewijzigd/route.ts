import { NextResponse } from "next/server";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker || !gebruiker.actief) {
      return NextResponse.json(
        {
          succes: false,
          melding: "Je bent niet ingelogd of je account is niet actief.",
        },
        { status: 401 },
      );
    }

    await prisma.toegestaneGebruiker.update({
      where: {
        id: gebruiker.id,
      },
      data: {
        wachtwoordWijzigen: false,
      },
    });

    return NextResponse.json({
      succes: true,
      melding: "De wachtwoordwijziging werd geregistreerd.",
    });
  } catch (fout) {
    console.error("Wachtwoordstatus aanpassen mislukt:", fout);

    return NextResponse.json(
      {
        succes: false,
        melding: "De wachtwoordstatus kon niet worden aangepast.",
      },
      { status: 500 },
    );
  }
}

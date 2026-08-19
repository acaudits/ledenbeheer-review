import { NextResponse } from "next/server";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function bepaalNaam(gebruiker: {
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
  email: string;
}) {
  return (
    [gebruiker.voornaam, gebruiker.achternaam]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.naam?.trim() ||
    gebruiker.email.split("@")[0]
  );
}

function bepaalInitialen(naam: string) {
  const delen = naam
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (delen.length >= 2) {
    return `${delen[0][0]}${delen[delen.length - 1][0]}`
      .toLocaleUpperCase("nl-BE");
  }

  return naam
    .slice(0, 2)
    .toLocaleUpperCase("nl-BE");
}

export async function POST() {
  const gebruiker = await haalIngelogdeGebruikerOp();

  if (!gebruiker?.actief) {
    return NextResponse.json(
      { melding: "Niet ingelogd." },
      { status: 401 },
    );
  }

  await prisma.toegestaneGebruiker.update({
    where: { id: gebruiker.id },
    data: {
      laatsteActiviteitOp: new Date(),
      isIngelogd: true,
    },
  });

  return NextResponse.json({ bijgewerkt: true });
}

export async function DELETE() {
  const gebruiker = await haalIngelogdeGebruikerOp();

  if (!gebruiker) {
    return NextResponse.json(
      { melding: "Niet ingelogd." },
      { status: 401 },
    );
  }

  await prisma.toegestaneGebruiker.update({
    where: { id: gebruiker.id },
    data: {
      isIngelogd: false,
    },
  });

  return NextResponse.json({ uitgelogd: true });
}

export async function GET() {
  const beheerder = await haalIngelogdeGebruikerOp();

  if (
    !beheerder?.actief ||
    beheerder.rol !== "BEHEERDER"
  ) {
    return NextResponse.json(
      { melding: "Geen toegang." },
      { status: 403 },
    );
  }

  const gebruikers =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
      },
      select: {
        id: true,
        naam: true,
        voornaam: true,
        achternaam: true,
        email: true,
        laatsteActiviteitOp: true,
        isIngelogd: true,
      },
      orderBy: [
        { voornaam: "asc" },
        { achternaam: "asc" },
        { email: "asc" },
      ],
    });

  return NextResponse.json(
    {
      gebruikers: gebruikers.map((gebruiker) => {
        const naam = bepaalNaam(gebruiker);

        return {
          id: gebruiker.id,
          naam,
          initialen: bepaalInitialen(naam),
          laatsteActiviteitOp:
            gebruiker.laatsteActiviteitOp,
          isIngelogd: gebruiker.isIngelogd,
        };
      }),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

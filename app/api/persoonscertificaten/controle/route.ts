import { NextRequest, NextResponse } from "next/server";
import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gebruiker =
    await haalIngelogdeGebruikerOp();

  if (
    !gebruiker?.actief ||
    !heeftMachtiging(
      gebruiker.rollen,
      "CERTIFICATEN_BEHEREN",
    )
  ) {
    return NextResponse.json(
      {
        fout:
          "Je hebt geen toestemming om certificaten te beheren.",
      },
      {
        status: 403,
      },
    );
  }

  const veld = request.nextUrl.searchParams.get("veld");
  const waarde = request.nextUrl.searchParams
    .get("waarde")
    ?.trim()
    .toUpperCase();

  if (
    !waarde ||
    !["ovamId", "certificaatnummer"].includes(veld ?? "")
  ) {
    return NextResponse.json(
      {
        fout: "Ongeldige controle.",
      },
      {
        status: 400,
      },
    );
  }

  if (veld === "ovamId") {
    const bestaandLid = await prisma.lid.findUnique({
      where: {
        ovamId: waarde,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      bestaat: Boolean(bestaandLid),
    });
  }

  const bestaandLid = await prisma.lid.findUnique({
    where: {
      certificaatnummer: waarde,
    },
    select: {
      id: true,
    },
  });

  return NextResponse.json({
    bestaat: Boolean(bestaandLid),
  });
}

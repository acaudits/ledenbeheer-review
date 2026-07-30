import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

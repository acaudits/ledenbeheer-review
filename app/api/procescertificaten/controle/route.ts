import {
    NextRequest,
    NextResponse,
  } from "next/server";
  import {
    isGeldigOndernemingsnummer,
    normaliseerOndernemingsnummer,
  } from "@/lib/ondernemingsnummer";
  import { prisma } from "@/lib/prisma";
  
  export const dynamic = "force-dynamic";
  
  export async function GET(
    request: NextRequest,
  ) {
    const veld =
      request.nextUrl.searchParams.get(
        "veld",
      );
  
    const ruweWaarde =
      request.nextUrl.searchParams
        .get("waarde")
        ?.trim() ?? "";
  
    if (
      veld !== "kboNummer" &&
      veld !== "certificaatnummer"
    ) {
      return NextResponse.json(
        {
          fout: "Ongeldig veld.",
        },
        {
          status: 400,
        },
      );
    }
  
    if (!ruweWaarde) {
      return NextResponse.json({
        bestaat: false,
        geldig: false,
      });
    }
  
    if (veld === "kboNummer") {
      const kboNummer =
        normaliseerOndernemingsnummer(
          ruweWaarde,
        );
  
      if (
        !isGeldigOndernemingsnummer(
          kboNummer,
        )
      ) {
        return NextResponse.json({
          bestaat: false,
          geldig: false,
          genormaliseerdeWaarde:
            kboNummer,
        });
      }
  
      const bestaandCertificaat =
        await prisma.procescertificaat.findUnique(
          {
            where: {
              kboNummer,
            },
            select: {
              id: true,
            },
          },
        );
  
      return NextResponse.json({
        bestaat: Boolean(
          bestaandCertificaat,
        ),
        geldig: true,
        genormaliseerdeWaarde:
          kboNummer,
      });
    }
  
    const certificaatnummer =
      ruweWaarde.toUpperCase();
  
    const bestaandCertificaat =
      await prisma.procescertificaat.findUnique(
        {
          where: {
            certificaatnummer,
          },
          select: {
            id: true,
          },
        },
      );
  
    return NextResponse.json({
      bestaat: Boolean(
        bestaandCertificaat,
      ),
      geldig: true,
      genormaliseerdeWaarde:
        certificaatnummer,
    });
  }
  
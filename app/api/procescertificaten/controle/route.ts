import {
    NextRequest,
    NextResponse,
  } from "next/server";
  import {
    isGeldigOndernemingsnummer,
    normaliseerOndernemingsnummer,
  } from "@/lib/ondernemingsnummer";
  import { heeftMachtiging } from "@/lib/autorisatie";
  import { haalIngelogdeGebruikerOp } from "@/lib/auth";
  import { prisma } from "@/lib/prisma";
  
  export const dynamic = "force-dynamic";
  
  export async function GET(
    request: NextRequest,
  ) {

    const gebruiker =
      await haalIngelogdeGebruikerOp();

    if (
      !gebruiker?.actief ||
      !heeftMachtiging(
        gebruiker.rol,
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
  
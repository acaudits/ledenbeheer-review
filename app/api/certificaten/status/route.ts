import { NextResponse } from "next/server";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { prisma } from "@/lib/prisma";

type Verzoek = {
  id?: unknown;
  soort?: unknown;
  actie?: unknown;
};

export async function POST(request: Request) {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (
      !gebruiker?.actief ||
      !heeftMachtiging(
        gebruiker.rol,
        "CERTIFICATEN_BEHEREN",
      )
    ) {
      return NextResponse.json(
        {
          message: "Je hebt geen toestemming om certificaten te wijzigen.",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request.json()) as Verzoek;

    const id = Number(body.id);
    const soort = body.soort;
    const actie = body.actie;

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          message: "Ongeldig recordnummer.",
        },
        {
          status: 400,
        },
      );
    }

    if (soort !== "persoon" && soort !== "proces") {
      return NextResponse.json(
        {
          message: "Ongeldig certificaattype.",
        },
        {
          status: 400,
        },
      );
    }

    if (actie !== "verwijder" && actie !== "herstel") {
      return NextResponse.json(
        {
          message: "Ongeldige actie.",
        },
        {
          status: 400,
        },
      );
    }

    const verwijderdOp =
      actie === "verwijder" ? new Date() : null;

    if (soort === "persoon") {
      const resultaat = await prisma.lid.updateMany({
        where: {
          id,
          verwijderdOp:
            actie === "verwijder"
              ? null
              : {
                  not: null,
                },
        },
        data: {
          verwijderdOp,
        },
      });

      if (resultaat.count === 0) {
        return NextResponse.json(
          {
            message:
              "Het persoonscertificaat werd niet gevonden of is al verwerkt.",
          },
          {
            status: 404,
          },
        );
      }
    }

    if (soort === "proces") {
      const resultaat =
        await prisma.procescertificaat.updateMany({
          where: {
            id,
            verwijderdOp:
              actie === "verwijder"
                ? null
                : {
                    not: null,
                  },
          },
          data: {
            verwijderdOp,
          },
        });

      if (resultaat.count === 0) {
        return NextResponse.json(
          {
            message:
              "Het procescertificaat werd niet gevonden of is al verwerkt.",
          },
          {
            status: 404,
          },
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Certificaatstatus aanpassen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "De actie kon niet worden uitgevoerd. Probeer opnieuw.",
      },
      {
        status: 500,
      },
    );
  }
}

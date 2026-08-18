import {
  revalidatePath,
} from "next/cache";
import {
  NextResponse,
} from "next/server";

import {
  schrijfAuditlog,
} from "@/lib/auditlog";
import {
  analyseerOpvolgingMail,
} from "@/lib/opvolging-mail";
import {
  vereisOpvolgingSanctieBeheer,
} from "@/lib/opvolging-sanctie-toegang";
import {
  prisma,
} from "@/lib/prisma";

export const runtime = "nodejs";

function positiefId(
  waarde: string,
) {
  const id =
    Number(waarde);

  return Number.isInteger(id) &&
    id > 0
    ? id
    : null;
}

function isUniekeFout(
  fout: unknown,
) {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

export async function POST(
  verzoek: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const {
    id: idTekst,
  } = await context.params;

  const id =
    positiefId(idTekst);

  if (!id) {
    return NextResponse.json(
      {
        melding:
          "Ongeldige registratie.",
      },
      {
        status: 400,
      },
    );
  }

  const registratie =
    await prisma.opvolgingSanctie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
      select: {
        id: true,
        bronType: true,
      },
    });

  if (!registratie) {
    return NextResponse.json(
      {
        melding:
          "De opvolging/sanctie werd niet gevonden.",
      },
      {
        status: 404,
      },
    );
  }

  const gebruiker =
    await vereisOpvolgingSanctieBeheer(
      registratie.bronType,
    );

  const formData =
    await verzoek.formData();

  const bestand =
    formData.get("bestand");

  if (!(bestand instanceof File)) {
    return NextResponse.json(
      {
        melding:
          "Selecteer een EML-bestand.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const origineel =
      new Uint8Array(
        await bestand.arrayBuffer(),
      );

    const mail =
      await analyseerOpvolgingMail({
        bestandsnaam:
          bestand.name,
        mimeType:
          bestand.type,
        bestandsgrootte: origineel.byteLength,
        bytes: async () => origineel,
      });

    const gemaakt =
      await prisma.$transaction(
        async (database) => {
          const resultaat =
            await database.opvolgingSanctieMail.create({
              data: {
                opvolgingSanctieId:
                  id,
                bestandsnaam:
                  mail.bestandsnaam,
                bestandstype:
                  mail.bestandstype,
                mimeType:
                  mail.mimeType,
                bestandsgrootte:
                  mail.bestandsgrootte,
                sha256:
                  mail.sha256,
                afzenderNaam:
                  mail.afzenderNaam,
                afzenderEmail:
                  mail.afzenderEmail,
                ontvangers:
                  mail.ontvangers,
                cc: mail.cc,
                onderwerp:
                  mail.onderwerp,
                berichtId:
                  mail.berichtId,
                verzondenOp:
                  mail.verzondenOp,
                tekstInhoud:
                  mail.tekstInhoud,
                bijlagen:
                  mail.bijlagen,
                internVerzonden:
                  mail.internVerzonden,
aangemaaktDoorId:
                  gebruiker.id,
              },
              select: {
                id: true,
              },
            });

          await schrijfAuditlog(
            database,
            gebruiker,
            {
              actie:
                "OPVOLGING_SANCTIE_MAIL_GEUPLOAD",
              entiteit:
                "OpvolgingSanctieMail",
              entiteitId:
                resultaat.id,
              omschrijving:
                "Mailbestand aan opvolging/sanctie toegevoegd.",
              metadata: {
                opvolgingSanctieId:
                  id,
                bestandsnaam:
                  mail.bestandsnaam,
                bestandstype:
                  mail.bestandstype,
                bestandsgrootte:
                  mail.bestandsgrootte,
                sha256:
                  mail.sha256,
                afzenderEmail:
                  mail.afzenderEmail,
                verzondenOp:
                  mail.verzondenOp.toISOString(),
              },
            },
          );

          return resultaat;
        },
      );

    revalidatePath(
      `/opvolging-sancties/${id}`,
    );

    return NextResponse.json(
      {
        id: gemaakt.id,
        melding:
          "De mail werd geanalyseerd en toegevoegd.",
      },
      {
        status: 201,
      },
    );
  } catch (fout) {
    if (isUniekeFout(fout)) {
      return NextResponse.json(
        {
          melding:
            "Dit mailbestand werd al aan deze opvolging toegevoegd.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        melding:
          fout instanceof Error
            ? fout.message
            : "Het mailbestand kon niet worden verwerkt.",
      },
      {
        status: 400,
      },
    );
  }
}

import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAXIMAAL_AANTAL_ATTEST_IDS =
  500;

function toegestaneOrigin() {
  const origin =
    process.env
      .WEBEXTENSIE_TOEGESTANE_ORIGIN
      ?.trim() ?? "";

  if (
    !/^chrome-extension:\/\/[a-p]{32}$/.test(
      origin,
    )
  ) {
    return "";
  }

  return origin;
}

function aanvraagHeeftToegestaneOrigin(
  request: Request,
) {
  const verwacht =
    toegestaneOrigin();

  const ontvangen =
    request.headers.get(
      "origin",
    ) ?? "";

  return (
    verwacht.length > 0 &&
    ontvangen === verwacht
  );
}

function responseHeaders(
  request: Request,
) {
  const headers: Record<
    string,
    string
  > = {
    "Cache-Control":
      "no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Origin",
    "X-Content-Type-Options":
      "nosniff",
    "Referrer-Policy":
      "no-referrer",
  };

  if (
    aanvraagHeeftToegestaneOrigin(
      request,
    )
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] =
      request.headers.get(
        "origin",
      )!;

    headers[
      "Access-Control-Allow-Credentials"
    ] = "true";
  }

  return headers;
}

function antwoord(
  request: Request,
  gegevens: unknown,
  status: number,
) {
  return Response.json(
    gegevens,
    {
      status,
      headers:
        responseHeaders(request),
    },
  );
}

export async function GET(
  request: Request,
) {
  /*
   * Alleen de exact geconfigureerde extensie-installatie
   * krijgt toegang. Er wordt geen algemene
   * chrome-extension://-origin toegestaan.
   */
  if (
    !aanvraagHeeftToegestaneOrigin(
      request,
    )
  ) {
    return antwoord(
      request,
      {
        fout:
          "Deze aanvraag is niet toegestaan.",
      },
      403,
    );
  }

  /*
   * Gebruik uitsluitend de bestaande CRM-sessie. Er worden
   * geen Supabase-sleutels of statische API-tokens vanuit de
   * extensie meegestuurd.
   */
  const gebruiker =
    await haalIngelogdeGebruikerOp();

  if (!gebruiker?.actief) {
    return antwoord(
      request,
      {
        fout:
          "Je moet actief ingelogd zijn in Asbest CRM.",
      },
      401,
    );
  }

  if (
    !heeftMachtiging(
      gebruiker.rollen,
      "DESKCONTROLES_STATUS_IMPORTEREN",
    )
  ) {
    return antwoord(
      request,
      {
        fout:
          "Je hebt geen machtiging om deskcontroles op te halen.",
      },
      403,
    );
  }

  try {
    const deskcontroles =
      await prisma.deskcontrole
        .findMany({
          where: {
            verwijderdOp: null,
            attestId: {
              not: null,
            },
            status: {
              in: [
                "GEEN",
                "IN_OPMAAK",
              ],
            },
          },
          select: {
            attestId: true,
          },
          orderBy: [
            {
              datumControle:
                "desc",
            },
            {
              id: "desc",
            },
          ],
          take:
            MAXIMAAL_AANTAL_ATTEST_IDS +
            1,
        });

    const afgekapt =
      deskcontroles.length >
      MAXIMAAL_AANTAL_ATTEST_IDS;

    const attestIds =
      deskcontroles
        .slice(
          0,
          MAXIMAAL_AANTAL_ATTEST_IDS,
        )
        .map(
          (deskcontrole) =>
            deskcontrole.attestId,
        )
        .filter(
          (
            attestId,
          ): attestId is string =>
            typeof attestId ===
              "string" &&
            attestId.length > 0,
        );

    return antwoord(
      request,
      {
        attestIds,
        aantal:
          attestIds.length,
        afgekapt,
        statussen: [
          "GEEN",
          "IN_OPMAAK",
        ],
      },
      200,
    );
  } catch (fout) {
    /*
     * Geen attest-ID's, tokens, database-inhoud of payloads
     * naar de serverlogs schrijven.
     */
    console.error(
      "Openstaande attest-ID's ophalen mislukt:",
      fout instanceof Error
        ? fout.name
        : "Onbekende databasefout",
    );

    return antwoord(
      request,
      {
        fout:
          "De openstaande attest-ID's konden niet worden opgehaald.",
      },
      500,
    );
  }
}

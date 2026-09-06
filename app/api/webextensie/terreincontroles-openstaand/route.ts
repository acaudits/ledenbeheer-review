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

function aanvraagKomtVanToegestaneExtensie(
  request: Request,
) {
  const verwachtOrigin =
    toegestaneOrigin();

  if (!verwachtOrigin) {
    return false;
  }

  const ontvangenOrigin =
    request.headers.get(
      "origin",
    ) ?? "";

  /*
   * Gebruik de standaard Origin wanneer Chrome die meestuurt.
   */
  if (ontvangenOrigin) {
    return (
      ontvangenOrigin ===
      verwachtOrigin
    );
  }

  /*
   * Bevoorrechte extension-fetches met host permission kunnen
   * zonder Origin worden verstuurd. Controleer in dat geval de
   * expliciete extensie-ID en browsergestuurde Fetch Metadata.
   */
  const verwachtId =
    verwachtOrigin.replace(
      "chrome-extension://",
      "",
    );

  const ontvangenId =
    request.headers.get(
      "x-webextensie-id",
    ) ?? "";

  return (
    ontvangenId === verwachtId &&
    request.headers.get(
      "sec-fetch-site",
    ) === "none" &&
    request.headers.get(
      "sec-fetch-mode",
    ) === "cors" &&
    request.headers.get(
      "sec-fetch-dest",
    ) === "empty"
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

  const origin =
    request.headers.get(
      "origin",
    );

  /*
   * Voeg alleen CORS-headers toe als daadwerkelijk een Origin
   * aanwezig is en deze exact overeenkomt. Een bevoorrechte
   * extension-fetch zonder Origin heeft deze headers niet nodig.
   */
  if (
    origin &&
    origin ===
      toegestaneOrigin()
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;

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
    !aanvraagKomtVanToegestaneExtensie(
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
      "TERREINCONTROLES_STATUS_IMPORTEREN",
    )
  ) {
    return antwoord(
      request,
      {
        fout:
          "Je hebt geen machtiging om terreincontroles op te halen.",
      },
      403,
    );
  }

  try {
    const terreincontroles =
      await prisma.terreincontrole
        .findMany({
          where: {
            verwijderdOp: null,
            afgerond: false,
            OR: [
              {
                status:
                  "IN_OPMAAK",
              },
              {
                status: null,
              },
            ],
          },
          select: {
            attestId: true,
          },
          orderBy: [
            {
              bijgewerktOp:
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
      terreincontroles.length >
      MAXIMAAL_AANTAL_ATTEST_IDS;

    const attestIds =
      terreincontroles
        .slice(
          0,
          MAXIMAAL_AANTAL_ATTEST_IDS,
        )
        .map(
          (terreincontrole) =>
            terreincontrole.attestId,
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
          "IN_OPMAAK",
          null,
        ],
        apiVersie: 2,
      },
      200,
    );
  } catch (fout) {
    /*
     * Geen attest-ID's, tokens, database-inhoud of payloads
     * naar de serverlogs schrijven.
     */
    console.error(
      "Openstaande terreincontrole-attest-ID's ophalen mislukt:",
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

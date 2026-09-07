import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { schrijfAuditlog } from "@/lib/auditlog";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAXIMAAL_AANTAL_RESULTATEN = 500;
const MAXIMALE_AANVRAAGGROOTTE = 128 * 1024;

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Doelstatus =
  | "GEEN"
  | "IN_OPMAAK"
  | "GEACTUALISEERD";

const STATUSMAPPING: Readonly<
  Record<string, Doelstatus>
> = {
  OK_GEA: "GEACTUALISEERD",
  OK_INOP: "IN_OPMAAK",
  GEEN: "GEEN",
};

function isObject(
  waarde: unknown,
): waarde is Record<string, unknown> {
  return (
    typeof waarde === "object" &&
    waarde !== null &&
    !Array.isArray(waarde)
  );
}

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

export async function POST(
  request: Request,
) {
  /*
   * Origincontrole is verplicht en gebeurt vóór het lezen van
   * de aanvraag of uitvoeren van databasebewerkingen.
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

  const contentType =
    request.headers.get(
      "content-type",
    )?.toLowerCase() ?? "";

  if (
    !contentType.startsWith(
      "text/plain",
    )
  ) {
    return antwoord(
      request,
      {
        fout:
          "Ongeldig inhoudstype.",
      },
      415,
    );
  }

  const opgegevenGrootte =
    Number(
      request.headers.get(
        "content-length",
      ) ?? "0",
    );

  if (
    Number.isFinite(
      opgegevenGrootte,
    ) &&
    opgegevenGrootte >
      MAXIMALE_AANVRAAGGROOTTE
  ) {
    return antwoord(
      request,
      {
        fout:
          "De aanvraag is te groot.",
      },
      413,
    );
  }

  /*
   * Geen statische extensietoken: uitsluitend de bestaande,
   * door de server gevalideerde Supabase-sessie.
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
          "Je hebt geen machtiging om deskcontrolestatussen te wijzigen.",
      },
      403,
    );
  }

  let tekst: string;

  try {
    tekst = await request.text();
  } catch {
    return antwoord(
      request,
      {
        fout:
          "De aanvraag kon niet worden gelezen.",
      },
      400,
    );
  }

  if (
    Buffer.byteLength(
      tekst,
      "utf8",
    ) >
    MAXIMALE_AANVRAAGGROOTTE
  ) {
    return antwoord(
      request,
      {
        fout:
          "De aanvraag is te groot.",
      },
      413,
    );
  }

  let invoer: unknown;

  try {
    invoer = JSON.parse(tekst);
  } catch {
    return antwoord(
      request,
      {
        fout:
          "De aanvraag bevat geen geldige JSON.",
      },
      400,
    );
  }

  if (
    !isObject(invoer) ||
    !Array.isArray(
      invoer.resultaten,
    )
  ) {
    return antwoord(
      request,
      {
        fout:
          "Ongeldige aanvraagstructuur.",
      },
      400,
    );
  }

  /*
   * Bewaar de server-side gevalideerde array in een vaste
   * variabele. Zo blijft de TypeScript-typevernauwing ook
   * geldig binnen de latere auditlogtransactie.
   */
  const ontvangenResultaten =
    invoer.resultaten;

  if (
    ontvangenResultaten.length >
    MAXIMAAL_AANTAL_RESULTATEN
  ) {
    return antwoord(
      request,
      {
        fout:
          "Er kunnen maximaal 500 resultaten tegelijk worden opgeslagen.",
      },
      413,
    );
  }

  const geldigeResultaten =
    new Map<
      string,
      Doelstatus
    >();

  let overgeslagenFout = 0;
  let ongeldig = 0;

  for (
    const resultaat of
    ontvangenResultaten
  ) {
    if (
      !isObject(resultaat) ||
      typeof resultaat.status !==
        "string"
    ) {
      overgeslagenFout += 1;
      continue;
    }

    const doelstatus =
      STATUSMAPPING[
        resultaat.status
      ];

    /*
     * ERROR en alle onbekende statussen worden server-side
     * overgeslagen, ook als een aangepaste client ze verstuurt.
     */
    if (!doelstatus) {
      overgeslagenFout += 1;
      continue;
    }

    if (
      typeof resultaat.attestId !==
        "string"
    ) {
      ongeldig += 1;
      continue;
    }

    const attestId =
      resultaat.attestId
        .trim()
        .toLowerCase();

    if (
      !UUID_PATROON.test(
        attestId,
      )
    ) {
      ongeldig += 1;
      continue;
    }

    geldigeResultaten.set(
      attestId,
      doelstatus,
    );
  }

  let bijgewerkt = 0;
  let ongewijzigd = 0;
  let nietGevonden = 0;
  let conflict = 0;
  let beschermd = 0;
  let mislukt = 0;

  /*
   * Sequentiële, korte transacties voorkomen een grote
   * langdurige transactie en maken de statuscontrole per rij
   * atomair.
   */
  for (
    const [
      attestId,
      doelstatus,
    ] of geldigeResultaten
  ) {
    try {
      const deskcontrole =
        await prisma.deskcontrole
          .findUnique({
            where: {
              attestId,
            },
            select: {
              id: true,
              status: true,
              verwijderdOp: true,
            },
          });

      if (!deskcontrole) {
        nietGevonden += 1;
        continue;
      }

      /*
       * Verwijderde en afgeronde controles zijn altijd
       * beschermd tegen wijzigingen vanuit de extensie.
       */
      if (
        deskcontrole.verwijderdOp ||
        deskcontrole.status ===
          "AFGEROND"
      ) {
        beschermd += 1;
        continue;
      }

      if (
        deskcontrole.status ===
        doelstatus
      ) {
        ongewijzigd += 1;
        continue;
      }

      /*
       * Alleen openstaande statussen mogen worden gewijzigd.
       * GEACTUALISEERD wordt dus evenmin overschreven.
       */
      if (
        deskcontrole.status !==
          "GEEN" &&
        deskcontrole.status !==
          "IN_OPMAAK"
      ) {
        conflict += 1;
        continue;
      }

      const resultaat =
        await prisma.$transaction(
          async (tx) => {
            const update =
              await tx.deskcontrole
                .updateMany({
                  where: {
                    id:
                      deskcontrole.id,
                    verwijderdOp:
                      null,
                    /*
                     * Optimistische locking: wijzig alleen als
                     * niemand de status intussen heeft aangepast.
                     */
                    status:
                      deskcontrole.status,
                  },
                  data: {
                    status:
                      doelstatus,
                  },
                });

            if (
              update.count !== 1
            ) {
              return false;
            }

            await schrijfAuditlog(
              tx,
              gebruiker,
              {
                actie:
                  "DESKCONTROLE_STATUS_WEBEXTENSIE",
                entiteit:
                  "DESKCONTROLE",
                entiteitId:
                  deskcontrole.id,
                omschrijving:
                  "Deskcontrolestatus bijgewerkt vanuit het beveiligde deskcontroleoverzicht.",
                oudeWaarde: {
                  status:
                    deskcontrole.status,
                },
                nieuweWaarde: {
                  status:
                    doelstatus,
                },
                metadata: {
                  bron:
                    "WEBEXTENSIE_DESKCONTROLEOVERZICHT",
                },
              },
            );

            return true;
          },
        );

      if (resultaat) {
        bijgewerkt += 1;
      } else {
        conflict += 1;
      }
    } catch (fout) {
      /*
       * Geen attest-ID, payload, token of databasegegevens
       * naar logs schrijven.
       */
      console.error(
        "Een deskcontrolestatus kon niet worden opgeslagen:",
        fout instanceof Error
          ? fout.name
          : "Onbekende databasefout",
      );

      mislukt += 1;
    }
  }

  /*
   * Registreer iedere volledig verwerkte synchronisatie,
   * ook wanneer alle statussen al correct waren.
   *
   * Alleen totaalaantallen worden opgeslagen. Er komen geen
   * attest-ID's, payloads of OVAM-resultaten in de auditlog.
   */
  try {
    await prisma.$transaction(
      async (transactie) => {
        await schrijfAuditlog(
          transactie,
          gebruiker,
          {
            actie: "DESKCONTROLES_STATUSSYNCHRONISATIE_WEBEXTENSIE",
            entiteit: "DESKCONTROLE",
            omschrijving:
              "Deskcontrolestatussen via de webextensie gecontroleerd.",
            metadata: {
              aangeboden:
                ontvangenResultaten.length,
              verwerkt:
                geldigeResultaten.size,
              bijgewerkt,
              ongewijzigd,
              overgeslagenFout,
              ongeldig,
              nietGevonden,
              conflict,
              beschermd,
              mislukt,
            },
          },
        );
      },
    );
  } catch (fout) {
    /*
     * Geen attest-ID's, payloads of databasegegevens loggen.
     * De reeds verwerkte statussen blijven geldig.
     */
    console.error(
      "Tijdstip van webextensie-synchronisatie registreren mislukt:",
      fout instanceof Error
        ? fout.name
        : "Onbekende auditlogfout",
    );
  }

  return antwoord(
    request,
    {
      succes:
        mislukt === 0,
      aangeboden:
        ontvangenResultaten.length,
      verwerkt:
        geldigeResultaten.size,
      bijgewerkt,
      ongewijzigd,
      overgeslagenFout,
      ongeldig,
      nietGevonden,
      conflict,
      beschermd,
      mislukt,
    },
    200,
  );
}

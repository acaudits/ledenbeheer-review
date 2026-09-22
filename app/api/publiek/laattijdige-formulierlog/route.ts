import {
  NextResponse,
} from "next/server";
import {
  headers,
} from "next/headers";

import {
  prisma,
} from "@/lib/prisma";
import {
  controleerPubliekeRateLimit,
} from "@/lib/publieke-rate-limit";

export const dynamic =
  "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUSSEN = [
  "START",
  "HEARTBEAT",
  "OVAM_LINK",
  "ONVOLLEDIG",
  "RESULTAAT",
] as const;

const STAPPEN = [
  "PERSOONSGEGEVENS",
  "ADRES",
  "PLANNING",
  "BEVESTIGING",
  "VERZENDEN",
  "VOLTOOID",
] as const;

const APPARATEN = [
  "MOBIEL",
  "TABLET",
  "DESKTOP",
  "ONBEKEND",
] as const;

function tekst(
  waarde: unknown,
  maximum: number,
) {
  return typeof waarde ===
    "string"
    ? waarde
        .trim()
        .slice(0, maximum)
    : "";
}

function tekstOfNull(
  waarde: unknown,
  maximum: number,
) {
  return (
    tekst(
      waarde,
      maximum,
    ) || null
  );
}

function isEenVan<
  T extends readonly string[],
>(
  waarde: unknown,
  waarden: T,
): waarde is T[number] {
  return (
    typeof waarde ===
      "string" &&
    waarden.includes(
      waarde as T[number],
    )
  );
}

function veiligeMomentopname(
  waarde: unknown,
) {
  if (
    typeof waarde !==
      "object" ||
    waarde === null
  ) {
    return null;
  }

  const bron =
    waarde as Record<
      string,
      unknown
    >;

  const bezoeken =
    Array.isArray(
      bron.bezoeken,
    )
      ? bron.bezoeken
          .slice(0, 20)
          .map((item) => {
            const bezoek =
              typeof item ===
                "object" &&
              item !== null
                ? item as Record<
                    string,
                    unknown
                  >
                : {};

            return {
              gemeente:
                tekst(
                  bezoek.gemeente,
                  255,
                ),
              straat:
                tekst(
                  bezoek.straat,
                  255,
                ),
              huisnummer:
                tekst(
                  bezoek.huisnummer,
                  50,
                ),
              busnummer:
                tekst(
                  bezoek.busnummer,
                  50,
                ),
              extraAdresdetails:
                tekst(
                  bezoek.extraAdresdetails,
                  2000,
                ),
              gemeenschappelijkeDelen:
                bezoek.gemeenschappelijkeDelen ===
                true,
              datum:
                tekst(
                  bezoek.datum,
                  10,
                ),
              tijdstip:
                tekst(
                  bezoek.tijdstip,
                  5,
                ),
              reden:
                tekst(
                  bezoek.reden,
                  2000,
                ),
            };
          })
      : [];

  return {
    naamAdi:
      tekst(
        bron.naamAdi,
        255,
      ),
    persoonsId:
      tekst(
        bron.persoonsId,
        255,
      ),
    privacyKennisname:
      bron.privacyKennisname ===
      true,
    aantalPlaatsbezoeken:
      Math.min(
        20,
        Math.max(
          0,
          Number(
            bron.aantalPlaatsbezoeken,
          ) || bezoeken.length,
        ),
      ),
    bezoeken,
  };
}

function bepaalFoutcode(
  melding: string,
) {
  const tekstwaarde =
    melding.toLocaleLowerCase(
      "nl-BE",
    );

  if (
    tekstwaarde.includes(
      "te veel meldingen",
    )
  ) {
    return "RATE_LIMIT";
  }

  if (
    tekstwaarde.includes(
      "privacyverklaring",
    )
  ) {
    return "PRIVACY_NIET_BEVESTIGD";
  }

  if (
    tekstwaarde.includes(
      "persoonsid",
    ) ||
    tekstwaarde.includes(
      "ingevoerde gegevens konden niet",
    )
  ) {
    return "PERSOON_NIET_GEVONDEN";
  }

  if (
    tekstwaarde.includes(
      "adres",
    ) ||
    tekstwaarde.includes(
      "gemeente",
    )
  ) {
    return "ONGELDIG_ADRES";
  }

  if (
    tekstwaarde.includes(
      "datum",
    ) ||
    tekstwaarde.includes(
      "tijdstip",
    )
  ) {
    return "ONGELDIGE_PLANNING";
  }

  if (
    tekstwaarde.includes(
      "reden",
    )
  ) {
    return "ONGELDIGE_REDEN";
  }

  return "VALIDATIE_MISLUKT";
}

async function clientSleutel() {
  const requestHeaders =
    await headers();

  return (
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    requestHeaders.get(
      "x-real-ip",
    ) ||
    "onbekend"
  );
}

function geenCache(
  inhoud: unknown,
  status = 200,
) {
  return NextResponse.json(
    inhoud,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const requestUrl =
      new URL(request.url);

    const origin =
      request.headers.get(
        "origin",
      );

    const fetchSite =
      request.headers.get(
        "sec-fetch-site",
      );

    if (
      (
        origin &&
        new URL(origin).host !==
          requestUrl.host
      ) ||
      (
        fetchSite &&
        fetchSite !==
          "same-origin"
      )
    ) {
      return geenCache(
        {
          fout:
            "Ongeldige herkomst.",
        },
        403,
      );
    }

    const sleutel =
      await clientSleutel();

    const toegelaten =
      await controleerPubliekeRateLimit({
        sleutel:
          `formulierlog:${sleutel}`,
        maximum: 1000,
        vensterMs:
          60 * 60_000,
      });

    if (!toegelaten) {
      return geenCache(
        {
          fout:
            "Te veel verzoeken.",
        },
        429,
      );
    }

    const ruweTekst =
      await request.text();

    if (
      ruweTekst.length >
      100_000
    ) {
      return geenCache(
        {
          fout:
            "De aanvraag is te groot.",
        },
        413,
      );
    }

    let invoer: Record<
      string,
      unknown
    >;

    try {
      invoer =
        JSON.parse(
          ruweTekst,
        ) as Record<
          string,
          unknown
        >;
    } catch {
      return geenCache(
        {
          fout:
            "Ongeldige aanvraag.",
        },
        400,
      );
    }

    const type =
      invoer.type;

    const sessieToken =
      tekst(
        invoer.sessieToken,
        36,
      );

    if (
      !isEenVan(
        type,
        STATUSSEN,
      ) ||
      !UUID.test(
        sessieToken,
      )
    ) {
      return geenCache(
        {
          fout:
            "Ongeldige aanvraag.",
        },
        400,
      );
    }

    const stap =
      isEenVan(
        invoer.stap,
        STAPPEN,
      )
        ? invoer.stap
        : "PERSOONSGEGEVENS";

    const apparaat =
      isEenVan(
        invoer.apparaat,
        APPARATEN,
      )
        ? invoer.apparaat
        : "ONBEKEND";

    const momentopname =
      veiligeMomentopname(
        invoer.momentopname,
      );

    const nu = new Date();

    const bestaande =
      await prisma
        .laattijdigeFormulierSessie
        .findUnique({
          where: {
            sessieToken,
          },
          select: {
            id: true,
            status: true,
          },
        });

    if (!bestaande) {
      await prisma
        .laattijdigeFormulierSessie
        .create({
          data: {
            sessieToken,
            status:
              type === "ONVOLLEDIG"
                ? "ONVOLLEDIG"
                : "GESTART",
            stap,
            apparaat,
            laatsteActiviteitOp:
              nu,
            momentopname:
              momentopname ??
              undefined,
          },
        });
    }

    if (type === "START") {
      await prisma
        .laattijdigeFormulierSessie
        .updateMany({
          where: {
            sessieToken,
            status: {
              not: "GESLAAGD",
            },
          },
          data: {
            status: "GESTART",
            stap,
            apparaat,
            laatsteActiviteitOp:
              nu,
            momentopname:
              momentopname ??
              undefined,
          },
        });
    }

    if (
      type === "HEARTBEAT"
    ) {
      const duurDelta =
        Math.min(
          30,
          Math.max(
            0,
            Math.round(
              Number(
                invoer.duurDelta,
              ) || 0,
            ),
          ),
        );

      await prisma
        .laattijdigeFormulierSessie
        .updateMany({
          where: {
            sessieToken,
            status: {
              in: [
                "GESTART",
                "BEZIG",
                "ONVOLLEDIG",
              ],
            },
          },
          data: {
            status: "BEZIG",
            stap,
            laatsteActiviteitOp:
              nu,
            actieveDuurSeconden: {
              increment:
                duurDelta,
            },
            momentopname:
              momentopname ??
              undefined,
          },
        });
    }

    if (
      type === "OVAM_LINK"
    ) {
      await prisma
        .laattijdigeFormulierSessie
        .update({
          where: {
            sessieToken,
          },
          data: {
            stap,
            laatsteActiviteitOp:
              nu,
            ovamLinkGeklikt:
              true,
            ovamLinkKlikken: {
              increment: 1,
            },
            ovamLinkLaatstOp:
              nu,
            momentopname:
              momentopname ??
              undefined,
          },
        });
    }

    if (
      type === "ONVOLLEDIG"
    ) {
      await prisma
        .laattijdigeFormulierSessie
        .updateMany({
          where: {
            sessieToken,
            status: {
              in: [
                "GESTART",
                "BEZIG",
              ],
            },
          },
          data: {
            status:
              "ONVOLLEDIG",
            stap,
            laatsteActiviteitOp:
              nu,
            momentopname:
              momentopname ??
              undefined,
          },
        });
    }

    if (
      type === "RESULTAAT"
    ) {
      const geslaagd =
        invoer.geslaagd ===
        true;

      const foutmelding =
        tekst(
          invoer.foutmelding,
          1000,
        );

      const referentie =
        tekst(
          invoer.referentie,
          35,
        );

      const melding =
        geslaagd &&
        referentie
          ? await prisma
              .laattijdigePlaatsbezoekMelding
              .findUnique({
                where: {
                  referentie,
                },
                select: {
                  id: true,
                  inzendingToken:
                    true,
                },
              })
          : null;

      await prisma
        .laattijdigeFormulierSessie
        .update({
          where: {
            sessieToken,
          },
          data: {
            status:
              geslaagd
                ? "GESLAAGD"
                : "MISLUKT",
            stap:
              geslaagd
                ? "VOLTOOID"
                : stap,
            laatsteActiviteitOp:
              nu,
            foutcode:
              geslaagd
                ? null
                : bepaalFoutcode(
                    foutmelding,
                  ),
            foutmelding:
              geslaagd
                ? null
                : tekstOfNull(
                    foutmelding,
                    1000,
                  ),
            validatiePogingen: {
              increment: 1,
            },
            momentopname:
              momentopname ??
              undefined,
            meldingId:
              melding?.id ??
              undefined,
            inzendingToken:
              melding
                ?.inzendingToken ??
              undefined,
          },
        });
    }

    return geenCache({
      ok: true,
    });
  } catch (fout) {
    console.error(
      "Publieke formulierlogging mislukt:",
      fout instanceof Error
        ? fout.message
        : "Onbekende fout",
    );

    /*
     * Geen technische details aan
     * publieke gebruikers tonen.
     */
    return geenCache(
      {
        fout:
          "Logging kon niet worden verwerkt.",
      },
      500,
    );
  }
}

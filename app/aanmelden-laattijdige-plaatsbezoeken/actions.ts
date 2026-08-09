"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

import {
  valideerAdres,
  type GeopuntLocatie,
} from "@/lib/geopunt";
import { prisma } from "@/lib/prisma";
import {
  controleerPubliekeRateLimit,
} from "@/lib/publieke-rate-limit";
import {
  verwerkPushVoorNieuweLaattijdigeMelding,
} from "@/lib/push-meldingen";

export type LaattijdigeMeldingState = {
  fout?: string;
  geslaagd?: boolean;
  referentie?: string;
  aantal?: number;
};

function maakPubliekeReferentie() {
  return randomUUID()
    .replaceAll("-", "")
    .slice(0, 12)
    .toUpperCase();
}

type BezoekInvoer = {
  gemeente?: unknown;
  straat?: unknown;
  huisnummer?: unknown;
  busnummer?: unknown;
  extraAdresdetails?: unknown;
  gemeenschappelijkeDelen?: unknown;
  datum?: unknown;
  tijdstip?: unknown;
  reden?: unknown;
};

function normaliseerTekst(
  waarde: FormDataEntryValue | null,
) {
  return typeof waarde === "string"
    ? waarde.trim().replace(/\s+/g, " ")
    : "";
}

async function haalClientSleutelOp() {
  const requestHeaders = await headers();

  return (
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "onbekend"
  );
}


function belgischeDatumTijdNaarUtc(
  datum: string,
  tijd: string,
) {
  const [jaar, maand, dag] =
    datum.split("-").map(Number);

  const [uur, minuut] =
    tijd.split(":").map(Number);

  const gewenst = Date.UTC(
    jaar,
    maand - 1,
    dag,
    uur,
    minuut,
  );

  let kandidaat = gewenst;

  for (
    let poging = 0;
    poging < 3;
    poging += 1
  ) {
    const onderdelen =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Europe/Brussels",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        },
      ).formatToParts(
        new Date(kandidaat),
      );

    const waarde = (type: string) =>
      Number(
        onderdelen.find(
          (onderdeel) =>
            onderdeel.type === type,
        )?.value ?? "0",
      );

    const lokaalAlsUtc = Date.UTC(
      waarde("year"),
      waarde("month") - 1,
      waarde("day"),
      waarde("hour"),
      waarde("minute"),
    );

    kandidaat -=
      lokaalAlsUtc - gewenst;
  }

  return new Date(kandidaat);
}

function belgischeDatumEnTijd() {
  const onderdelen =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Brussels",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(new Date());

  const waarde = (type: string) =>
    onderdelen.find(
      (onderdeel) =>
        onderdeel.type === type,
    )?.value ?? "";

  return {
    datum: `${waarde("year")}-${waarde("month")}-${waarde("day")}`,
    tijd: `${waarde("hour")}:${waarde("minute")}`,
  };
}

function isGeldigeDatum(
  waarde: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      waarde,
    )
  ) {
    return false;
  }

  const datum = new Date(
    `${waarde}T00:00:00.000Z`,
  );

  return (
    !Number.isNaN(datum.getTime()) &&
    datum.toISOString().slice(0, 10) ===
      waarde
  );
}

function isGeldigeTijd(
  waarde: string,
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    waarde,
  );
}

async function zoekActiefLid(
  naamAdi: string,
  bedrijfsnaam: string,
) {
  return prisma.lid.findFirst({
    where: {
      verwijderdOp: null,
      naamPersoon: {
        equals: naamAdi,
        mode: "insensitive",
      },
      bedrijf: {
        equals: bedrijfsnaam,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      naamPersoon: true,
      bedrijf: true,
      ovamId: true,
    },
  });
}

export async function meldLaattijdigePlaatsbezoeken(
  _vorigeState: LaattijdigeMeldingState,
  formData: FormData,
): Promise<LaattijdigeMeldingState> {
  const sleutel =
    await haalClientSleutelOp();

  if (
    !controleerPubliekeRateLimit({
      sleutel: `melding:${sleutel}`,
      maximum: 5,
      vensterMs: 60 * 60_000,
    })
  ) {
    return {
      fout:
        "Je hebt te veel meldingen verstuurd. Probeer het over enkele minuten opnieuw.",
    };
  }

  const website = normaliseerTekst(
    formData.get("website"),
  );

  if (website) {
    return {
      geslaagd: true,
      referentie:
        maakPubliekeReferentie(),
      aantal: 0,
    };
  }

  const naamAdi = normaliseerTekst(
    formData.get("naamAdi"),
  );

  const bedrijfsnaam = normaliseerTekst(
    formData.get("bedrijfsnaam"),
  );

  if (
    naamAdi.length < 2 ||
    naamAdi.length > 255
  ) {
    return {
      fout:
        "Vul een geldige naam van de ADI in.",
    };
  }

  if (
    bedrijfsnaam.length < 2 ||
    bedrijfsnaam.length > 500
  ) {
    return {
      fout:
        "Vul een geldige bedrijfsnaam in.",
    };
  }


  const bezoekenJson =
    normaliseerTekst(
      formData.get("bezoekenJson"),
    );

  let bezoeken: BezoekInvoer[];

  try {
    const parsed: unknown =
      JSON.parse(bezoekenJson);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Geen array",
      );
    }

    bezoeken = parsed;
  } catch {
    return {
      fout:
        "De gegevens van de plaatsbezoeken konden niet gelezen worden.",
    };
  }

  if (
    bezoeken.length < 1 ||
    bezoeken.length > 20
  ) {
    return {
      fout:
        "Voeg minimaal één en maximaal twintig plaatsbezoeken toe.",
    };
  }

  const nu = belgischeDatumEnTijd();

  const geldigeBezoeken: Array<{
    inspectielocatie: string;
    datum: string;
    tijdstip: string;
    reden: string;
    locatie: GeopuntLocatie;
    busnummer: string | null;
    extraAdresdetails: string | null;
    gemeenschappelijkeDelen: boolean;
  }> = [];

  for (
    let index = 0;
    index < bezoeken.length;
    index += 1
  ) {
    const bezoek = bezoeken[index];
    const nummer = index + 1;

    const leesTekst = (
      waarde: unknown,
    ) =>
      typeof waarde === "string"
        ? waarde.trim()
        : "";

    const gemeente =
      leesTekst(bezoek.gemeente);
    const straat =
      leesTekst(bezoek.straat);
    const huisnummer =
      leesTekst(bezoek.huisnummer);
    const busnummer =
      leesTekst(bezoek.busnummer);
    const extraAdresdetails =
      leesTekst(
        bezoek.extraAdresdetails,
      );
    const datum =
      leesTekst(bezoek.datum);
    const tijdstip =
      leesTekst(bezoek.tijdstip);
    const reden =
      leesTekst(bezoek.reden);

    const gemeenschappelijkeDelen =
      bezoek.gemeenschappelijkeDelen ===
      true;

    if (
      gemeente.length < 2 ||
      gemeente.length > 255 ||
      straat.length < 2 ||
      straat.length > 255 ||
      huisnummer.length < 1 ||
      huisnummer.length > 50 ||
      busnummer.length > 50 ||
      extraAdresdetails.length > 2000
    ) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: vul een geldige gemeente, straat en huisnummer in.`,
      };
    }

    if (!isGeldigeDatum(datum)) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: vul een geldige datum in.`,
      };
    }

    if (datum < nu.datum) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: de datum mag niet in het verleden liggen.`,
      };
    }

    if (!isGeldigeTijd(tijdstip)) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: vul een geldig tijdstip in.`,
      };
    }

    if (
      datum === nu.datum &&
      tijdstip < nu.tijd
    ) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: het tijdstip mag niet in het verleden liggen.`,
      };
    }

    const bezoekMoment =
      belgischeDatumTijdNaarUtc(
        datum,
        tijdstip,
      );

    if (
      bezoekMoment.getTime() -
        Date.now() >
      24 * 60 * 60 * 1000
    ) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: dit plaatsbezoek ligt meer dan 24 uur in de toekomst en moet via het OVAM-platform aangemeld worden.`,
      };
    }

    if (
      reden.length < 3 ||
      reden.length > 2000
    ) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: de reden moet tussen 3 en 2000 tekens bevatten.`,
      };
    }

    let locatie: GeopuntLocatie | null =
      null;

    try {
      locatie = await valideerAdres({
        gemeente,
        straat,
        huisnummer,
        busnummer,
      });
    } catch {
      locatie = null;
    }

    if (!locatie) {
      return {
        fout:
          `Plaatsbezoek ${nummer}: het geselecteerde adres kon niet bevestigd worden.`,
      };
    }

    geldigeBezoeken.push({
      inspectielocatie:
        locatie.geformatteerdAdres,
      datum,
      tijdstip,
      reden,
      locatie,
      busnummer:
        busnummer || null,
      extraAdresdetails:
        extraAdresdetails || null,
      gemeenschappelijkeDelen,
    });
  }

  const lid = await zoekActiefLid(
    naamAdi,
    bedrijfsnaam,
  );

  if (!lid || !lid.bedrijf) {
    return {
      fout:
        "De ingevoerde naam en bedrijfsnaam komen niet overeen met onze gegevens. Controleer beide velden en probeer opnieuw.",
    };
  }

  const aangemaakteMelding =
    await prisma
      .laattijdigePlaatsbezoekMelding
      .create({
        data: {
          lidId: lid.id,
          naamAdi: lid.naamPersoon,
          bedrijfsnaam: lid.bedrijf,
          bezoeken: {
            create:
              geldigeBezoeken.map(
                (bezoek) => ({
                  inspectielocatie:
                    bezoek.inspectielocatie,
                  geopuntId:
                    bezoek.locatie.id,
                  straat:
                    bezoek.locatie.straat,
                  huisnummer:
                    bezoek.locatie
                      .huisnummer,
                  postcode:
                    bezoek.locatie.postcode,
                  gemeente:
                    bezoek.locatie.gemeente,
                  busnummer:
                    bezoek.busnummer,
                  extraAdresdetails:
                    bezoek.extraAdresdetails,
                  gemeenschappelijkeDelen:
                    bezoek.gemeenschappelijkeDelen,
                  latitude:
                    bezoek.locatie.latitude,
                  longitude:
                    bezoek.locatie.longitude,
                  datumPlaatsbezoek:
                    new Date(
                      `${bezoek.datum}T00:00:00.000Z`,
                    ),
                  tijdstip:
                    new Date(
                      `1970-01-01T${bezoek.tijdstip}:00.000Z`,
                    ),
                  reden: bezoek.reden,
                }),
              ),
          },
        },
        select: {
          id: true,
          bezoeken: {
            select: {
              id: true,
              inspectielocatie:
                true,
              datumPlaatsbezoek:
                true,
              tijdstip: true,
              reden: true,
            },
          },
        },
      });

  try {
    await verwerkPushVoorNieuweLaattijdigeMelding({
      ovamId: lid.ovamId,
      naamAdi: lid.naamPersoon,
      bedrijfsnaam: lid.bedrijf,
      bezoeken:
        aangemaakteMelding.bezoeken,
    });
  } catch (fout) {
    console.error(
      "Automatische pushmelding kon niet worden verwerkt.",
      fout instanceof Error
        ? fout.message
        : "Onbekende fout",
    );
  }

  return {
    geslaagd: true,
    referentie:
      maakPubliekeReferentie(),
    aantal: geldigeBezoeken.length,
  };
}

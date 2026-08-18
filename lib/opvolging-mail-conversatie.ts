import "server-only";

type Adres = {
  naam?: string | null;
  email?: string;
};

type BronMail = {
  id: number;
  bestandsnaam: string;
  bestandstype: string;
  afzenderNaam: string | null;
  afzenderEmail: string;
  ontvangers: unknown;
  cc: unknown;
  onderwerp: string | null;
  verzondenOp: Date;
  tekstInhoud: string;
  bijlagen: unknown;
  internVerzonden: boolean;
};

export type OpvolgingMailGesprekBericht = {
  sleutel: string;
  bronMailId: number;
  bestandsnaam: string;
  bestandstype: string;
  afzenderNaam: string | null;
  afzenderEmail: string;
  ontvangers: Adres[];
  cc: Adres[];
  onderwerp: string | null;
  verzondenOp: string;
  tekstInhoud: string;
  bijlagen: unknown;
  internVerzonden: boolean;
};

type HeaderBlok = {
  index: number;
  einde: number;
  afzender: string;
  datum: string;
  aan: string;
  cc: string;
  onderwerp: string;
};

const HEADER_PATROON =
  /^(?:Van|From):[ \t]*(.+)\n(?:Verzonden|Sent|Date):[ \t]*(.+)\n(?:Aan|To):[ \t]*(.+)\n(?:(?:Cc):[ \t]*(.+)\n)?(?:Onderwerp|Subject):[ \t]*(.+)(?:\n|$)/gim;

const MAANDEN: Record<string, number> = {
  januari: 1,
  january: 1,
  februari: 2,
  february: 2,
  maart: 3,
  march: 3,
  april: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  juli: 7,
  july: 7,
  augustus: 8,
  august: 8,
  september: 9,
  oktober: 10,
  october: 10,
  november: 11,
  december: 12,
};

function normaliseerRegels(
  waarde: string,
) {
  return waarde
    .replace(/\r\n?/g, "\n")
    .replace(/\u2028|\u2029/g, "\n");
}

function schoonTekstOp(
  waarde: string,
) {
  return normaliseerRegels(
    waarde,
  )
    .replace(
      /([^\s<>]+@[^\s<>]+)<mailto:[^>]+>/gi,
      "$1",
    )
    .replace(
      /([^\s<>]+)<https?:\/\/[^>]+>/gi,
      "$1",
    )
    .replace(
      /<mailto:([^>]+)>/gi,
      "",
    )
    .replace(
      /^[ \t]*_{5,}[ \t]*$/gm,
      "",
    )
    .replace(
      /^[ \t]*-{5,}[ \t]*$/gm,
      "",
    )
    .replace(
      /\n[ \t]+\n/g,
      "\n\n",
    )
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .trim();
}

function haalEmailOp(
  waarde: string,
) {
  const email =
    waarde.match(
      /[^\s<>,;]+@[^\s<>,;]+/,
    )?.[0] ?? "";

  return email
    .replace(
      /[)>.,;:]+$/g,
      "",
    )
    .trim()
    .toLowerCase();
}

function haalNaamOp(
  waarde: string,
  email: string,
) {
  const naam =
    waarde
      .replace(
        /<[^>]*>/g,
        "",
      )
      .replace(
        email,
        "",
      )
      .replace(
        /\bmailto:[^\s]+/gi,
        "",
      )
      .trim();

  return naam
    ? naam.slice(0, 500)
    : null;
}

function isIntern(
  email: string,
) {
  const genormaliseerd =
    email
      .trim()
      .toLowerCase();

  return (
    genormaliseerd.endsWith(
      "@asbest-certificaat.be",
    ) ||
    genormaliseerd.endsWith(
      "@skh.be",
    )
  );
}

function leesAdressen(
  waarde: string,
): Adres[] {
  const adressen: Adres[] = [];

  for (
    const deel
    of waarde.split(/[;,](?=\s*[^<>]*(?:<|$))/)
  ) {
    const email =
      haalEmailOp(deel);

    if (!email) {
      continue;
    }

    adressen.push({
      naam:
        haalNaamOp(
          deel,
          email,
        ),
      email,
    });
  }

  if (adressen.length > 0) {
    return adressen;
  }

  const email =
    haalEmailOp(waarde);

  return email
    ? [
        {
          naam:
            haalNaamOp(
              waarde,
              email,
            ),
          email,
        },
      ]
    : [];
}

function leesBestaandeAdressen(
  waarde: unknown,
): Adres[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde.flatMap(
    (item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return [];
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const email =
        typeof record.email ===
        "string"
          ? record.email
              .trim()
              .toLowerCase()
          : "";

      if (!email) {
        return [];
      }

      return [
        {
          naam:
            typeof record.naam ===
            "string"
              ? record.naam
              : null,
          email,
        },
      ];
    },
  );
}

function tijdzoneOffset(
  datum: Date,
) {
  const naam =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Europe/Brussels",
        timeZoneName:
          "shortOffset",
        hour: "2-digit",
      },
    )
      .formatToParts(datum)
      .find(
        (deel) =>
          deel.type ===
          "timeZoneName",
      )
      ?.value ?? "GMT";

  const overeenkomst =
    naam.match(
      /GMT([+-])(\d{1,2})(?::(\d{2}))?/,
    );

  if (!overeenkomst) {
    return 0;
  }

  const minuten =
    Number(
      overeenkomst[2],
    ) *
      60 +
    Number(
      overeenkomst[3] ??
        "0",
    );

  return overeenkomst[1] === "-"
    ? -minuten
    : minuten;
}

function brusselseDatum(
  jaar: number,
  maand: number,
  dag: number,
  uur: number,
  minuut: number,
) {
  const lokaleWaarde =
    Date.UTC(
      jaar,
      maand - 1,
      dag,
      uur,
      minuut,
    );

  let resultaat =
    new Date(lokaleWaarde);

  for (
    let poging = 0;
    poging < 2;
    poging += 1
  ) {
    resultaat =
      new Date(
        lokaleWaarde -
          tijdzoneOffset(
            resultaat,
          ) *
            60_000,
      );
  }

  return resultaat;
}

function leesDatum(
  waarde: string,
) {
  const tekst =
    waarde
      .replace(
        /\b(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b,?/gi,
        "",
      )
      .replace(
        /\bom\b/gi,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  const geschreven =
    tekst.match(
      /(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})/i,
    );

  if (geschreven) {
    const maand =
      MAANDEN[
        geschreven[2]
          .toLowerCase()
      ];

    if (maand) {
      return brusselseDatum(
        Number(
          geschreven[3],
        ),
        maand,
        Number(
          geschreven[1],
        ),
        Number(
          geschreven[4],
        ),
        Number(
          geschreven[5],
        ),
      );
    }
  }

  const numeriek =
    tekst.match(
      /(\d{1,2})[/-](\d{1,2})[/-](\d{4})[,\s]+(\d{1,2}):(\d{2})/,
    );

  if (numeriek) {
    return brusselseDatum(
      Number(
        numeriek[3],
      ),
      Number(
        numeriek[2],
      ),
      Number(
        numeriek[1],
      ),
      Number(
        numeriek[4],
      ),
      Number(
        numeriek[5],
      ),
    );
  }

  const standaard =
    new Date(waarde);

  return Number.isNaN(
    standaard.getTime(),
  )
    ? null
    : standaard;
}

function vindHeaderBlokken(
  tekst: string,
) {
  const blokken:
    HeaderBlok[] = [];

  HEADER_PATROON.lastIndex =
    0;

  let overeenkomst:
    RegExpExecArray | null;

  while (
    (
      overeenkomst =
        HEADER_PATROON.exec(
          tekst,
        )
    ) !== null
  ) {
    blokken.push({
      index:
        overeenkomst.index,
      einde:
        HEADER_PATROON.lastIndex,
      afzender:
        overeenkomst[1],
      datum:
        overeenkomst[2],
      aan:
        overeenkomst[3],
      cc:
        overeenkomst[4] ?? "",
      onderwerp:
        overeenkomst[5],
    });
  }

  return blokken;
}

function vergelijkbareTekst(
  waarde: string,
) {
  return waarde
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    )
    .replace(
      /[^\p{L}\p{N}@]+/gu,
      "",
    )
    .slice(0, 2000);
}

function splitsBronMail(
  mail: BronMail,
) {
  const tekst =
    normaliseerRegels(
      mail.tekstInhoud,
    );

  const blokken =
    vindHeaderBlokken(
      tekst,
    );

  const berichten:
    OpvolgingMailGesprekBericht[] =
      [];

  const hoofdTekst =
    schoonTekstOp(
      blokken.length > 0
        ? tekst.slice(
            0,
            blokken[0].index,
          )
        : tekst,
    );

  if (hoofdTekst) {
    berichten.push({
      sleutel:
        `${mail.id}-hoofd`,
      bronMailId:
        mail.id,
      bestandsnaam:
        mail.bestandsnaam,
      bestandstype:
        mail.bestandstype,
      afzenderNaam:
        mail.afzenderNaam,
      afzenderEmail:
        mail.afzenderEmail,
      ontvangers:
        leesBestaandeAdressen(
          mail.ontvangers,
        ),
      cc:
        leesBestaandeAdressen(
          mail.cc,
        ),
      onderwerp:
        mail.onderwerp,
      verzondenOp:
        mail.verzondenOp.toISOString(),
      tekstInhoud:
        hoofdTekst,
      bijlagen:
        mail.bijlagen,
      internVerzonden:
        mail.internVerzonden,
    });
  }

  blokken.forEach(
    (
      blok,
      index,
    ) => {
      const volgende =
        blokken[index + 1];

      const berichtTekst =
        schoonTekstOp(
          tekst.slice(
            blok.einde,
            volgende
              ? volgende.index
              : tekst.length,
          ),
        );

      const datum =
        leesDatum(
          blok.datum,
        );

      const email =
        haalEmailOp(
          blok.afzender,
        );

      if (
        !berichtTekst ||
        !datum ||
        !email
      ) {
        return;
      }

      berichten.push({
        sleutel:
          `${mail.id}-geciteerd-${index}`,
        bronMailId:
          mail.id,
        bestandsnaam:
          mail.bestandsnaam,
        bestandstype:
          mail.bestandstype,
        afzenderNaam:
          haalNaamOp(
            blok.afzender,
            email,
          ),
        afzenderEmail:
          email,
        ontvangers:
          leesAdressen(
            blok.aan,
          ),
        cc:
          leesAdressen(
            blok.cc,
          ),
        onderwerp:
          blok.onderwerp
            .trim()
            .slice(0, 1000) ||
          null,
        verzondenOp:
          datum.toISOString(),
        tekstInhoud:
          berichtTekst,
        bijlagen: [],
        internVerzonden:
          isIntern(email),
      });
    },
  );

  return berichten;
}

export function splitsOpvolgingMailConversatie(
  mails: BronMail[],
) {
  const uniek =
    new Map<
      string,
      OpvolgingMailGesprekBericht
    >();

  for (const mail of mails) {
    for (
      const bericht
      of splitsBronMail(mail)
    ) {
      const datum =
        new Date(
          bericht.verzondenOp,
        );

      const sleutel = [
        bericht.afzenderEmail
          .toLowerCase(),
        datum
          .toISOString()
          .slice(0, 16),
        vergelijkbareTekst(
          bericht.onderwerp ??
            "",
        ),
        vergelijkbareTekst(
          bericht.tekstInhoud,
        ),
      ].join("|");

      const bestaand =
        uniek.get(sleutel);

      if (
        !bestaand ||
        bericht.tekstInhoud
          .length >
          bestaand.tekstInhoud
            .length
      ) {
        uniek.set(
          sleutel,
          bericht,
        );
      }
    }
  }

  return Array.from(
    uniek.values(),
  ).sort(
    (links, rechts) => {
      const datumverschil =
        new Date(
          links.verzondenOp,
        ).getTime() -
        new Date(
          rechts.verzondenOp,
        ).getTime();

      if (datumverschil) {
        return datumverschil;
      }

      return links.sleutel.localeCompare(
        rechts.sleutel,
      );
    },
  );
}

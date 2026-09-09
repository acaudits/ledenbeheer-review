import "dotenv/config";

import {
  resolve,
} from "node:path";

import ExcelJS from "exceljs";

let sluitDatabase:
  (() => Promise<void>) | null =
  null;

type Rij = {
  excelRij: number;
  auditeur: string | null;
  naamAdi: string;
  ovamId: string | null;
  bedrijfsnaam: string | null;
  linkAttest: string | null;
  attestnummer: string | null;
  reden: string;
  datumVaststelling: Date;
  opmerkingen: string | null;
  opvolgingAfgerond: boolean;
  datumAfgerond: Date | null;
  opgevolgdDoor: string | null;
};

type Argumenten = {
  bestand: string;
  modus: "dry-run" | "apply";
  gebruikerEmail: string | null;
};

function argumenten(): Argumenten {
  const waarden =
    process.argv.slice(2);

  const fileIndex =
    waarden.indexOf("--file");

  const dryRun =
    waarden.includes("--dry-run");

  const apply =
    waarden.includes("--apply");

  const gebruikerIndex =
    waarden.indexOf(
      "--gebruiker-email",
    );

  if (
    fileIndex < 0 ||
    !waarden[fileIndex + 1] ||
    dryRun === apply
  ) {
    throw new Error(
      "Gebruik: --file <bestand.xlsx> (--dry-run | --apply) [--gebruiker-email <e-mail>]",
    );
  }

  const gebruikerEmail =
    gebruikerIndex >= 0
      ? waarden[
          gebruikerIndex + 1
        ]?.trim().toLowerCase() ||
        null
      : null;

  if (
    apply &&
    !gebruikerEmail
  ) {
    throw new Error(
      "--gebruiker-email is verplicht bij --apply.",
    );
  }

  return {
    bestand: resolve(
      waarden[fileIndex + 1],
    ),
    modus:
      apply
        ? "apply"
        : "dry-run",
    gebruikerEmail,
  };
}

function celTekst(
  waarde: unknown,
): string | null {
  if (
    waarde === null ||
    waarde === undefined
  ) {
    return null;
  }

  if (
    typeof waarde === "object" &&
    waarde !== null
  ) {
    if (
      "text" in waarde &&
      typeof waarde.text ===
        "string"
    ) {
      return celTekst(
        waarde.text,
      );
    }

    if (
      "result" in waarde
    ) {
      return celTekst(
        waarde.result,
      );
    }

    if (
      "richText" in waarde &&
      Array.isArray(
        waarde.richText,
      )
    ) {
      return celTekst(
        waarde.richText
          .map((deel) =>
            typeof deel ===
              "object" &&
            deel !== null &&
            "text" in deel
              ? String(
                  deel.text,
                )
              : "",
          )
          .join(""),
      );
    }
  }

  const tekst =
    String(waarde).trim();

  if (
    !tekst ||
    tekst.toLowerCase() ===
      "nan"
  ) {
    return null;
  }

  return tekst;
}

function normaliseer(
  waarde: string | null,
) {
  return (
    waarde
      ?.normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " ",
      )
      .trim() ?? ""
  );
}

function datumUitCel(
  waarde: unknown,
): Date | null {
  if (waarde instanceof Date) {
    return new Date(
      Date.UTC(
        waarde.getFullYear(),
        waarde.getMonth(),
        waarde.getDate(),
      ),
    );
  }

  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    const milliseconden =
      Math.round(
        (waarde - 25569) *
          86_400_000,
      );

    const datum =
      new Date(milliseconden);

    return new Date(
      Date.UTC(
        datum.getUTCFullYear(),
        datum.getUTCMonth(),
        datum.getUTCDate(),
      ),
    );
  }

  const tekst =
    celTekst(waarde);

  if (!tekst) {
    return null;
  }

  const match =
    tekst.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/,
    );

  if (match) {
    const datum =
      new Date(
        Date.UTC(
          Number(match[3]),
          Number(match[2]) - 1,
          Number(match[1]),
        ),
      );

    return Number.isNaN(
      datum.getTime(),
    )
      ? null
      : datum;
  }

  const iso =
    tekst.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (iso) {
    const datum =
      new Date(
        Date.UTC(
          Number(iso[1]),
          Number(iso[2]) - 1,
          Number(iso[3]),
        ),
      );

    return Number.isNaN(
      datum.getTime(),
    )
      ? null
      : datum;
  }

  return null;
}

function datumSleutel(
  datum: Date,
) {
  return datum
    .toISOString()
    .slice(0, 10);
}

function booleanUitCel(
  waarde: unknown,
) {
  if (
    typeof waarde ===
    "boolean"
  ) {
    return waarde;
  }

  return [
    "true",
    "waar",
    "ja",
    "1",
  ].includes(
    normaliseer(
      celTekst(waarde),
    ),
  );
}

const persoonsIdFallbacks =
  new Map([
    [
      "frank morre",
      "RYA95FU8",
    ],
    [
      "tomas pauwels",
      "AKVDZH4E",
    ],
    [
      "brent claus",
      "7P8JG4AN",
    ],
  ]);

function geldigeLink(
  waarde: string | null,
) {
  return waarde &&
    /^https?:\/\/\S+$/i.test(
      waarde,
    )
    ? waarde
    : null;
}

function gebruikerAliases(
  gebruiker: {
    email: string;
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
  },
) {
  return new Set(
    [
      gebruiker.naam,
      gebruiker.voornaam,
      gebruiker.achternaam,
      [
        gebruiker.voornaam,
        gebruiker.achternaam,
      ]
        .filter(Boolean)
        .join(" "),
      gebruiker.email,
      gebruiker.email.split(
        "@",
      )[0],
    ]
      .map((waarde) =>
        normaliseer(
          waarde || null,
        ),
      )
      .filter(Boolean),
  );
}

async function leesRijen(
  bestand: string,
) {
  const werkboek =
    new ExcelJS.Workbook();

  await werkboek.xlsx.readFile(
    bestand,
  );

  const werkblad =
    werkboek.getWorksheet(
      "ADI Opvolgen",
    );

  if (!werkblad) {
    throw new Error(
      'Werkblad "ADI Opvolgen" ontbreekt.',
    );
  }

  let kopRij = 0;
  const kolommen =
    new Map<string, number>();

  for (
    let rijNummer = 1;
    rijNummer <=
    Math.min(
      werkblad.actualRowCount,
      25,
    );
    rijNummer++
  ) {
    const tijdelijk =
      new Map<string, number>();

    werkblad
      .getRow(rijNummer)
      .eachCell(
        {
          includeEmpty: false,
        },
        (cel, kolom) => {
          const naam =
            normaliseer(
              celTekst(
                cel.value,
              ),
            );

          if (naam) {
            tijdelijk.set(
              naam,
              kolom,
            );
          }
        },
      );

    if (
      tijdelijk.has(
        "naam adi",
      ) &&
      tijdelijk.has(
        "reden",
      ) &&
      tijdelijk.has(
        "datum vaststellingen",
      )
    ) {
      kopRij = rijNummer;

      for (
        const item of
        tijdelijk
      ) {
        kolommen.set(
          item[0],
          item[1],
        );
      }

      break;
    }
  }

  if (!kopRij) {
    throw new Error(
      "De kolomkoppen werden niet gevonden.",
    );
  }

  const waarde = (
    rijNummer: number,
    kolomNaam: string,
  ) => {
    const kolom =
      kolommen.get(
        normaliseer(
          kolomNaam,
        ),
      );

    return kolom
      ? werkblad.getRow(
          rijNummer,
        ).getCell(kolom)
          .value
      : null;
  };

  const rijen: Rij[] = [];
  const fouten: string[] = [];
  const waarschuwingen:
    string[] = [];

  for (
    let nummer = kopRij + 1;
    nummer <=
    werkblad.actualRowCount;
    nummer++
  ) {
    const naamAdi =
      celTekst(
        waarde(
          nummer,
          "Naam ADI",
        ),
      );

    const reden =
      celTekst(
        waarde(
          nummer,
          "Reden",
        ),
      );

    const datumVaststelling =
      datumUitCel(
        waarde(
          nummer,
          "Datum vaststellingen",
        ),
      );

    if (
      !naamAdi &&
      !reden &&
      !datumVaststelling
    ) {
      continue;
    }

    if (
      !naamAdi ||
      !reden ||
      !datumVaststelling
    ) {
      fouten.push(
        `Rij ${nummer}: naam, reden of datum vaststelling ontbreekt.`,
      );
      continue;
    }

    const origineleLink =
      celTekst(
        waarde(
          nummer,
          "Link naar asbestinventaris",
        ),
      ) ??
      celTekst(
        waarde(
          nummer,
          "Link attest",
        ),
      );

    const linkAttest =
      geldigeLink(
        origineleLink,
      );

    if (
      origineleLink &&
      !linkAttest
    ) {
      waarschuwingen.push(
        `Rij ${nummer}: ongeldige attestlink genegeerd.`,
      );
    }

    const attestnummer =
      celTekst(
        waarde(
          nummer,
          "Attestnummer",
        ),
      );

    if (!attestnummer) {
      waarschuwingen.push(
        `Rij ${nummer}: attestnummer ontbreekt.`,
      );
    }

    let ovamId =
      celTekst(
        waarde(
          nummer,
          "PersoonsID",
        ),
      );

    const fallback =
      persoonsIdFallbacks.get(
        normaliseer(
          naamAdi,
        ),
      );

    if (!ovamId && fallback) {
      ovamId = fallback;
      waarschuwingen.push(
        `Rij ${nummer}: PersoonsID-fallback ${naamAdi} -> ${fallback}.`,
      );
    }

    const excelAfgerond =
      booleanUitCel(
        waarde(
          nummer,
          "Opgevolgd",
        ),
      );

    const opgevolgdDoorExcel =
      celTekst(
        waarde(
          nummer,
          "Opgevolgd door",
        ),
      );

    /*
     * Historische registraties die in Excel als afgerond staan,
     * maar geen verantwoordelijke hebben, blijven bewust open.
     */
    const openWegensOntbrekendeOpvolger =
      excelAfgerond &&
      !opgevolgdDoorExcel;

    const opvolgingAfgerond =
      excelAfgerond &&
      !openWegensOntbrekendeOpvolger;

    if (
      openWegensOntbrekendeOpvolger
    ) {
      waarschuwingen.push(
        `Rij ${nummer}: ${naamAdi} opengezet wegens ontbrekende opvolger.`,
      );
    }

    const datumAfgerond =
      opvolgingAfgerond
        ? datumUitCel(
            waarde(
              nummer,
              "Datum opvolging",
            ),
          )
        : null;

    const opgevolgdDoor =
      opvolgingAfgerond
        ? opgevolgdDoorExcel
        : null;

    if (
      opvolgingAfgerond &&
      !datumAfgerond
    ) {
      fouten.push(
        `Rij ${nummer}: afgeronde registratie zonder datum opvolging.`,
      );
    }

    if (
      opvolgingAfgerond &&
      !opgevolgdDoor
    ) {
      fouten.push(
        `Rij ${nummer}: afgeronde registratie zonder opgevolgd door.`,
      );
    }

    rijen.push({
      excelRij: nummer,
      auditeur:
        celTekst(
          waarde(
            nummer,
            "Auditeur",
          ),
        ),
      naamAdi,
      ovamId,
      bedrijfsnaam:
        celTekst(
          waarde(
            nummer,
            "Bedrijfsnaam",
          ),
        ),
      linkAttest,
      attestnummer,
      reden,
      datumVaststelling,
      opmerkingen:
        celTekst(
          waarde(
            nummer,
            "Opmerkingen",
          ),
        ),
      opvolgingAfgerond,
      datumAfgerond,
      opgevolgdDoor,
    });
  }

  return {
    rijen,
    fouten,
    waarschuwingen,
  };
}

async function hoofd() {
  const args =
    argumenten();

  const {
    rijen,
    fouten,
    waarschuwingen,
  } =
    await leesRijen(
      args.bestand,
    );

  const open =
    rijen.filter(
      (rij) =>
        !rij.opvolgingAfgerond,
    ).length;

  const afgerond =
    rijen.filter(
      (rij) =>
        rij.opvolgingAfgerond,
    ).length;

  const uitzonderingenAantal =
    waarschuwingen.filter(
      (melding) =>
        melding.includes(
          "opengezet wegens ontbrekende opvolger",
        ),
    ).length;

  console.log(
    "Werkblad: ADI Opvolgen",
  );
  console.log(
    `Gelezen registraties: ${rijen.length}`,
  );
  console.log(
    `Open registraties: ${open}`,
  );
  console.log(
    `Afgeronde registraties: ${afgerond}`,
  );
  console.log(
    `CAT_0: ${rijen.length}`,
  );
  console.log(
    "Ontbrekende datum vaststelling: " +
      fouten.filter((fout) =>
        fout.includes(
          "datum vaststelling ontbreekt",
        ),
      ).length,
  );
  console.log(
    `Opengezet wegens ontbrekende opvolger: ${uitzonderingenAantal}`,
  );

  for (
    const waarschuwing of
    waarschuwingen
  ) {
    console.warn(
      `WAARSCHUWING: ${waarschuwing}`,
    );
  }

  for (const fout of fouten) {
    console.error(
      `FOUT: ${fout}`,
    );
  }

  if (
    rijen.length !== 50 ||
    open !== 28 ||
    afgerond !== 22 ||
    uitzonderingenAantal !==
      5
  ) {
    throw new Error(
      "Dry-run wijkt af van de verwachte tellingen 50/28/22/5.",
    );
  }

  if (fouten.length) {
    throw new Error(
      `Import bevat ${fouten.length} validatiefout(en).`,
    );
  }

  if (
    args.modus === "dry-run"
  ) {
    console.log(
      "Dry-run geslaagd; er werd niets naar de database geschreven.",
    );
    return;
  }

  const {
    prisma,
  } = await import(
    "../lib/prisma"
  );

  sluitDatabase =
    () => prisma.$disconnect();

  const gebruiker =
    await prisma.toegestaneGebruiker.findFirst({
      where: {
        email:
          args.gebruikerEmail!,
        actief: true,
      },
      select: {
        id: true,
        email: true,
        naam: true,
        voornaam: true,
        achternaam: true,
      },
    });

  if (!gebruiker) {
    throw new Error(
      "De opgegeven importgebruiker bestaat niet of is niet actief.",
    );
  }

  const auditeurs =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rollen: {
          has: "AUDITEUR",
        },
      },
      select: {
        id: true,
        email: true,
        naam: true,
        voornaam: true,
        achternaam: true,
      },
    });

  function zoekGebruiker(
    invoer: string | null,
  ) {
    const sleutel =
      normaliseer(invoer);

    if (!sleutel) {
      return null;
    }

    const matches =
      auditeurs.filter(
        (auditeur) =>
          gebruikerAliases(
            auditeur,
          ).has(sleutel),
      );

    if (matches.length !== 1) {
      throw new Error(
        `Gebruiker “${invoer}” heeft ${matches.length} matches.`,
      );
    }

    return matches[0];
  }

  const bestandsnaam =
    "bulk opvolging.xlsx";

  const bestaande =
    await prisma.opvolgingSanctie.findMany({
      where: {
        bronType:
          "EXCEL_IMPORT",
        bronBestandsnaam:
          bestandsnaam,
        bronExcelRij: {
          in: rijen.map(
            (rij) =>
              rij.excelRij,
          ),
        },
      },
      select: {
        bronExcelRij: true,
      },
    });

  const bestaandeRijen =
    new Set(
      bestaande.map(
        (rij) =>
          rij.bronExcelRij,
      ),
    );

  const nieuweRijen =
    rijen.filter(
      (rij) =>
        !bestaandeRijen.has(
          rij.excelRij,
        ),
    );

  await prisma.$transaction(
    async (database) => {
      for (
        const rij of
        nieuweRijen
      ) {
        const auditeur =
          zoekGebruiker(
            rij.auditeur,
          );

        const afgerondDoor =
          rij.opvolgingAfgerond
            ? zoekGebruiker(
                rij.opgevolgdDoor,
              )
            : null;

        if (
          rij.opvolgingAfgerond &&
          !afgerondDoor
        ) {
          throw new Error(
            `Rij ${rij.excelRij}: afgerond door kon niet worden gekoppeld.`,
          );
        }

        const registratie =
          await database.opvolgingSanctie.create({
            data: {
              bronType:
                "EXCEL_IMPORT",
              bronId: null,
              bronBestandsnaam:
                bestandsnaam,
              bronExcelRij:
                rij.excelRij,
              auditeur:
                rij.auditeur,
              auditeurGebruikerId:
                auditeur?.id ??
                null,
              naamAdi:
                rij.naamAdi,
              opvolgingAfgerond:
                rij.opvolgingAfgerond,
              datumAfgerond:
                rij.datumAfgerond,
              afgerondDoorGebruikerId:
                afgerondDoor?.id ??
                null,
              linkAttest:
                rij.linkAttest,
              attestnummer:
                rij.attestnummer,
              reden:
                rij.reden,
              bedrijfsnaam:
                rij.bedrijfsnaam,
              ovamId:
                rij.ovamId,
              datumVaststelling:
                rij.datumVaststelling,
              opmerkingen:
                rij.opmerkingen,
              ncCategorie:
                "CAT_0",
              sanctieBegindatum:
                null,
              sanctieEinddatum:
                null,
              sanctieDoorgezet:
                null,
              redenNietDoorzetten:
                null,
              aangemaaktDoorId:
                gebruiker.id,
            },
          });

        await database.auditlog.create({
          data: {
            gebruikerId:
              gebruiker.id,
            gebruikerNaam:
              [
                gebruiker.voornaam,
                gebruiker.achternaam,
              ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              gebruiker.naam ||
              gebruiker.email,
            gebruikerEmail:
              gebruiker.email,
            actie:
              "OPVOLGING_SANCTIE_EXCEL_GEIMPORTEERD",
            entiteit:
              "OpvolgingSanctie",
            entiteitId:
              registratie.id,
            omschrijving:
              "Opvolging/sanctie uit Excel geïmporteerd.",
            nieuweWaarde: {
              bronType:
                "EXCEL_IMPORT",
              bronBestandsnaam:
                bestandsnaam,
              bronExcelRij:
                rij.excelRij,
              naamAdi:
                rij.naamAdi,
              datumVaststelling:
                datumSleutel(
                  rij.datumVaststelling,
                ),
              ncCategorie:
                "CAT_0",
              opvolgingAfgerond:
                rij.opvolgingAfgerond,
            },
          },
        });
      }
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );

  console.log(
    `Import geslaagd: ${nieuweRijen.length} toegevoegd, ${bestaande.length} overgeslagen.`,
  );
}

hoofd()
  .catch((fout: unknown) => {
    console.error(
      fout instanceof Error
        ? fout.message
        : fout,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (sluitDatabase) {
      await sluitDatabase();
    }
  });

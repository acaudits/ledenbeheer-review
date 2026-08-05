"use server";

import ExcelJS from "exceljs";

import {
  importeerNaFinalisatieUitExcel,
} from "@/app/na-finalisatie/import-actions";
import {
  vereisBeheerder,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

const MAX_REFERENTIE_GROOTTE =
  5 * 1024 * 1024;

const MAX_TERREIN_GROOTTE =
  15 * 1024 * 1024;

const MAX_BESTANDEN = 500;

const MAX_TOTALE_UPLOADGROOTTE =
  250 * 1024 * 1024;

type Plaatsbezoek =
  | "SPONTAAN"
  | "TELEFONISCHE_AFSPRAAK"
  | "EMAILAFSPRAAK"
  | "KLACHT";

type TypeControle =
  | "GEHEEL"
  | "DEELS"
  | "ENKEL_OPENBARE_WEG";

type ReferentieRij = {
  excelRij: number;
  auditeur: string;
  naamAdi: string;
  naamBedrijf: string;
  bronId: string;
  attestnummer: string;
  datumNaFinalisatie: string;
  plaatsbezoek: Plaatsbezoek | "";
  typeControle: TypeControle | "";
  reden: string;
  opmerking: string;
  inspectielocatie: string;
  persoonsId: string;
  geregistreerd: boolean | null;
};

type TerreinBestand = {
  bestand: File;
  bestandsnaam: string;
  attestnummer: string;
  persoonsId: string;
  inspectielocatie: string;
};

export type NaFinalisatieBulkRij = {
  bestandsnaam: string;
  attestnummer: string;
  bronId: string;
  datumNaFinalisatie: string;
  gekoppeld: boolean;
  status:
    | "GELDIG"
    | "WAARSCHUWING"
    | "GEIMPORTEERD"
    | "OVERGESLAGEN"
    | "MISLUKT";
  message: string;
  registratieId?: number;
};

export type NaFinalisatieBulkResultaat = {
  succes: boolean;
  message: string;
  referentieWerkblad?: string;
  aantalReferentierijen: number;
  resultaten: NaFinalisatieBulkRij[];
};

function tekst(
  waarde: unknown,
) {
  const resultaat =
    String(
      waarde ?? "",
    ).trim();

  const klein =
    resultaat.toLocaleLowerCase(
      "nl-BE",
    );

  if (
    !resultaat ||
    klein === "nan" ||
    klein === "nat" ||
    klein === "null" ||
    klein === "undefined"
  ) {
    return "";
  }

  return resultaat;
}

function celTekst(
  cel: ExcelJS.Cell | null,
) {
  if (!cel) {
    return "";
  }

  const waarde = cel.value;

  if (
    waarde === null ||
    waarde === undefined
  ) {
    return "";
  }

  if (waarde instanceof Date) {
    return waarde
      .toISOString()
      .slice(0, 10);
  }

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return tekst(waarde);
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(
      waarde.richText,
    )
  ) {
    return tekst(
      waarde.richText
        .map((deel) =>
          typeof deel === "object" &&
          deel !== null &&
          "text" in deel
            ? String(deel.text)
            : "",
        )
        .join(""),
    );
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde
  ) {
    return tekst(waarde.text);
  }

  if (
    typeof waarde === "object" &&
    "result" in waarde
  ) {
    return tekst(waarde.result);
  }

  return tekst(cel.text);
}

function normaliseerKop(
  waarde: string,
) {
  return waarde
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase("nl-BE")
    .replace(/[^a-z0-9]/g, "");
}

const ALIASSEN = {
  auditeur: [
    "auditeur",
    "controleur",
    "uitvoerder",
  ],
  naamAdi: [
    "naamadi",
    "adi",
    "adinaam",
  ],
  naamBedrijf: [
    "naambedrijf",
    "bedrijfsnaam",
    "bedrijf",
  ],
  bronId: [
    "id",
    "bronid",
    "externid",
  ],
  attestnummer: [
    "attestnummer",
    "attestnr",
  ],
  datumNaFinalisatie: [
    "datumnafinalisatie",
    "finalisatiedatum",
    "datumfinalisatie",
  ],
  plaatsbezoek: [
    "plaatsbezoek",
    "wijzeplaatsbezoek",
  ],
  typeControle: [
    "typecontrole",
    "controletype",
  ],
  reden: [
    "reden",
  ],
  opmerking: [
    "opmerking",
    "opmerkingen",
  ],
  inspectielocatie: [
    "inspectielocatie",
    "locatie",
    "adres",
  ],
  persoonsId: [
    "persoonsid",
    "ovamid",
    "ovampersoonsid",
  ],
  geregistreerd: [
    "geregistreerd",
    "registratie",
  ],
} as const;

type Veldnaam =
  keyof typeof ALIASSEN;

function veldVoorKop(
  kop: string,
): Veldnaam | null {
  const normaal =
    normaliseerKop(kop);

  for (
    const [veld, aliassen]
    of Object.entries(ALIASSEN)
  ) {
    if (
      (
        aliassen as readonly string[]
      ).includes(normaal)
    ) {
      return veld as Veldnaam;
    }
  }

  return null;
}

function maakUtcDatum(
  jaar: number,
  maand: number,
  dag: number,
) {
  const datum =
    new Date(
      Date.UTC(
        jaar,
        maand - 1,
        dag,
      ),
    );

  if (
    datum.getUTCFullYear() !== jaar ||
    datum.getUTCMonth() !==
      maand - 1 ||
    datum.getUTCDate() !== dag
  ) {
    return null;
  }

  return datum;
}

function datumUitCel(
  cel: ExcelJS.Cell,
) {
  const waarde = cel.value;

  let datum: Date | null =
    null;

  if (waarde instanceof Date) {
    datum = maakUtcDatum(
      waarde.getUTCFullYear(),
      waarde.getUTCMonth() + 1,
      waarde.getUTCDate(),
    );
  } else if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    const excelDatum =
      new Date(
        Date.UTC(1899, 11, 30) +
        Math.floor(waarde) *
          86400000,
      );

    datum = maakUtcDatum(
      excelDatum.getUTCFullYear(),
      excelDatum.getUTCMonth() + 1,
      excelDatum.getUTCDate(),
    );
  } else {
    const waardeTekst =
      celTekst(cel);

    let match =
      waardeTekst.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})/,
      );

    if (match) {
      datum = maakUtcDatum(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      );
    } else {
      match =
        waardeTekst.match(
          /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
        );

      if (match) {
        datum = maakUtcDatum(
          Number(match[3]),
          Number(match[2]),
          Number(match[1]),
        );
      }
    }
  }

  return datum
    ? datum.toISOString().slice(0, 10)
    : "";
}

function booleanUitTekst(
  waarde: string,
) {
  const normaal =
    normaliseerKop(waarde);

  if (
    [
      "ja",
      "yes",
      "true",
      "waar",
      "1",
    ].includes(normaal)
  ) {
    return true;
  }

  if (
    [
      "nee",
      "neen",
      "no",
      "false",
      "onwaar",
      "0",
    ].includes(normaal)
  ) {
    return false;
  }

  return null;
}

function plaatsbezoekUitTekst(
  waarde: string,
): Plaatsbezoek | "" {
  const normaal =
    normaliseerKop(waarde);

  if (
    normaal.includes("spontaan")
  ) {
    return "SPONTAAN";
  }

  if (
    normaal.includes("telefon")
  ) {
    return "TELEFONISCHE_AFSPRAAK";
  }

  if (
    normaal.includes("email") ||
    normaal.includes("mailafspraak")
  ) {
    return "EMAILAFSPRAAK";
  }

  if (
    normaal.includes("klacht")
  ) {
    return "KLACHT";
  }

  return "";
}

function typeControleUitTekst(
  waarde: string,
): TypeControle | "" {
  const normaal =
    normaliseerKop(waarde);

  if (
    normaal === "geheel" ||
    normaal === "volledig"
  ) {
    return "GEHEEL";
  }

  if (
    normaal === "deels" ||
    normaal === "gedeeltelijk"
  ) {
    return "DEELS";
  }

  if (
    normaal.includes(
      "openbareweg",
    )
  ) {
    return "ENKEL_OPENBARE_WEG";
  }

  return "";
}

async function laadWerkboek(
  bestand: File,
) {
  const buffer =
    Buffer.from(
      await bestand.arrayBuffer(),
    );

  const werkboek =
    new ExcelJS.Workbook();

  await werkboek.xlsx.load(
    buffer as unknown as Parameters<
      typeof werkboek.xlsx.load
    >[0],
  );

  return werkboek;
}

function geldigBestand(
  bestand: File,
  maximum: number,
) {
  return (
    bestand.size > 0 &&
    bestand.size <= maximum &&
    bestand.name
      .toLocaleLowerCase("nl-BE")
      .endsWith(".xlsx")
  );
}

async function leesReferentie(
  bestand: File,
) {
  const werkboek =
    await laadWerkboek(bestand);

  const uitgesloten =
    new Set([
      "adiopvolging",
      "procescertificaatbedrijven",
      "uittevoerendeskcontroles",
    ]);

  const kandidaten =
    werkboek.worksheets
      .filter(
        (werkblad) =>
          !uitgesloten.has(
            normaliseerKop(
              werkblad.name,
            ),
          ),
      )
      .map((werkblad) => {
        let besteRij = 0;
        let besteScore = 0;
        let besteVelden =
          new Map<
            Veldnaam,
            number
          >();

        const maximumRij =
          Math.min(
            werkblad.rowCount,
            30,
          );

        for (
          let rij = 1;
          rij <= maximumRij;
          rij++
        ) {
          const velden =
            new Map<
              Veldnaam,
              number
            >();

          werkblad
            .getRow(rij)
            .eachCell(
              {
                includeEmpty: false,
              },
              (cel, kolom) => {
                const veld =
                  veldVoorKop(
                    celTekst(cel),
                  );

                if (veld) {
                  velden.set(
                    veld,
                    kolom,
                  );
                }
              },
            );

          if (
            velden.size >
            besteScore
          ) {
            besteScore =
              velden.size;
            besteRij = rij;
            besteVelden =
              velden;
          }
        }

        const naamBonus =
          normaliseerKop(
            werkblad.name,
          ) === "nafinalisatie"
            ? 100
            : 0;

        return {
          werkblad,
          kopRij: besteRij,
          velden: besteVelden,
          score:
            besteScore +
            naamBonus,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      );

  const gekozen =
    kandidaten[0];

  if (
    !gekozen ||
    gekozen.velden.size < 5
  ) {
    throw new Error(
      'Geen bruikbaar werkblad "Na Finalisatie" gevonden.',
    );
  }

  const rijen:
    ReferentieRij[] = [];

  for (
    let rij =
      gekozen.kopRij + 1;
    rij <=
      gekozen.werkblad.rowCount;
    rij++
  ) {
    const celVoor =
      (veld: Veldnaam) => {
        const kolom =
          gekozen.velden.get(
            veld,
          );

        return kolom
          ? gekozen.werkblad.getCell(
              rij,
              kolom,
            )
          : null;
      };

    const attestCel =
      celVoor("attestnummer");

    const attestnummer =
      attestCel
        ? celTekst(attestCel)
            .toUpperCase()
        : "";

    const bronIdCel =
      celVoor("bronId");

    const persoonsCel =
      celVoor("persoonsId");

    if (
      !attestnummer &&
      !bronIdCel &&
      !persoonsCel
    ) {
      continue;
    }

    const datumCel =
      celVoor(
        "datumNaFinalisatie",
      );

    const geregistreerdCel =
      celVoor("geregistreerd");

    rijen.push({
      excelRij: rij,
      auditeur:
        celTekst(
          celVoor(
            "auditeur",
          ),
        ),
      naamAdi:
        celTekst(
          celVoor(
            "naamAdi",
          ),
        ),
      naamBedrijf:
        celTekst(
          celVoor(
            "naamBedrijf",
          ),
        ),
      bronId:
        bronIdCel
          ? celTekst(bronIdCel)
          : "",
      attestnummer,
      datumNaFinalisatie:
        datumCel
          ? datumUitCel(datumCel)
          : "",
      plaatsbezoek:
        plaatsbezoekUitTekst(
          celTekst(
            celVoor(
              "plaatsbezoek",
            ),
          ),
        ),
      typeControle:
        typeControleUitTekst(
          celTekst(
            celVoor(
              "typeControle",
            ),
          ),
        ),
      reden:
        celTekst(
          celVoor("reden"),
        ),
      opmerking:
        celTekst(
          celVoor(
            "opmerking",
          ),
        ),
      inspectielocatie:
        celTekst(
          celVoor(
            "inspectielocatie",
          ),
        ),
      persoonsId:
        celTekst(
          celVoor(
            "persoonsId",
          ),
        ).toUpperCase(),
      geregistreerd:
        geregistreerdCel
          ? booleanUitTekst(
              celTekst(
                geregistreerdCel,
              ),
            )
          : null,
    });
  }

  return {
    werkblad:
      gekozen.werkblad.name,
    rijen,
  };
}

async function leesTerreinBestand(
  bestand: File,
): Promise<TerreinBestand> {
  const werkboek =
    await laadWerkboek(bestand);

  const werkblad =
    werkboek.getWorksheet(
      "Terreincontrole samenvatting",
    );

  if (!werkblad) {
    throw new Error(
      'Werkblad "Terreincontrole samenvatting" ontbreekt.',
    );
  }

  const attestnummer =
    celTekst(
      werkblad.getCell("A5"),
    ).toUpperCase();

  if (!attestnummer) {
    throw new Error(
      "Cel A5 bevat geen attestnummer.",
    );
  }

  return {
    bestand,
    bestandsnaam:
      bestand.name,
    attestnummer,
    persoonsId:
      celTekst(
        werkblad.getCell("B7"),
      ).toUpperCase(),
    inspectielocatie:
      celTekst(
        werkblad.getCell("A7"),
      ),
  };
}

function normaliseerWaarde(
  waarde: string,
) {
  return waarde
    .trim()
    .toLocaleLowerCase("nl-BE")
    .replace(/\s+/g, " ");
}

function zoekReferentie(
  terrein: TerreinBestand,
  referenties: ReferentieRij[],
) {
  let resultaten =
    referenties.filter(
      (rij) =>
        rij.attestnummer ===
        terrein.attestnummer,
    );

  if (resultaten.length === 1) {
    return resultaten[0];
  }

  if (
    resultaten.length > 1
  ) {
    const verfijnd =
      resultaten.filter(
        (rij) =>
          rij.persoonsId &&
          rij.persoonsId ===
            terrein.persoonsId,
      );

    if (verfijnd.length === 1) {
      return verfijnd[0];
    }

    return null;
  }

  if (terrein.persoonsId) {
    resultaten =
      referenties.filter(
        (rij) =>
          rij.persoonsId ===
          terrein.persoonsId,
      );

    if (resultaten.length === 1) {
      return resultaten[0];
    }
  }

  if (
    terrein.persoonsId &&
    terrein.inspectielocatie
  ) {
    resultaten =
      referenties.filter(
        (rij) =>
          rij.persoonsId ===
            terrein.persoonsId &&
          normaliseerWaarde(
            rij.inspectielocatie,
          ) ===
            normaliseerWaarde(
              terrein.inspectielocatie,
            ),
      );

    if (resultaten.length === 1) {
      return resultaten[0];
    }
  }

  return null;
}

function valideerReferentie(
  rij: ReferentieRij,
) {
  const fouten: string[] =
    [];

  if (!rij.datumNaFinalisatie) {
    fouten.push(
      "datum na finalisatie ontbreekt",
    );
  }

  if (!rij.plaatsbezoek) {
    fouten.push(
      "plaatsbezoek ontbreekt of is ongeldig",
    );
  }

  if (!rij.typeControle) {
    fouten.push(
      "type controle ontbreekt of is ongeldig",
    );
  }

  if (
    rij.geregistreerd === null
  ) {
    fouten.push(
      "geregistreerd ontbreekt of is ongeldig",
    );
  }

  if (
    rij.typeControle &&
    rij.typeControle !== "GEHEEL" &&
    !rij.reden
  ) {
    fouten.push(
      "reden ontbreekt",
    );
  }

  return fouten;
}

async function voorbereiden(
  formData: FormData,
) {
  const referentieWaarde =
    formData.get(
      "referentieBestand",
    );

  const referentieBestand =
    referentieWaarde instanceof File
      ? referentieWaarde
      : null;

  const terreinBestanden =
    formData
      .getAll(
        "terreinBestanden",
      )
      .filter(
        (
          waarde,
        ): waarde is File =>
          waarde instanceof File &&
          waarde.size > 0,
      );

  if (
    !referentieBestand ||
    !geldigBestand(
      referentieBestand,
      MAX_REFERENTIE_GROOTTE,
    )
  ) {
    throw new Error(
      "Selecteer een geldig .xlsx-referentiebestand van maximaal 5 MB.",
    );
  }

  if (
    terreinBestanden.length === 0
  ) {
    throw new Error(
      "Selecteer minstens één terreincontrolebestand.",
    );
  }

  if (
    terreinBestanden.length >
    MAX_BESTANDEN
  ) {
    throw new Error(
      `Selecteer maximaal ${MAX_BESTANDEN} terreincontrolebestanden per batch.`,
    );
  }

  const totaleUploadgrootte =
    referentieBestand.size +
    terreinBestanden.reduce(
      (totaal, bestand) =>
        totaal + bestand.size,
      0,
    );

  if (
    totaleUploadgrootte >
    MAX_TOTALE_UPLOADGROOTTE
  ) {
    throw new Error(
      "De totale upload mag maximaal 250 MB groot zijn.",
    );
  }

  const referentie =
    await leesReferentie(
      referentieBestand,
    );

  if (
    referentie.rijen.length === 0
  ) {
    throw new Error(
      "Het referentiebestand bevat geen bruikbare rijen.",
    );
  }

  const voorbereid: {
    terrein: TerreinBestand | null;
    referentie: ReferentieRij | null;
    resultaat: NaFinalisatieBulkRij;
  }[] = [];

  for (
    const bestand
    of terreinBestanden
  ) {
    if (
      !geldigBestand(
        bestand,
        MAX_TERREIN_GROOTTE,
      )
    ) {
      voorbereid.push({
        terrein: null,
        referentie: null,
        resultaat: {
          bestandsnaam:
            bestand.name,
          attestnummer: "",
          bronId: "",
          datumNaFinalisatie: "",
          gekoppeld: false,
          status: "MISLUKT",
          message:
            "Geen geldig .xlsx-bestand of groter dan 15 MB.",
        },
      });

      continue;
    }

    try {
      const terrein =
        await leesTerreinBestand(
          bestand,
        );

      const gekoppeld =
        zoekReferentie(
          terrein,
          referentie.rijen,
        );

      if (!gekoppeld) {
        voorbereid.push({
          terrein,
          referentie: null,
          resultaat: {
            bestandsnaam:
              bestand.name,
            attestnummer:
              terrein.attestnummer,
            bronId: "",
            datumNaFinalisatie: "",
            gekoppeld: false,
            status: "MISLUKT",
            message:
              "Geen unieke overeenkomst in het referentiebestand.",
          },
        });

        continue;
      }

      const fouten =
        valideerReferentie(
          gekoppeld,
        );

      voorbereid.push({
        terrein,
        referentie:
          gekoppeld,
        resultaat: {
          bestandsnaam:
            bestand.name,
          attestnummer:
            terrein.attestnummer,
          bronId:
            gekoppeld.bronId,
          datumNaFinalisatie:
            gekoppeld
              .datumNaFinalisatie,
          gekoppeld: true,
          status:
            fouten.length === 0
              ? "GELDIG"
              : "MISLUKT",
          message:
            fouten.length === 0
              ? `Gekoppeld aan referentierij ${gekoppeld.excelRij}.`
              : `Referentierij ${gekoppeld.excelRij}: ${fouten.join(", ")}.`,
        },
      });
    } catch (error) {
      voorbereid.push({
        terrein: null,
        referentie: null,
        resultaat: {
          bestandsnaam:
            bestand.name,
          attestnummer: "",
          bronId: "",
          datumNaFinalisatie: "",
          gekoppeld: false,
          status: "MISLUKT",
          message:
            error instanceof Error
              ? error.message
              : "Bestand kon niet worden gelezen.",
        },
      });
    }
  }

  return {
    referentie,
    voorbereid,
  };
}

function isRedirect(
  error: unknown,
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String(error.digest)
      .startsWith(
        "NEXT_REDIRECT",
      )
  );
}

export async function analyseerNaFinalisatieBatch(
  formData: FormData,
): Promise<NaFinalisatieBulkResultaat> {
  await vereisBeheerder();

  try {
    const {
      referentie,
      voorbereid,
    } =
      await voorbereiden(
        formData,
      );

    const geldig =
      voorbereid.filter(
        (item) =>
          item.resultaat
            .status ===
          "GELDIG",
      ).length;

    return {
      succes: true,
      message:
        `${geldig} van ${voorbereid.length} bestanden zijn klaar voor import.`,
      referentieWerkblad:
        referentie.werkblad,
      aantalReferentierijen:
        referentie.rijen.length,
      resultaten:
        voorbereid.map(
          (item) =>
            item.resultaat,
        ),
    };
  } catch (error) {
    return {
      succes: false,
      message:
        error instanceof Error
          ? error.message
          : "De preview kon niet worden gemaakt.",
      aantalReferentierijen: 0,
      resultaten: [],
    };
  }
}

export async function importeerNaFinalisatieBatch(
  formData: FormData,
): Promise<NaFinalisatieBulkResultaat> {
  await vereisBeheerder();

  try {
    const {
      referentie,
      voorbereid,
    } =
      await voorbereiden(
        formData,
      );

    const resultaten:
      NaFinalisatieBulkRij[] =
      [];

    for (
      const item
      of voorbereid
    ) {
      if (
        !item.terrein ||
        !item.referentie ||
        item.resultaat
          .status !== "GELDIG"
      ) {
        resultaten.push(
          item.resultaat,
        );
        continue;
      }

      const rij =
        item.referentie;

      const formulier =
        new FormData();

      formulier.set(
        "excelBestand",
        item.terrein.bestand,
      );

      if (rij.auditeur) {
        formulier.set(
          "auditeur",
          rij.auditeur,
        );
      }

      if (rij.naamAdi) {
        formulier.set(
          "naamAdi",
          rij.naamAdi,
        );
      }

      if (rij.naamBedrijf) {
        formulier.set(
          "naamBedrijf",
          rij.naamBedrijf,
        );
      }

      if (rij.persoonsId) {
        formulier.set(
          "persoonsId",
          rij.persoonsId,
        );
      }

      if (rij.inspectielocatie) {
        formulier.set(
          "inspectielocatie",
          rij.inspectielocatie,
        );
      }

      formulier.set(
        "geregistreerd",
        rij.geregistreerd
          ? "JA"
          : "NEE",
      );

      formulier.set(
        "datumNaFinalisatie",
        rij.datumNaFinalisatie,
      );

      formulier.set(
        "plaatsbezoek",
        rij.plaatsbezoek,
      );

      formulier.set(
        "typeControle",
        rij.typeControle,
      );

      formulier.set(
        "reden",
        rij.reden,
      );

      formulier.set(
        "opmerking",
        rij.opmerking,
      );

      if (rij.bronId) {
        formulier.set(
          "bronId",
          rij.bronId,
        );
      }

      let geimporteerd =
        false;

      let foutmelding = "";

      try {
        const status =
          await importeerNaFinalisatieUitExcel(
            {},
            formulier,
          );

        foutmelding =
          status.errors
            ?.excelBestand ||
          status.message ||
          "Onbekende importfout.";
      } catch (error) {
        if (isRedirect(error)) {
          geimporteerd = true;
        } else {
          console.error(
            "Bulkimport Na finalisatie mislukt:",
            error,
          );

          foutmelding =
            "Technische fout tijdens de import.";
        }
      }

      if (geimporteerd) {
        const aangemaakt =
          rij.bronId
            ? await prisma.naFinalisatie.findUnique({
                where: {
                  bronId:
                    rij.bronId,
                },
                select: {
                  id: true,
                },
              })
            : await prisma.naFinalisatie.findFirst({
                where: {
                  attestnummer:
                    item.terrein
                      .attestnummer,
                  verwijderdOp: null,
                },
                orderBy: {
                  id: "desc",
                },
                select: {
                  id: true,
                },
              });

        resultaten.push({
          ...item.resultaat,
          status:
            "GEIMPORTEERD",
          message:
            "Registratie geïmporteerd.",
          registratieId:
            aangemaakt?.id,
        });

        continue;
      }

      const klein =
        foutmelding
          .toLocaleLowerCase(
            "nl-BE",
          );

      resultaten.push({
        ...item.resultaat,
        status:
          klein.includes(
            "bestaat al",
          )
            ? "OVERGESLAGEN"
            : "MISLUKT",
        message:
          foutmelding,
      });
    }

    const geimporteerd =
      resultaten.filter(
        (rij) =>
          rij.status ===
          "GEIMPORTEERD",
      ).length;

    const overgeslagen =
      resultaten.filter(
        (rij) =>
          rij.status ===
          "OVERGESLAGEN",
      ).length;

    const mislukt =
      resultaten.filter(
        (rij) =>
          rij.status ===
          "MISLUKT",
      ).length;

    return {
      succes: true,
      message:
        `${geimporteerd} geïmporteerd, ${overgeslagen} overgeslagen en ${mislukt} mislukt.`,
      referentieWerkblad:
        referentie.werkblad,
      aantalReferentierijen:
        referentie.rijen.length,
      resultaten,
    };
  } catch (error) {
    return {
      succes: false,
      message:
        error instanceof Error
          ? error.message
          : "De import kon niet worden uitgevoerd.",
      aantalReferentierijen: 0,
      resultaten: [],
    };
  }
}

"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  haalAttestIdUitUrl,
  isGeldigUur,
  uurNaarDatabaseTijd,
  leesIsoDatum,
  normaliseerOvamId,
  normaliseerTekst,
  normaliseerTerreincontroleStatus,
  type TerreincontroleStatusWaarde,
} from "@/lib/terreincontrole";

export type TerreincontroleExcelRij = {
  sleutel: string;
  excelRij: number;

  auditeur: string;
  factuurVerzonden: boolean;
  opmerkingen: string;

  inspectielocatie: string;
  bouwjaar: string;
  vloeroppervlakteM2: string;

  datumPlaatsbezoek: string;
  uurPlaatsbezoek: string;

  ovamId: string;
  naamAdi: string;
  attestUrl: string;
  bedrijfsnaam: string;

  status:
    | TerreincontroleStatusWaarde
    | null;

  postcode: string;
  gemeente: string;
  straat: string;
  huisnummer: string;
  extraAdresDetails: string;

  perceelGemeenteCode: string;
  perceelAfdelingscode: string;
  perceelSectieCode: string;

  attestId: string;
  googleMapsUrl: string;

  waarschuwingen: string[];
};

export type TerreincontroleExcelState = {
  succes?: boolean;
  message?: string;

  errors?: {
    excelBestand?: string;
  };

  bestandsnaam?: string;
  rijen?: TerreincontroleExcelRij[];
};

export type TerreincontroleBevestigState = {
  succes?: boolean;
  message?: string;
  aantalOpgeslagen?: number;
  fouten?: string[];
};

type TeImporterenTerreincontrole = {
  excelRij: number;

  auditeur: string;
  factuurVerzonden: boolean;
  opmerkingen: string;

  inspectielocatie: string;
  bouwjaar: string;
  vloeroppervlakteM2: string;

  datumPlaatsbezoek: string;
  uurPlaatsbezoek: string;

  ovamId: string;
  naamAdi: string;
  attestUrl: string;
  bedrijfsnaam: string;

  status:
    | TerreincontroleStatusWaarde
    | null;

  postcode: string;
  gemeente: string;
  straat: string;
  huisnummer: string;
  extraAdresDetails: string;

  perceelGemeenteCode: string;
  perceelAfdelingscode: string;
  perceelSectieCode: string;

  attestId: string;
};

type GeldigeTerreincontroleImport = {
  excelRij: number;

  auditeur: string;
  factuurVerzonden: boolean;
  opmerkingen: string | null;

  inspectielocatie: string | null;
  bouwjaar: number | null;
  vloeroppervlakteM2: string | null;

  datumPlaatsbezoek: Date | null;
  uurPlaatsbezoek: Date | null;

  ovamId: string | null;
  naamAdi: string | null;
  attestUrl: string | null;
  bedrijfsnaam: string | null;

  status:
    | TerreincontroleStatusWaarde
    | null;

  postcode: string | null;
  gemeente: string | null;
  straat: string | null;
  huisnummer: string | null;
  extraAdresDetails: string | null;

  perceelGemeenteCode: string | null;
  perceelAfdelingscode: string | null;
  perceelSectieCode: string | null;

  adres: string | null;
  attestId: string;
};

const WERKBLAD_NAAM =
  "Plaatsbezoeken";

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

const MAXIMAAL_AANTAL_RIJEN =
  5000;

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TERREINCONTROLE_AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

function isGeldigeAuditeur(
  waarde: string,
): boolean {
  return TERREINCONTROLE_AUDITEURS.some(
    (auditeur) =>
      auditeur === waarde,
  );
}

function isObject(
  waarde: unknown,
): waarde is Record<
  string,
  unknown
> {
  return (
    typeof waarde === "object" &&
    waarde !== null &&
    !Array.isArray(waarde)
  );
}

function isPrismaUniekheidsfout(
  fout: unknown,
): boolean {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

function leesCelTekst(
  cel: ExcelJS.Cell,
): string {
  function maakSchoon(
    invoer: unknown,
  ): string {
    const tekst =
      normaliseerTekst(
        invoer,
      );

    const kleineLetters =
      tekst
        .trim()
        .toLocaleLowerCase(
          "nl-BE",
        );

    if (
      kleineLetters === "nan" ||
      kleineLetters === "null" ||
      kleineLetters ===
        "undefined"
    ) {
      return "";
    }

    return tekst;
  }

  const celHyperlink =
    maakSchoon(
      cel.hyperlink,
    );

  if (celHyperlink) {
    return celHyperlink;
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
    typeof waarde === "number" &&
    !Number.isFinite(waarde)
  ) {
    return "";
  }

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return maakSchoon(
      waarde,
    );
  }

  if (
    typeof waarde === "object" &&
    "hyperlink" in waarde
  ) {
    const hyperlink =
      maakSchoon(
        waarde.hyperlink,
      );

    if (hyperlink) {
      return hyperlink;
    }
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde
  ) {
    return maakSchoon(
      waarde.text,
    );
  }

  if (
    typeof waarde === "object" &&
    "result" in waarde
  ) {
    return maakSchoon(
      waarde.result,
    );
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(
      waarde.richText,
    )
  ) {
    return maakSchoon(
      waarde.richText
        .map((deel) => {
          if (
            typeof deel ===
              "object" &&
            deel !== null &&
            "text" in deel
          ) {
            return String(
              deel.text ?? "",
            );
          }

          return "";
        })
        .join(""),
    );
  }

  return maakSchoon(
    cel.text,
  );
}

function maakIsoDatum(
  jaar: number,
  maand: number,
  dag: number,
): string {
  const datum = new Date(
    Date.UTC(
      jaar,
      maand - 1,
      dag,
    ),
  );

  if (
    datum.getUTCFullYear() !==
      jaar ||
    datum.getUTCMonth() !==
      maand - 1 ||
    datum.getUTCDate() !== dag
  ) {
    return "";
  }

  return [
    String(jaar).padStart(
      4,
      "0",
    ),
    String(maand).padStart(
      2,
      "0",
    ),
    String(dag).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function leesExcelDatum(
  cel: ExcelJS.Cell,
): string {
  const waarde = cel.value;

  if (waarde instanceof Date) {
    return maakIsoDatum(
      waarde.getUTCFullYear(),
      waarde.getUTCMonth() + 1,
      waarde.getUTCDate(),
    );
  }

  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    const dagen =
      Math.floor(waarde);

    const tijdstip =
      Date.UTC(
        1899,
        11,
        30,
      ) +
      dagen *
        24 *
        60 *
        60 *
        1000;

    const datum =
      new Date(tijdstip);

    return maakIsoDatum(
      datum.getUTCFullYear(),
      datum.getUTCMonth() + 1,
      datum.getUTCDate(),
    );
  }

  const tekst =
    leesCelTekst(cel);

  if (!tekst) {
    return "";
  }

  let gevonden = tekst.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  );

  if (gevonden) {
    return maakIsoDatum(
      Number(gevonden[1]),
      Number(gevonden[2]),
      Number(gevonden[3]),
    );
  }

  gevonden = tekst.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (gevonden) {
    return maakIsoDatum(
      Number(gevonden[3]),
      Number(gevonden[2]),
      Number(gevonden[1]),
    );
  }

  return "";
}

function leesExcelUur(
  cel: ExcelJS.Cell,
): string {
  const waarde = cel.value;

  if (waarde instanceof Date) {
    const uur = String(
      waarde.getUTCHours(),
    ).padStart(2, "0");

    const minuten = String(
      waarde.getUTCMinutes(),
    ).padStart(2, "0");

    return `${uur}:${minuten}`;
  }

  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    const fractie =
      waarde -
      Math.floor(waarde);

    const totaalMinuten =
      Math.round(
        fractie * 24 * 60,
      );

    const uur = String(
      Math.floor(
        totaalMinuten / 60,
      ) % 24,
    ).padStart(2, "0");

    const minuten = String(
      totaalMinuten % 60,
    ).padStart(2, "0");

    return `${uur}:${minuten}`;
  }

  const tekst =
    leesCelTekst(cel);

  const gevonden =
    tekst.match(
      /^([01]?[0-9]|2[0-3]):([0-5][0-9])/,
    );

  if (!gevonden) {
    return "";
  }

  return `${gevonden[1].padStart(
    2,
    "0",
  )}:${gevonden[2]}`;
}

function heeftLabel(
  werkblad:
    ExcelJS.Worksheet,
  celadres: string,
  verwacht: string,
): boolean {
  return (
    leesCelTekst(
      werkblad.getCell(
        celadres,
      ),
    )
      .trim()
      .toLocaleLowerCase(
        "nl-BE",
      ) ===
    verwacht
      .trim()
      .toLocaleLowerCase(
        "nl-BE",
      )
  );
}

function leesAttestId(
  primaireWaarde: unknown,
  attestUrl: unknown,
): string {
  const primair =
    normaliseerTekst(
      primaireWaarde,
    )
      .trim()
      .toLowerCase();

  if (
    UUID_PATROON.test(
      primair,
    )
  ) {
    return primair;
  }

  const uitPrimair =
    haalAttestIdUitUrl(
      primair,
    );

  if (uitPrimair) {
    return uitPrimair.toLowerCase();
  }

  return (
    haalAttestIdUitUrl(
      normaliseerTekst(
        attestUrl,
      ),
    )?.toLowerCase() ?? ""
  );
}

function maakGoogleMapsUrl(
  inspectielocatie: string,
): string {
  const locatie =
    inspectielocatie.trim();

  if (!locatie) {
    return "";
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      locatie,
    )
  );
}

function maakAdres({
  inspectielocatie,
  straat,
  huisnummer,
  extraAdresDetails,
  postcode,
  gemeente,
}: {
  inspectielocatie: string;
  straat: string;
  huisnummer: string;
  extraAdresDetails: string;
  postcode: string;
  gemeente: string;
}): string {
  if (
    inspectielocatie.trim()
  ) {
    return inspectielocatie.trim();
  }

  const straatEnNummer = [
    straat.trim(),
    huisnummer.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const postcodeEnGemeente = [
    postcode.trim(),
    gemeente.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return [
    straatEnNummer,
    extraAdresDetails.trim(),
    postcodeEnGemeente,
  ]
    .filter(Boolean)
    .join(", ");
}

function leesBouwjaar(
  waarde: unknown,
): number | null {
  const tekst =
    normaliseerTekst(
      waarde,
    ).trim();

  if (!tekst) {
    return null;
  }

  const bouwjaar =
    Number(tekst);

  if (
    !Number.isInteger(
      bouwjaar,
    ) ||
    bouwjaar < 1000 ||
    bouwjaar > 9999
  ) {
    return null;
  }

  return bouwjaar;
}

function leesVloeroppervlakte(
  waarde: unknown,
): number | null {
  const tekst =
    normaliseerTekst(
      waarde,
    )
      .trim()
      .replace(
        /\s/g,
        "",
      )
      .replace(
        ",",
        ".",
      );

  if (!tekst) {
    return null;
  }

  const oppervlakte =
    Number(tekst);

  if (
    !Number.isFinite(
      oppervlakte,
    ) ||
    oppervlakte < 0
  ) {
    return null;
  }

  return oppervlakte;
}

export async function leesTerreincontrolesUitExcel(
  _vorigeStatus:
    TerreincontroleExcelState,
  formData: FormData,
): Promise<TerreincontroleExcelState> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");


  const bestandWaarde =
    formData.get(
      "excelBestand",
    );

  const bestand =
    bestandWaarde instanceof File
      ? bestandWaarde
      : null;

  if (
    !bestand ||
    bestand.size === 0
  ) {
    return {
      succes: false,
      message:
        "Kies een Excelbestand.",
      errors: {
        excelBestand:
          "Kies een Excelbestand.",
      },
    };
  }

  if (
    !bestand.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return {
      succes: false,
      message:
        "Alleen .xlsx-bestanden worden ondersteund.",
      errors: {
        excelBestand:
          "Kies een geldig .xlsx-bestand.",
      },
    };
  }

  if (
    bestand.size >
    MAXIMALE_BESTANDSGROOTTE
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand is te groot.",
      errors: {
        excelBestand:
          "Het Excelbestand mag maximaal 15 MB groot zijn.",
      },
    };
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    const arrayBuffer =
      await bestand.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer,
      );

    werkboek =
      new ExcelJS.Workbook();

    const excelBuffer =
      buffer as unknown as Parameters<
        typeof werkboek.xlsx.load
      >[0];

    await werkboek.xlsx.load(
      excelBuffer,
    );
  } catch (fout) {
    console.error(
      "Plaatsbezoeken Excel openen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "Het Excelbestand kon niet worden geopend.",
      errors: {
        excelBestand:
          "Controleer of dit een geldig .xlsx-bestand is.",
      },
    };
  }

  const werkblad =
    werkboek.getWorksheet(
      WERKBLAD_NAAM,
    );

  if (!werkblad) {
    return {
      succes: false,
      message:
        `Het werkblad "${WERKBLAD_NAAM}" werd niet gevonden.`,
      errors: {
        excelBestand:
          `Het Excelbestand moet het werkblad "${WERKBLAD_NAAM}" bevatten.`,
      },
    };
  }

  const verwachteKolommen: [
    string,
    string,
  ][] = [
    [
      "A1",
      "Inspectielocatie",
    ],
    [
      "B1",
      "Bouwjaar",
    ],
    [
      "C1",
      "Vloeroppervlakte (m²)",
    ],
    [
      "D1",
      "Datum plaatsbezoek",
    ],
    [
      "E1",
      "Uur plaatsbezoek",
    ],
    [
      "F1",
      "Deskundige persoonsid",
    ],
    [
      "G1",
      "Deskundige naam",
    ],
    [
      "H1",
      "Deskundige kwaliteitspagina",
    ],
    [
      "I1",
      "Naam asbestdeskundig bedrijf",
    ],
    [
      "J1",
      "Status",
    ],
    [
      "K1",
      "Postcode",
    ],
    [
      "L1",
      "Gemeente",
    ],
    [
      "M1",
      "Straat",
    ],
    [
      "N1",
      "Huisnummer",
    ],
    [
      "O1",
      "Extra adres details",
    ],
    [
      "P1",
      "Perceel gemeente code",
    ],
    [
      "Q1",
      "Perceel afdelingscode",
    ],
    [
      "R1",
      "Perceel sectie code",
    ],
    [
      "S1",
      "Liggingsadres",
    ],
  ];

  const onjuisteKolommen =
    verwachteKolommen.filter(
      ([celadres, label]) =>
        !heeftLabel(
          werkblad,
          celadres,
          label,
        ),
    );

  if (
    onjuisteKolommen.length >
    0
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand heeft niet de verwachte indeling.",
      errors: {
        excelBestand:
          `Controleer deze kolommen: ${onjuisteKolommen
            .map(
              ([celadres, label]) =>
                `${celadres} (${label})`,
            )
            .join(", ")}.`,
      },
    };
  }

  if (
    werkblad.rowCount >
    MAXIMAAL_AANTAL_RIJEN +
      1
  ) {
    return {
      succes: false,
      message:
        "Het Excelbestand bevat te veel rijen.",
      errors: {
        excelBestand:
          `Maximaal ${MAXIMAAL_AANTAL_RIJEN} plaatsbezoeken zijn toegestaan.`,
      },
    };
  }

  const rijen:
    TerreincontroleExcelRij[] =
    [];

  for (
    let rijnummer = 2;
    rijnummer <=
    werkblad.rowCount;
    rijnummer++
  ) {
    const inspectielocatie =
      leesCelTekst(
        werkblad.getCell(
          `A${rijnummer}`,
        ),
      );

    const bouwjaar =
      leesCelTekst(
        werkblad.getCell(
          `B${rijnummer}`,
        ),
      );

    const vloeroppervlakteM2 =
      leesCelTekst(
        werkblad.getCell(
          `C${rijnummer}`,
        ),
      );

    const datumPlaatsbezoek =
      leesExcelDatum(
        werkblad.getCell(
          `D${rijnummer}`,
        ),
      );

    const uurPlaatsbezoek =
      leesExcelUur(
        werkblad.getCell(
          `E${rijnummer}`,
        ),
      );

    const ovamId =
      normaliseerOvamId(
        leesCelTekst(
          werkblad.getCell(
            `F${rijnummer}`,
          ),
        ),
      );

    const naamAdi =
      leesCelTekst(
        werkblad.getCell(
          `G${rijnummer}`,
        ),
      );

    const attestUrl =
      leesCelTekst(
        werkblad.getCell(
          `H${rijnummer}`,
        ),
      );

    const bedrijfsnaam =
      leesCelTekst(
        werkblad.getCell(
          `I${rijnummer}`,
        ),
      );

    const statusTekst =
      leesCelTekst(
        werkblad.getCell(
          `J${rijnummer}`,
        ),
      );

    const postcode =
      leesCelTekst(
        werkblad.getCell(
          `K${rijnummer}`,
        ),
      );

    const gemeente =
      leesCelTekst(
        werkblad.getCell(
          `L${rijnummer}`,
        ),
      );

    const straat =
      leesCelTekst(
        werkblad.getCell(
          `M${rijnummer}`,
        ),
      );

    const huisnummer =
      leesCelTekst(
        werkblad.getCell(
          `N${rijnummer}`,
        ),
      );

    const extraAdresDetails =
      leesCelTekst(
        werkblad.getCell(
          `O${rijnummer}`,
        ),
      );

    const perceelGemeenteCode =
      leesCelTekst(
        werkblad.getCell(
          `P${rijnummer}`,
        ),
      );

    const perceelAfdelingscode =
      leesCelTekst(
        werkblad.getCell(
          `Q${rijnummer}`,
        ),
      );

    const perceelSectieCode =
      leesCelTekst(
        werkblad.getCell(
          `R${rijnummer}`,
        ),
      );

    const liggingsadresAttestId =
      leesCelTekst(
        werkblad.getCell(
          `S${rijnummer}`,
        ),
      );

    const alleWaarden = [
      inspectielocatie,
      bouwjaar,
      vloeroppervlakteM2,
      datumPlaatsbezoek,
      uurPlaatsbezoek,
      ovamId,
      naamAdi,
      attestUrl,
      bedrijfsnaam,
      statusTekst,
      postcode,
      gemeente,
      straat,
      huisnummer,
      extraAdresDetails,
      perceelGemeenteCode,
      perceelAfdelingscode,
      perceelSectieCode,
      liggingsadresAttestId,
    ];

    if (
      alleWaarden.every(
        (waarde) => !waarde,
      )
    ) {
      continue;
    }

    const genormaliseerdeStatus =
      normaliseerTerreincontroleStatus(
        statusTekst,
      );

    const status =
      statusTekst &&
      genormaliseerdeStatus !==
        undefined
        ? genormaliseerdeStatus
        : null;

    const attestId =
      leesAttestId(
        liggingsadresAttestId,
        attestUrl,
      );

    const waarschuwingen:
      string[] = [];

    if (!attestId) {
      waarschuwingen.push(
        "Geen geldig Attest-ID gevonden in Liggingsadres attest-id of Deskundige kwaliteitspagina.",
      );
    }

    if (
      statusTekst &&
      genormaliseerdeStatus ===
        undefined
    ) {
      waarschuwingen.push(
        `Onbekende status "${statusTekst}".`,
      );
    }

    if (
      datumPlaatsbezoek ===
        "" &&
      leesCelTekst(
        werkblad.getCell(
          `D${rijnummer}`,
        ),
      )
    ) {
      waarschuwingen.push(
        "Datum plaatsbezoek kon niet worden gelezen.",
      );
    }

    if (
      uurPlaatsbezoek ===
        "" &&
      leesCelTekst(
        werkblad.getCell(
          `E${rijnummer}`,
        ),
      )
    ) {
      waarschuwingen.push(
        "Uur plaatsbezoek kon niet worden gelezen.",
      );
    }

    rijen.push({
      sleutel:
        `${bestand.name}-${rijnummer}`,

      excelRij:
        rijnummer,

      auditeur: "",
      factuurVerzonden: false,
      opmerkingen: "",

      inspectielocatie,
      bouwjaar,
      vloeroppervlakteM2,

      datumPlaatsbezoek,
      uurPlaatsbezoek,

      ovamId,
      naamAdi,
      attestUrl,
      bedrijfsnaam,

      status,

      postcode,
      gemeente,
      straat,
      huisnummer,
      extraAdresDetails,

      perceelGemeenteCode,
      perceelAfdelingscode,
      perceelSectieCode,

      attestId,

      googleMapsUrl:
        maakGoogleMapsUrl(
          inspectielocatie,
        ),

      waarschuwingen,
    });
  }

  if (rijen.length === 0) {
    return {
      succes: false,
      message:
        "Er werden geen plaatsbezoeken gevonden.",
      errors: {
        excelBestand:
          "Het werkblad bevat geen gegevensrijen.",
      },
    };
  }

  return {
    succes: true,
    message:
      `${rijen.length} plaatsbezoek(en) gevonden.`,
    bestandsnaam:
      bestand.name,
    rijen,
  };
}

export async function bevestigTerreincontrolesUitExcel(
  _vorigeStatus:
    TerreincontroleBevestigState,
  formData: FormData,
): Promise<TerreincontroleBevestigState> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");


  const importGegevens =
    normaliseerTekst(
      formData.get(
        "importGegevens",
      ),
    );

  if (!importGegevens) {
    return {
      succes: false,
      message:
        "Er werden geen geselecteerde rijen ontvangen.",
    };
  }

  if (
    importGegevens.length >
    10 * 1024 * 1024
  ) {
    return {
      succes: false,
      message:
        "De geselecteerde importgegevens zijn te groot.",
    };
  }

  let ontvangenGegevens:
    unknown;

  try {
    ontvangenGegevens =
      JSON.parse(
        importGegevens,
      );
  } catch {
    return {
      succes: false,
      message:
        "De geselecteerde importgegevens zijn ongeldig.",
    };
  }

  if (
    !isObject(
      ontvangenGegevens,
    ) ||
    !Array.isArray(
      ontvangenGegevens.rijen,
    )
  ) {
    return {
      succes: false,
      message:
        "De geselecteerde importgegevens hebben niet de verwachte indeling.",
    };
  }

  const bestandsnaam =
    normaliseerTekst(
      ontvangenGegevens
        .bestandsnaam,
    );

  const ontvangenRijen =
    ontvangenGegevens.rijen;

  if (
    ontvangenRijen.length === 0
  ) {
    return {
      succes: false,
      message:
        "Selecteer minstens één rij.",
    };
  }

  if (
    ontvangenRijen.length >
    MAXIMAAL_AANTAL_RIJEN
  ) {
    return {
      succes: false,
      message:
        `Je kunt maximaal ${MAXIMAAL_AANTAL_RIJEN} rijen tegelijk importeren.`,
    };
  }

  const fouten: string[] = [];

  const geldigeRijen:
    GeldigeTerreincontroleImport[] =
    [];

  for (
    let index = 0;
    index <
    ontvangenRijen.length;
    index++
  ) {
    const ontvangenRij =
      ontvangenRijen[index];

    if (
      !isObject(
        ontvangenRij,
      )
    ) {
      fouten.push(
        `Importitem ${index + 1} is ongeldig.`,
      );

      continue;
    }

    const rij =
      ontvangenRij as unknown as
        TeImporterenTerreincontrole;

    const excelRij =
      Number(
        rij.excelRij,
      );

    const rijLabel =
      Number.isInteger(
        excelRij,
      )
        ? `Excelrij ${excelRij}`
        : `Importitem ${index + 1}`;

    const auditeur =
      normaliseerTekst(
        rij.auditeur,
      );

    const factuurVerzonden =
      rij.factuurVerzonden ===
      true;

    const opmerkingen =
      normaliseerTekst(
        rij.opmerkingen,
      );

    const inspectielocatie =
      normaliseerTekst(
        rij.inspectielocatie,
      );

    const bouwjaarTekst =
      normaliseerTekst(
        rij.bouwjaar,
      );

    const bouwjaar =
      leesBouwjaar(
        bouwjaarTekst,
      );

    const vloeroppervlakteTekst =
      normaliseerTekst(
        rij.vloeroppervlakteM2,
      );

    const vloeroppervlakteM2 =
      leesVloeroppervlakte(
        vloeroppervlakteTekst,
      );

    const datumTekst =
      normaliseerTekst(
        rij.datumPlaatsbezoek,
      );

    const datumPlaatsbezoek =
      datumTekst
        ? leesIsoDatum(
            datumTekst,
          )
        : null;

    const uurTekst =
      normaliseerTekst(
        rij.uurPlaatsbezoek,
      );

    const uurPlaatsbezoek =
      uurTekst || null;

    const ovamId =
      normaliseerOvamId(
        rij.ovamId,
      );

    const naamAdi =
      normaliseerTekst(
        rij.naamAdi,
      );

    const attestUrl =
      normaliseerTekst(
        rij.attestUrl,
      );

    const bedrijfsnaam =
      normaliseerTekst(
        rij.bedrijfsnaam,
      );

    const statusWaarde =
      rij.status;

    const status =
      statusWaarde
        ? normaliseerTerreincontroleStatus(
            statusWaarde,
          )
        : null;

    const postcode =
      normaliseerTekst(
        rij.postcode,
      );

    const gemeente =
      normaliseerTekst(
        rij.gemeente,
      );

    const straat =
      normaliseerTekst(
        rij.straat,
      );

    const huisnummer =
      normaliseerTekst(
        rij.huisnummer,
      );

    const extraAdresDetails =
      normaliseerTekst(
        rij.extraAdresDetails,
      );

    const perceelGemeenteCode =
      normaliseerTekst(
        rij.perceelGemeenteCode,
      );

    const perceelAfdelingscode =
      normaliseerTekst(
        rij.perceelAfdelingscode,
      );

    const perceelSectieCode =
      normaliseerTekst(
        rij.perceelSectieCode,
      );

    const attestId =
      leesAttestId(
        rij.attestId,
        attestUrl,
      );

    const rijFouten:
      string[] = [];

    if (
      !Number.isInteger(
        excelRij,
      ) ||
      excelRij < 2
    ) {
      rijFouten.push(
        "ongeldig Excel-rijnummer",
      );
    }

    if (
      !isGeldigeAuditeur(
        auditeur,
      )
    ) {
      rijFouten.push(
        "kies een geldige auditeur",
      );
    }

    if (
      opmerkingen.length >
      5000
    ) {
      rijFouten.push(
        "opmerkingen zijn langer dan 5000 tekens",
      );
    }

    if (
      inspectielocatie.length >
      1000
    ) {
      rijFouten.push(
        "inspectielocatie is te lang",
      );
    }

    if (
      bouwjaarTekst &&
      bouwjaar === null
    ) {
      rijFouten.push(
        "bouwjaar is ongeldig",
      );
    }

    if (
      vloeroppervlakteTekst &&
      vloeroppervlakteM2 ===
        null
    ) {
      rijFouten.push(
        "vloeroppervlakte is ongeldig",
      );
    }

    if (
      datumTekst &&
      !datumPlaatsbezoek
    ) {
      rijFouten.push(
        "datum plaatsbezoek is ongeldig",
      );
    }

    if (
      uurTekst &&
      !isGeldigUur(
        uurTekst,
      )
    ) {
      rijFouten.push(
        "uur plaatsbezoek is ongeldig",
      );
    }

    if (
      statusWaarde &&
      status === undefined
    ) {
      rijFouten.push(
        "status is ongeldig",
      );
    }

    if (
      attestUrl.length >
      2000
    ) {
      rijFouten.push(
        "Deskundige kwaliteitspagina is te lang",
      );
    }

    if (!attestId) {
      rijFouten.push(
        "geen geldig Attest-ID gevonden",
      );
    }

    if (
      ovamId.length > 100
    ) {
      rijFouten.push(
        "Deskundige persoonsid is te lang",
      );
    }

    if (
      naamAdi.length > 255
    ) {
      rijFouten.push(
        "Deskundige naam is te lang",
      );
    }

    if (
      bedrijfsnaam.length >
      255
    ) {
      rijFouten.push(
        "bedrijfsnaam is te lang",
      );
    }

    if (
      postcode.length > 20
    ) {
      rijFouten.push(
        "postcode is te lang",
      );
    }

    if (
      gemeente.length > 255 ||
      straat.length > 255
    ) {
      rijFouten.push(
        "gemeente of straat is te lang",
      );
    }

    if (
      huisnummer.length > 50
    ) {
      rijFouten.push(
        "huisnummer is te lang",
      );
    }

    if (
      extraAdresDetails.length >
      500
    ) {
      rijFouten.push(
        "extra adresdetails zijn te lang",
      );
    }

    if (
      rijFouten.length > 0
    ) {
      fouten.push(
        `${rijLabel}: ${rijFouten.join(
          ", ",
        )}.`,
      );

      continue;
    }

    const adres =
      maakAdres({
        inspectielocatie,
        straat,
        huisnummer,
        extraAdresDetails,
        postcode,
        gemeente,
      });

    geldigeRijen.push({
      excelRij,

      auditeur,
      factuurVerzonden,
      opmerkingen:
        opmerkingen || null,

      inspectielocatie:
        inspectielocatie ||
        null,
      bouwjaar,
      vloeroppervlakteM2:
        vloeroppervlakteTekst
          ? vloeroppervlakteTekst
              .replace(",", ".")
          : null,

      datumPlaatsbezoek,
      uurPlaatsbezoek:
        uurTekst
          ? uurNaarDatabaseTijd(
              uurTekst,
            )
          : null,

      ovamId:
        ovamId || null,
      naamAdi:
        naamAdi || null,
      attestUrl:
        attestUrl || null,
      bedrijfsnaam:
        bedrijfsnaam || null,

      status:
        status === undefined
          ? null
          : status,

      postcode:
        postcode || null,
      gemeente:
        gemeente || null,
      straat:
        straat || null,
      huisnummer:
        huisnummer || null,
      extraAdresDetails:
        extraAdresDetails ||
        null,

      perceelGemeenteCode:
        perceelGemeenteCode ||
        null,
      perceelAfdelingscode:
        perceelAfdelingscode ||
        null,
      perceelSectieCode:
        perceelSectieCode ||
        null,

      adres:
        adres || null,

      attestId,
    });
  }

  if (fouten.length > 0) {
    return {
      succes: false,
      message:
        `${fouten.length} geselecteerde rij(en) bevatten fouten. Er werd niets opgeslagen.`,
      fouten: fouten.slice(
        0,
        100,
      ),
    };
  }

  const attestIds =
    geldigeRijen.map(
      (rij) =>
        rij.attestId,
    );

  if (
    new Set(attestIds).size !==
    attestIds.length
  ) {
    return {
      succes: false,
      message:
        "De selectie bevat dubbele Attest-ID's. Er werd niets opgeslagen.",
    };
  }

  const bestaandeTerreincontroles =
    await prisma.terreincontrole.findMany({
      where: {
        attestId: {
          in: attestIds,
        },
      },

      select: {
        id: true,
        attestId: true,
      },
    });

  if (
    bestaandeTerreincontroles.length >
    0
  ) {
    return {
      succes: false,
      message:
        "Eén of meerdere Attest-ID's bestaan al. Er werd niets opgeslagen.",

      fouten:
        bestaandeTerreincontroles.map(
          (terreincontrole) =>
            `Attest-ID ${terreincontrole.attestId} bestaat al bij terreincontrole ${terreincontrole.id}.`,
        ),
    };
  }

  try {
    await prisma.$transaction(
      async (transactie) => {
        for (
          const rij of
          geldigeRijen
        ) {
          await transactie.terreincontrole.create({
            data: {
              auditeur:
                rij.auditeur,

              factuurVerzonden:
                rij.factuurVerzonden,

              status:
                rij.status,

              inspectielocatie:
                rij.inspectielocatie,

              bouwjaar:
                rij.bouwjaar,

              vloeroppervlakteM2:
                rij.vloeroppervlakteM2,

              datumPlaatsbezoek:
                rij.datumPlaatsbezoek,

              uurPlaatsbezoek:
                rij.uurPlaatsbezoek,

              ovamId:
                rij.ovamId,

              naamAdi:
                rij.naamAdi,

              attestUrl:
                rij.attestUrl,

              bedrijfsnaam:
                rij.bedrijfsnaam,

              postcode:
                rij.postcode,

              gemeente:
                rij.gemeente,

              straat:
                rij.straat,

              huisnummer:
                rij.huisnummer,

              extraAdresDetails:
                rij.extraAdresDetails,

              perceelGemeenteCode:
                rij.perceelGemeenteCode,

              perceelAfdelingscode:
                rij.perceelAfdelingscode,

              perceelSectieCode:
                rij.perceelSectieCode,

              adres:
                rij.adres,

              opmerkingen:
                rij.opmerkingen,

              attestId:
                rij.attestId,

              bronBestandsnaam:
                bestandsnaam ||
                null,

              bronExcelRij:
                rij.excelRij,
            },
          });
        }
      },
    );
  } catch (fout) {
    if (
      isPrismaUniekheidsfout(
        fout,
      )
    ) {
      return {
        succes: false,
        message:
          "Eén van de Attest-ID's bestaat al. Er werd niets opgeslagen.",
      };
    }

    console.error(
      "Import terreincontroles opslaan mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "Er is een technische fout opgetreden. Er werd niets opgeslagen.",
    };
  }

  revalidatePath("/");
  revalidatePath(
    "/terreincontroles-inplannen",
  );

  return {
    succes: true,
    message:
      `${geldigeRijen.length} terreincontrole(s) werden opgeslagen.`,
    aantalOpgeslagen:
      geldigeRijen.length,
  };
}

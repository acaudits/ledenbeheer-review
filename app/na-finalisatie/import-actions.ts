"use server";

import ExcelJS from "exceljs";
import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";

import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  normaliseerOndernemingsnummer,
} from "@/lib/ondernemingsnummer";
import {
  prisma,
} from "@/lib/prisma";
import {
  haalAttestIdUitUrl,
} from "@/lib/terreincontrole";

export type NaFinalisatieImportState = {
  succes?: boolean;
  message?: string;
  errors?: {
    excelBestand?: string;
  };
};

type Plaatsbezoek =
  | "SPONTAAN"
  | "TELEFONISCHE_AFSPRAAK"
  | "EMAILAFSPRAAK"
  | "KLACHT";

type TypeControle =
  | "GEHEEL"
  | "DEELS"
  | "ENKEL_OPENBARE_WEG";

const WERKBLAD_NAAM =
  "Terreincontrole samenvatting";

const MAXIMALE_BESTANDSGROOTTE =
  15 * 1024 * 1024;

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fout(
  message: string,
  excelBestand?: string,
): NaFinalisatieImportState {
  return {
    succes: false,
    message,
    errors: excelBestand
      ? {
          excelBestand,
        }
      : undefined,
  };
}

function leesFormulierTekst(
  formData: FormData,
  naam: string,
) {
  const waarde =
    formData.get(naam);

  return typeof waarde ===
    "string"
    ? waarde.trim()
    : "";
}

function normaliseerTekst(
  waarde: unknown,
) {
  const tekst =
    String(
      waarde ?? "",
    ).trim();

  const klein =
    tekst.toLocaleLowerCase(
      "nl-BE",
    );

  if (
    !tekst ||
    klein === "nan" ||
    klein === "nat" ||
    klein === "null"
  ) {
    return "";
  }

  return tekst;
}

function leesCelTekst(
  cel: ExcelJS.Cell,
) {
  const waarde =
    cel.value;

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
    return normaliseerTekst(
      waarde,
    );
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(
      waarde.richText,
    )
  ) {
    return normaliseerTekst(
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

  if (
    typeof waarde === "object" &&
    "result" in waarde
  ) {
    return normaliseerTekst(
      waarde.result,
    );
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde
  ) {
    return normaliseerTekst(
      waarde.text,
    );
  }

  return normaliseerTekst(
    cel.text,
  );
}

function leesHyperlink(
  cel: ExcelJS.Cell,
) {
  if (
    typeof cel.hyperlink ===
      "string" &&
    cel.hyperlink.trim()
  ) {
    return cel.hyperlink.trim();
  }

  const waarde =
    cel.value;

  if (
    typeof waarde === "object" &&
    waarde !== null &&
    "hyperlink" in waarde &&
    typeof waarde.hyperlink ===
      "string"
  ) {
    return waarde.hyperlink.trim();
  }

  const tekst =
    leesCelTekst(cel);

  return (
    tekst.startsWith(
      "https://",
    ) ||
    tekst.startsWith(
      "http://",
    )
      ? tekst
      : ""
  );
}

function leesOndernemingsnummer(
  cel: ExcelJS.Cell,
) {
  if (
    typeof cel.value ===
      "number" &&
    Number.isFinite(
      cel.value,
    )
  ) {
    let tekst =
      String(
        Math.trunc(
          cel.value,
        ),
      );

    const aantalNullen =
      typeof cel.numFmt ===
      "string"
        ? (
            cel.numFmt.match(
              /0/g,
            ) ?? []
          ).length
        : 0;

    if (
      aantalNullen === 9 ||
      aantalNullen === 10
    ) {
      tekst =
        tekst.padStart(
          aantalNullen,
          "0",
        );
    }

    return normaliseerOndernemingsnummer(
      tekst,
    );
  }

  return normaliseerOndernemingsnummer(
    leesCelTekst(cel),
  );
}

function heeftLabel(
  cel: ExcelJS.Cell,
  verwacht: string,
) {
  return leesCelTekst(cel)
    .toLocaleLowerCase(
      "nl-BE",
    )
    .includes(
      verwacht.toLocaleLowerCase(
        "nl-BE",
      ),
    );
}

function leesDatum(
  waarde: string,
) {
  const gevonden =
    waarde.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!gevonden) {
    return null;
  }

  const jaar =
    Number(gevonden[1]);

  const maand =
    Number(gevonden[2]);

  const dag =
    Number(gevonden[3]);

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

function leesPlaatsbezoek(
  waarde: string,
): Plaatsbezoek | null {
  if (
    waarde === "SPONTAAN" ||
    waarde ===
      "TELEFONISCHE_AFSPRAAK" ||
    waarde ===
      "EMAILAFSPRAAK" ||
    waarde === "KLACHT"
  ) {
    return waarde;
  }

  return null;
}

function leesTypeControle(
  waarde: string,
): TypeControle | null {
  if (
    waarde === "GEHEEL" ||
    waarde === "DEELS" ||
    waarde ===
      "ENKEL_OPENBARE_WEG"
  ) {
    return waarde;
  }

  return null;
}

export async function importeerNaFinalisatieUitExcel(
  _vorigeStatus:
    NaFinalisatieImportState,
  formData: FormData,
): Promise<NaFinalisatieImportState> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const geregistreerdTekst =
    leesFormulierTekst(
      formData,
      "geregistreerd",
    );

  const geregistreerd =
    geregistreerdTekst ===
    "JA"
      ? true
      : geregistreerdTekst ===
          "NEE"
        ? false
        : null;

  const datumNaFinalisatie =
    leesDatum(
      leesFormulierTekst(
        formData,
        "datumNaFinalisatie",
      ),
    );

  const plaatsbezoek =
    leesPlaatsbezoek(
      leesFormulierTekst(
        formData,
        "plaatsbezoek",
      ),
    );

  const typeControle =
    leesTypeControle(
      leesFormulierTekst(
        formData,
        "typeControle",
      ),
    );

  const reden =
    leesFormulierTekst(
      formData,
      "reden",
    ) || null;

  const opmerking =
    leesFormulierTekst(
      formData,
      "opmerking",
    );

  const auditeurReferentie =
    leesFormulierTekst(
      formData,
      "auditeur",
    );

  const naamAdiReferentie =
    leesFormulierTekst(
      formData,
      "naamAdi",
    );

  const naamBedrijfReferentie =
    leesFormulierTekst(
      formData,
      "naamBedrijf",
    );

  const persoonsIdReferentie =
    leesFormulierTekst(
      formData,
      "persoonsId",
    ).toUpperCase();

  const inspectielocatieReferentie =
    leesFormulierTekst(
      formData,
      "inspectielocatie",
    );

  const bronId =
    leesFormulierTekst(
      formData,
      "bronId",
    ) || null;

  if (
    geregistreerd === null
  ) {
    return fout(
      "Selecteer bij Geregistreerd Ja of Nee.",
    );
  }

  if (!datumNaFinalisatie) {
    return fout(
      "Datum na finalisatie is verplicht.",
    );
  }

  if (!plaatsbezoek) {
    return fout(
      "Selecteer een geldig plaatsbezoek.",
    );
  }

  if (!typeControle) {
    return fout(
      "Selecteer een geldig type controle.",
    );
  }

  if (
    typeControle !== "GEHEEL" &&
    !reden
  ) {
    return fout(
      "Reden is verplicht bij Deels en Enkel van openbare weg.",
    );
  }

  if (
    opmerking.length > 5000 ||
    (reden &&
      reden.length > 5000)
  ) {
    return fout(
      "Reden en opmerking mogen maximaal 5000 tekens bevatten.",
    );
  }

  if (
    bronId &&
    bronId.length > 255
  ) {
    return fout(
      "Het bron-ID mag maximaal 255 tekens bevatten.",
    );
  }

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
    return fout(
      "Kies een Excelbestand.",
      "Excelbestand is verplicht.",
    );
  }

  if (
    !bestand.name
      .toLowerCase()
      .endsWith(".xlsx")
  ) {
    return fout(
      "Alleen .xlsx-bestanden worden ondersteund.",
      "Kies een geldig .xlsx-bestand.",
    );
  }

  if (
    bestand.size >
    MAXIMALE_BESTANDSGROOTTE
  ) {
    return fout(
      "Het Excelbestand is groter dan 15 MB.",
      "Kies een kleiner bestand.",
    );
  }

  let werkboek:
    ExcelJS.Workbook;

  try {
    const buffer =
      Buffer.from(
        await bestand.arrayBuffer(),
      );

    werkboek =
      new ExcelJS.Workbook();

    await werkboek.xlsx.load(
      buffer as unknown as Parameters<
        typeof werkboek.xlsx.load
      >[0],
    );
  } catch (error) {
    console.error(
      "Na finalisatie Excel openen mislukt:",
      error,
    );

    return fout(
      "Het Excelbestand kon niet worden geopend.",
      "Controleer of het bestand geldig en niet beschadigd is.",
    );
  }

  const werkblad =
    werkboek.getWorksheet(
      WERKBLAD_NAAM,
    );

  if (!werkblad) {
    return fout(
      `Het werkblad "${WERKBLAD_NAAM}" werd niet gevonden.`,
      `Hernoem het juiste tabblad exact naar "${WERKBLAD_NAAM}".`,
    );
  }

  const indelingGeldig =
    heeftLabel(
      werkblad.getCell("A4"),
      "Attestnummer",
    ) &&
    heeftLabel(
      werkblad.getCell("A6"),
      "Inspectielocatie",
    ) &&
    heeftLabel(
      werkblad.getCell("B6"),
      "PersoonsID",
    ) &&
    heeftLabel(
      werkblad.getCell("C6"),
      "Ondernemingsnummer",
    ) &&
    heeftLabel(
      werkblad.getCell("D13"),
      "Gecontroleerd op",
    );

  if (!indelingGeldig) {
    return fout(
      "Het Excelbestand heeft niet de verwachte indeling.",
      `Gebruik een geldige export van "${WERKBLAD_NAAM}".`,
    );
  }

  const attestnummer =
    leesCelTekst(
      werkblad.getCell("A5"),
    ).toUpperCase();

  const inspectielocatie =
    inspectielocatieReferentie ||
    leesCelTekst(
      werkblad.getCell("A7"),
    ) ||
    null;

  const persoonsId =
    persoonsIdReferentie ||
    leesCelTekst(
      werkblad.getCell("B7"),
    ).toUpperCase();

  const ondernemingsnummer =
    leesOndernemingsnummer(
      werkblad.getCell("C7"),
    );

  const linkAttest =
    leesHyperlink(
      werkblad.getCell("A8"),
    );

  const auditeur =
    auditeurReferentie ||
    leesCelTekst(
      werkblad.getCell("G13"),
    );

  const attestId =
    haalAttestIdUitUrl(
      linkAttest,
    );

  if (!attestnummer) {
    return fout(
      "Attestnummer ontbreekt.",
      "Cel A5 bevat geen attestnummer.",
    );
  }

  if (!inspectielocatie) {
    return fout(
      "Inspectielocatie ontbreekt.",
      "Cel A7 bevat geen inspectielocatie.",
    );
  }

  if (
    !linkAttest ||
    !attestId ||
    !UUID_PATROON.test(attestId)
  ) {
    return fout(
      "De attestlink is niet geldig.",
      "Cel A8 moet een geldige OVAM-attestlink bevatten.",
    );
  }

  if (!auditeur) {
    return fout(
      "Auditeur ontbreekt.",
      "Vul de kolom Auditeur in het referentiebestand in.",
    );
  }

  const [
    lid,
    procescertificaten,
  ] = await Promise.all([
    persoonsId
      ? prisma.lid.findFirst({
          where: {
            ovamId: {
              equals:
                persoonsId,
              mode:
                "insensitive",
            },
            verwijderdOp: null,
          },
          select: {
            naamPersoon: true,
            ovamId: true,
          },
        })
      : Promise.resolve(null),

    ondernemingsnummer
      ? prisma.procescertificaat.findMany({
          where: {
            verwijderdOp: null,
          },
          select: {
            naamBedrijf: true,
            kboNummer: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const genormaliseerdNummer =
    ondernemingsnummer
      ? normaliseerOndernemingsnummer(
          ondernemingsnummer,
        )
      : "";

  const overeenkomendeProcessen =
    genormaliseerdNummer
      ? procescertificaten.filter(
          (procescertificaat) =>
            normaliseerOndernemingsnummer(
              procescertificaat.kboNummer,
            ) ===
            genormaliseerdNummer,
        )
      : [];

  const procescertificaat =
    overeenkomendeProcessen.length ===
    1
      ? overeenkomendeProcessen[0]
      : null;

  const naamAdi =
    naamAdiReferentie ||
    lid?.naamPersoon ||
    null;

  const naamBedrijf =
    naamBedrijfReferentie ||
    procescertificaat?.naamBedrijf ||
    null;

  const opgeslagenPersoonsId =
    lid?.ovamId ||
    persoonsId ||
    null;

  const duplicaat =
    await prisma.naFinalisatie.findFirst({
      where: {
        verwijderdOp: null,
        OR: [
          ...(bronId
            ? [
                {
                  bronId,
                },
              ]
            : []),
          {
            attestId:
              attestId.toLowerCase(),
            datumNaFinalisatie,
            plaatsbezoek,
            typeControle,
          },
        ],
      },
      select: {
        id: true,
      },
    });

  if (duplicaat) {
    return fout(
      "Deze registratie bestaat al.",
      "Voor dit attest bestaat al een actieve registratie met dezelfde datum, hetzelfde plaatsbezoek en hetzelfde type controle.",
    );
  }

  let nieuwId: number;

  try {
    const registratie =
      await prisma.naFinalisatie.create({
        data: {
          auditeur,
          naamAdi,
          geregistreerd,
          linkAttest,
          attestnummer,
          attestId:
            attestId.toLowerCase(),
          datumNaFinalisatie,
          plaatsbezoek,
          typeControle,
          reden,
          opmerking,
          inspectielocatie,
          naamBedrijf,
          persoonsId:
            opgeslagenPersoonsId,
          bronId,
          bronBestandsnaam:
            bestand.name,
        },
        select: {
          id: true,
        },
      });

    nieuwId =
      registratie.id;
  } catch (error) {
    console.error(
      "Na finalisatie Excel-import mislukt:",
      error,
    );

    return fout(
      "De registratie kon niet worden opgeslagen.",
      "Er is een technische fout opgetreden.",
    );
  }

  revalidatePath(
    "/na-finalisatie",
  );

  revalidatePath(
    "/mijn-overzicht",
  );

  revalidatePath(
    "/persoonscertificaten",
  );

  revalidatePath(
    `/na-finalisatie/${nieuwId}`,
  );

  redirect(
    `/na-finalisatie/${nieuwId}?geimporteerd=1`,
  );
}

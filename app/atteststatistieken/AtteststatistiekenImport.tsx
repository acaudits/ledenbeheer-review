"use client";

import type ExcelJSType from "exceljs";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { BEHEER_KNOP_KLASSEN } from "@/components/BeheerOverzichtHeader";

import {
  importeerVoorverwerkteAtteststatistieken,
  type ImportStatus,
  type VoorverwerkteAttestimport,
} from "./actions";

const MAXIMALE_BESTANDSGROOTTE = 15 * 1024 * 1024;
const MAXIMAAL_AANTAL_RIJEN = 200_000;

type Verwerkingsfase =
  "wachten" | "openen" | "verwerken" | "klaar" | "importeren";

function normaliseerTekst(waarde: unknown) {
  if (waarde === null || waarde === undefined) {
    return "";
  }

  return String(waarde)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseerPersoonsId(waarde: unknown) {
  return normaliseerTekst(waarde).toUpperCase();
}

function normaliseerBedrijfsnaamSleutel(waarde: unknown) {
  return normaliseerTekst(waarde).toLocaleLowerCase("nl-BE");
}

function leesCelTekst(cel: ExcelJSType.Cell) {
  const waarde = cel.value;

  if (waarde === null || waarde === undefined) {
    return "";
  }

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return normaliseerTekst(waarde);
  }

  if (waarde instanceof Date) {
    return waarde.toISOString();
  }

  if (
    typeof waarde === "object" &&
    "text" in waarde &&
    typeof waarde.text === "string"
  ) {
    return normaliseerTekst(waarde.text);
  }

  if (typeof waarde === "object" && "result" in waarde) {
    return normaliseerTekst(waarde.result);
  }

  if (
    typeof waarde === "object" &&
    "richText" in waarde &&
    Array.isArray(waarde.richText)
  ) {
    return normaliseerTekst(
      waarde.richText
        .map((deel) => {
          if (typeof deel === "object" && deel !== null && "text" in deel) {
            return normaliseerTekst(deel.text);
          }

          return "";
        })
        .join(""),
    );
  }

  return normaliseerTekst(cel.text);
}

function maakHeaderSleutel(waarde: string) {
  return waarde.toLocaleLowerCase("nl-BE").replace(/[\s_\-]+/g, "");
}

function kolomnummerNaarLetters(kolomnummer: number) {
  let resultaat = "";
  let nummer = kolomnummer;

  while (nummer > 0) {
    const rest = (nummer - 1) % 26;
    resultaat = String.fromCharCode(65 + rest) + resultaat;
    nummer = Math.floor((nummer - 1) / 26);
  }

  return resultaat;
}

function kolomlettersNaarNummer(letters: string) {
  return letters
    .toUpperCase()
    .split("")
    .reduce((totaal, letter) => totaal * 26 + letter.charCodeAt(0) - 64, 0);
}

function voegOntbrekendeWerkbladAdressenToe(xml: string) {
  let laatsteRijNummer = 0;

  return xml.replace(
    /<row\b([^>]*)>([\s\S]*?)<\/row>/g,
    (_volledigeRij, rijAttributen: string, rijInhoud: string) => {
      const bestaandRijNummer = rijAttributen.match(/\br\s*=\s*["'](\d+)["']/i);

      const rijNummer = bestaandRijNummer
        ? Number(bestaandRijNummer[1])
        : laatsteRijNummer + 1;

      laatsteRijNummer = Math.max(laatsteRijNummer, rijNummer);

      let laatsteKolomNummer = 0;

      const aangepasteRijInhoud = rijInhoud.replace(
        /<c\b([^>]*)>/g,
        (_volledigeCel, celAttributen: string) => {
          const bestaandAdres = celAttributen.match(
            /\br\s*=\s*["']([A-Z]+)(\d+)["']/i,
          );

          if (bestaandAdres) {
            laatsteKolomNummer = Math.max(
              laatsteKolomNummer,
              kolomlettersNaarNummer(bestaandAdres[1]),
            );

            return `<c${celAttributen}>`;
          }

          laatsteKolomNummer += 1;

          const adres =
            `${kolomnummerNaarLetters(laatsteKolomNummer)}` + `${rijNummer}`;

          return `<c${celAttributen} r="${adres}">`;
        },
      );

      const aangepasteRijAttributen = bestaandRijNummer
        ? rijAttributen
        : `${rijAttributen} r="${rijNummer}"`;

      return `<row${aangepasteRijAttributen}>` + `${aangepasteRijInhoud}</row>`;
    },
  );
}

async function normaliseerExcelbestand(invoer: ArrayBuffer) {
  const jsZipModule = await import("jszip");
  const JSZip = jsZipModule.default;
  const zip = await JSZip.loadAsync(invoer);

  const xmlBestanden = Object.keys(zip.files).filter(
    (naam) => naam.startsWith("xl/") && naam.endsWith(".xml"),
  );

  await Promise.all(
    xmlBestanden.map(async (naam) => {
      const zipBestand = zip.file(naam);

      if (!zipBestand) {
        return;
      }

      const xml = await zipBestand.async("string");

      let genormaliseerdeXml = xml.replace(/(<\/?)[A-Za-z_][\w.-]*:/g, "$1");

      if (naam.startsWith("xl/worksheets/")) {
        genormaliseerdeXml = genormaliseerdeXml
          .replace(/<row\b([^>]*)\/>/g, "<row$1></row>")
          .replace(/<c\b([^>]*)\/>/g, "<c$1></c>");

        genormaliseerdeXml =
          voegOntbrekendeWerkbladAdressenToe(genormaliseerdeXml);
      }

      if (genormaliseerdeXml !== xml) {
        zip.file(naam, genormaliseerdeXml);
      }
    }),
  );

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: {
      level: 1,
    },
  });
}

async function geefBrowserTijd() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function verwerkExcelbestand(
  bestand: File,
  voortgangBijwerken: (waarde: number) => void,
): Promise<VoorverwerkteAttestimport> {
  if (bestand.size === 0) {
    throw new Error("Het geselecteerde bestand is leeg.");
  }

  if (bestand.size > MAXIMALE_BESTANDSGROOTTE) {
    throw new Error("Het Excelbestand mag maximaal 15 MB groot zijn.");
  }

  if (!bestand.name.toLocaleLowerCase().endsWith(".xlsx")) {
    throw new Error("Alleen .xlsx-bestanden worden ondersteund.");
  }

  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default;
  const origineelBestand = await bestand.arrayBuffer();

  let werkmap = new ExcelJS.Workbook();

  try {
    try {
      await werkmap.xlsx.load(
        origineelBestand as Parameters<typeof werkmap.xlsx.load>[0],
      );
    } catch {
      const genormaliseerdBestand = await normaliseerExcelbestand(
        origineelBestand.slice(0),
      );

      werkmap = new ExcelJS.Workbook();

      await werkmap.xlsx.load(
        genormaliseerdBestand as unknown as Parameters<
          typeof werkmap.xlsx.load
        >[0],
      );
    }
  } catch (fout) {
    console.error("Excelbestand openen in webapp mislukt:", fout);

    throw new Error("Het Excelbestand kon niet worden geopend.");
  }

  voortgangBijwerken(10);

  const werkblad = werkmap.getWorksheet("Export");

  if (!werkblad) {
    throw new Error('Het werkblad "Export" werd niet gevonden.');
  }

  const aantalExcelRijen = Math.max(0, werkblad.actualRowCount - 1);

  if (aantalExcelRijen > MAXIMAAL_AANTAL_RIJEN) {
    throw new Error(
      `Het bestand bevat meer dan ${MAXIMAAL_AANTAL_RIJEN.toLocaleString(
        "nl-BE",
      )} gegevensrijen.`,
    );
  }

  const verwachteHeaders = [
    {
      kolom: 1,
      toegelaten: ["persoonsid"],
      label: "Persoons ID (kolom A)",
    },
    {
      kolom: 2,
      toegelaten: ["naam"],
      label: "Naam (kolom B)",
    },
    {
      kolom: 5,
      toegelaten: ["bedrijfsnaam"],
      label: "Bedrijfsnaam (kolom E)",
    },
    {
      kolom: 7,
      toegelaten: ["attestnummer"],
      label: "Attestnummer (kolom G)",
    },
  ];

  for (const verwachteHeader of verwachteHeaders) {
    const werkelijkeHeader = maakHeaderSleutel(
      leesCelTekst(werkblad.getRow(1).getCell(verwachteHeader.kolom)),
    );

    if (!verwachteHeader.toegelaten.includes(werkelijkeHeader)) {
      throw new Error(
        `De verwachte kolom "${verwachteHeader.label}" werd niet gevonden.`,
      );
    }
  }

  const personen = new Map<
    string,
    {
      naam: string;
      attestnummers: Set<string>;
    }
  >();

  const bedrijven = new Map<
    string,
    {
      bedrijfsnaam: string;
      attestnummers: Set<string>;
    }
  >();

  let verwerkteRijen = 0;

  for (
    let rijNummer = 2;
    rijNummer <= werkblad.actualRowCount;
    rijNummer += 1
  ) {
    const rij = werkblad.getRow(rijNummer);

    const persoonsId = normaliseerPersoonsId(leesCelTekst(rij.getCell(1)));

    const naam = normaliseerTekst(leesCelTekst(rij.getCell(2)));

    const bedrijfsnaam = normaliseerTekst(leesCelTekst(rij.getCell(5)));

    const attestnummer = normaliseerTekst(leesCelTekst(rij.getCell(7)));

    if (attestnummer) {
      verwerkteRijen += 1;

      if (persoonsId) {
        const bestaandePersoon = personen.get(persoonsId);

        if (bestaandePersoon) {
          bestaandePersoon.attestnummers.add(attestnummer);

          if (!bestaandePersoon.naam && naam) {
            bestaandePersoon.naam = naam;
          }
        } else {
          personen.set(persoonsId, {
            naam,
            attestnummers: new Set([attestnummer]),
          });
        }
      }

      if (bedrijfsnaam) {
        const sleutel = normaliseerBedrijfsnaamSleutel(bedrijfsnaam);

        const bestaandBedrijf = bedrijven.get(sleutel);

        if (bestaandBedrijf) {
          bestaandBedrijf.attestnummers.add(attestnummer);
        } else {
          bedrijven.set(sleutel, {
            bedrijfsnaam,
            attestnummers: new Set([attestnummer]),
          });
        }
      }
    }

    if (rijNummer % 500 === 0) {
      const percentage =
        aantalExcelRijen === 0
          ? 90
          : 10 + Math.floor(((rijNummer - 1) / aantalExcelRijen) * 80);

      voortgangBijwerken(Math.min(90, percentage));

      await geefBrowserTijd();
    }
  }

  if (verwerkteRijen === 0) {
    throw new Error("Er werden geen rijen met een attestnummer gevonden.");
  }

  if (personen.size === 0) {
    throw new Error("Er werden geen geldige Persoons ID's gevonden.");
  }

  if (bedrijven.size === 0) {
    throw new Error("Er werden geen geldige bedrijfsnamen gevonden.");
  }

  const persoonGegevens = Array.from(
    personen.entries(),
    ([persoonsId, gegevens]) => ({
      persoonsId,
      naam: gegevens.naam || "Onbekend",
      aantalAttesten: gegevens.attestnummers.size,
    }),
  );

  const bedrijfGegevens = Array.from(
    bedrijven.entries(),
    ([bedrijfsnaamSleutel, gegevens]) => ({
      bedrijfsnaam: gegevens.bedrijfsnaam,
      bedrijfsnaamSleutel,
      aantalAttesten: gegevens.attestnummers.size,
    }),
  );

  voortgangBijwerken(100);

  return {
    bronBestandsnaam: bestand.name,
    aantalExcelRijen,
    personen: persoonGegevens,
    bedrijven: bedrijfGegevens,
  };
}

function Melding({ status }: { status: ImportStatus }) {
  if (!status.message) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
        status.succes
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
      aria-live="polite"
    >
      {status.message}
    </div>
  );
}

export default function AtteststatistiekenImport() {
  const router = useRouter();

  const [bestand, setBestand] = useState<File | null>(null);

  const [voorverwerkteImport, setVoorverwerkteImport] =
    useState<VoorverwerkteAttestimport | null>(null);

  const [fase, setFase] = useState<Verwerkingsfase>("wachten");

  const [voortgang, setVoortgang] = useState(0);

  const [status, setStatus] = useState<ImportStatus>({});

  const bezig =
    fase === "openen" || fase === "verwerken" || fase === "importeren";

  async function bestandVerwerken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bestand) {
      setStatus({
        succes: false,
        message: "Selecteer een Excelbestand.",
      });
      return;
    }

    setStatus({});
    setVoorverwerkteImport(null);
    setVoortgang(2);
    setFase("openen");

    try {
      await geefBrowserTijd();

      setFase("verwerken");

      const resultaat = await verwerkExcelbestand(bestand, setVoortgang);

      setVoorverwerkteImport(resultaat);
      setFase("klaar");
      setStatus({
        succes: true,
        message: "Het Excelbestand is verwerkt en klaar om te importeren.",
      });
    } catch (fout) {
      setFase("wachten");
      setVoortgang(0);
      setStatus({
        succes: false,
        message:
          fout instanceof Error
            ? fout.message
            : "Het Excelbestand kon niet worden verwerkt.",
      });
    }
  }

  async function resultaatImporteren() {
    if (!voorverwerkteImport) {
      return;
    }

    setFase("importeren");
    setStatus({});

    try {
      const resultaat =
        await importeerVoorverwerkteAtteststatistieken(voorverwerkteImport);

      setStatus(resultaat);

      if (resultaat.succes) {
        setVoorverwerkteImport(null);
        setBestand(null);
        setVoortgang(100);
        setFase("wachten");
        router.refresh();
      } else {
        setFase("klaar");
      }
    } catch (fout) {
      console.error("Voorverwerkte attestimport mislukt:", fout);

      setFase("klaar");
      setStatus({
        succes: false,
        message: "De verwerkte gegevens konden niet worden geïmporteerd.",
      });
    }
  }

  function anderBestandKiezen() {
    setVoorverwerkteImport(null);
    setBestand(null);
    setVoortgang(0);
    setFase("wachten");
    setStatus({});
  }

  return (
    <>
      <form
        onSubmit={bestandVerwerken}
        aria-busy={bezig}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="block flex-1">
          <span className="text-sm font-semibold text-slate-700">
            Excelbestand
          </span>

          <input
            type="file"
            name="excelBestand"
            required
            disabled={bezig}
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              setBestand(event.target.files?.[0] ?? null);
              setVoorverwerkteImport(null);
              setStatus({});
              setVoortgang(0);
              setFase("wachten");
            }}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={bezig || !bestand}
          className={`${BEHEER_KNOP_KLASSEN.primair} disabled:cursor-wait disabled:opacity-60`}
        >
          {fase === "openen"
            ? "Excel openen…"
            : fase === "verwerken"
              ? "Excel verwerken…"
              : "Excel verwerken"}
        </button>
      </form>

      {fase === "openen" || fase === "verwerken" ? (
        <div
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Excelbestand wordt verwerkt
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-800">
                De webapp maakt eerst de personen- en bedrijfssamenvatting.
              </p>
            </div>

            <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-800">
              {voortgang}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Voortgang van de Excelverwerking"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={voortgang}
            className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100 ring-1 ring-inset ring-emerald-200"
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-200"
              style={{
                width: `${voortgang}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-emerald-800">
            Sluit of vernieuw deze pagina niet totdat de verwerking voltooid is.
          </p>
        </div>
      ) : null}

      {voorverwerkteImport ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-500">Excelrijen</p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-950">
                {voorverwerkteImport.aantalExcelRijen.toLocaleString("nl-BE")}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500">Personen</p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-950">
                {voorverwerkteImport.personen.length.toLocaleString("nl-BE")}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500">Bedrijven</p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-950">
                {voorverwerkteImport.bedrijven.length.toLocaleString("nl-BE")}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            De samenvattingen zijn opgebouwd met unieke attestnummers, zoals bij
            de bestaande import.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={fase === "importeren"}
              onClick={resultaatImporteren}
              className={`${BEHEER_KNOP_KLASSEN.primair} disabled:cursor-wait disabled:opacity-60`}
            >
              {fase === "importeren"
                ? "Importeren…"
                : "Verwerkte gegevens importeren"}
            </button>

            <button
              type="button"
              disabled={fase === "importeren"}
              onClick={anderBestandKiezen}
              className={`${BEHEER_KNOP_KLASSEN.secundair} disabled:cursor-wait disabled:opacity-60`}
            >
              Ander bestand kiezen
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <Melding status={status} />
      </div>
    </>
  );
}

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import {
  laadNonConformiteiten,
  leesNonConformiteitFilters,
  leesNonConformiteitSorteringen,
  NON_CONFORMITEIT_SORTERINGEN,
} from "@/lib/non-conformiteit-lijst";
import {
  GEEN_TABEL_CACHE,
  OngeldigePagineringFout,
  leesTabelAanvraag,
} from "@/lib/server-paginering";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAXIMAAL_AANTAL_EXCELRIJEN = 1_048_575;

export async function GET(verzoek: Request) {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return NextResponse.json(
        { fout: "Je bent niet ingelogd." },
        { status: 401, headers: GEEN_TABEL_CACHE },
      );
    }

    const magBekijken =
      heeftMachtiging(gebruiker.rollen, "DESKCONTROLES_BEKIJKEN") ||
      heeftMachtiging(gebruiker.rollen, "TERREINCONTROLES_BEKIJKEN");

    if (!magBekijken) {
      return NextResponse.json(
        { fout: "Je hebt geen toegang tot non-conformiteiten." },
        { status: 403, headers: GEEN_TABEL_CACHE },
      );
    }

    const url = new URL(verzoek.url);

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: NON_CONFORMITEIT_SORTERINGEN,
      standaardSortering: "datumControle",
      standaardRichting: "desc",
      standaardLimiet: 50,
    });

    const rijen = await laadNonConformiteiten({
      zoekterm: aanvraag.zoekterm,
      filters: leesNonConformiteitFilters(url),
      sorteringen: leesNonConformiteitSorteringen(url),
      limiet: null,
      cursorId: null,
    });

    if (rijen.length > MAXIMAAL_AANTAL_EXCELRIJEN) {
      return NextResponse.json(
        {
          fout: "De selectie bevat te veel regels voor één Excel-werkblad. Verfijn eerst de filters.",
        },
        { status: 413, headers: GEEN_TABEL_CACHE },
      );
    }

    const werkboek = new ExcelJS.Workbook();
    werkboek.creator = "SKH Certificaten CRM";
    werkboek.created = new Date();

    const werkblad = werkboek.addWorksheet("Non-conformiteiten", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    werkblad.columns = [
      { header: "Bron", key: "bron", width: 20 },
      { header: "NC-ID", key: "ncId", width: 16 },
      { header: "Categorie", key: "categorie", width: 24 },
      { header: "Parameter", key: "parameter", width: 24 },
      { header: "Naam ADI", key: "naamAdi", width: 30 },
      { header: "OVAM-ID", key: "ovamId", width: 18 },
      { header: "Datum controle", key: "datumControle", width: 18 },
      { header: "Attestnummer", key: "attestnummer", width: 22 },
      { header: "Adres", key: "adres", width: 42 },
      { header: "Omschrijving", key: "omschrijving", width: 55 },
      {
        header: "Vastgesteld door CI",
        key: "vastgesteldDoorCi",
        width: 22,
      },
      { header: "Verduidelijking", key: "verduidelijking", width: 55 },
      { header: "Grote impact", key: "groteImpact", width: 18 },
      { header: "Auditeur", key: "auditeur", width: 24 },
      { header: "Excelrij", key: "excelRij", width: 12 },
      {
        header: "Motivatie aanpassing",
        key: "motivatieAanpassing",
        width: 55,
      },
      { header: "Bedrijfsnaam", key: "bedrijfsnaam", width: 32 },
      {
        header: "Ondernemingsnummer",
        key: "ondernemingsnummer",
        width: 22,
      },
      {
        header: "Persoonscertificaat",
        key: "persoonscertificaat",
        width: 24,
      },
      {
        header: "Procescertificaat",
        key: "procescertificaat",
        width: 24,
      },
      { header: "Toegevoegd op", key: "aangemaaktOp", width: 18 },
      { header: "Link attest", key: "linkAttest", width: 45 },
      {
        header: "Certificatieplatform",
        key: "certificatiePlatform",
        width: 45,
      },
      { header: "Vaststelling-ID", key: "vaststellingId", width: 18 },
      { header: "Controle-ID", key: "controleId", width: 15 },
    ];

    const kopregel = werkblad.getRow(1);
    kopregel.height = 24;
    kopregel.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    kopregel.alignment = {
      vertical: "middle",
      horizontal: "left",
    };
    kopregel.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };

    for (const rij of rijen) {
      const excelRij = werkblad.addRow({
        bron: rij.bron,
        ncId: rij.ncId,
        categorie: rij.categorie,
        parameter: rij.parameter,
        naamAdi: rij.naamAdi,
        ovamId: rij.ovamId,
        datumControle: rij.datumControle,
        attestnummer: rij.attestnummer,
        adres: rij.adres,
        omschrijving: rij.omschrijving,
        vastgesteldDoorCi: rij.vastgesteldDoorCi,
        verduidelijking: rij.verduidelijking,
        groteImpact: rij.groteImpact,
        auditeur: rij.auditeur,
        excelRij: rij.excelRij,
        motivatieAanpassing: rij.motivatieAanpassing,
        bedrijfsnaam: rij.bedrijfsnaam,
        ondernemingsnummer: rij.ondernemingsnummer,
        persoonscertificaat: rij.persoonscertificaat,
        procescertificaat: rij.procescertificaat,
        aangemaaktOp: rij.aangemaaktOp,
        linkAttest: rij.linkAttest,
        certificatiePlatform: rij.certificatiePlatform,
        vaststellingId: rij.vaststellingId,
        controleId: rij.controleId,
      });

      excelRij.alignment = {
        vertical: "top",
        wrapText: true,
      };

      if (/^https?:\/\//i.test(rij.linkAttest)) {
        const cel = excelRij.getCell("linkAttest");
        cel.value = {
          text: rij.linkAttest,
          hyperlink: rij.linkAttest,
        };
        cel.font = {
          color: { argb: "FF047857" },
          underline: true,
        };
      }

      if (/^https?:\/\//i.test(rij.certificatiePlatform)) {
        const cel = excelRij.getCell("certificatiePlatform");
        cel.value = {
          text: rij.certificatiePlatform,
          hyperlink: rij.certificatiePlatform,
        };
        cel.font = {
          color: { argb: "FF047857" },
          underline: true,
        };
      }
    }

    werkblad.getColumn("datumControle").numFmt = "dd/mm/yyyy";
    werkblad.getColumn("aangemaaktOp").numFmt = "dd/mm/yyyy";
    werkblad.autoFilter = "A1:Y1";

    const tellingenPerNcId = new Map<string, number>();

    for (const rij of rijen) {
      const ncId = rij.ncId.trim() || "(Geen NC-ID)";

      tellingenPerNcId.set(ncId, (tellingenPerNcId.get(ncId) ?? 0) + 1);
    }

    const ncIdSamenvatting = werkboek.addWorksheet("Samenvatting NC-ID", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ncIdSamenvatting.columns = [
      {
        header: "NC-ID",
        key: "ncId",
        width: 30,
      },
      {
        header: "Aantal keer gegeven",
        key: "aantal",
        width: 22,
      },
    ];

    const samenvattingKopregel = ncIdSamenvatting.getRow(1);

    samenvattingKopregel.height = 24;
    samenvattingKopregel.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    samenvattingKopregel.alignment = {
      vertical: "middle",
      horizontal: "left",
    };
    samenvattingKopregel.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };

    const gesorteerdeTellingen = Array.from(tellingenPerNcId.entries()).sort(
      ([eersteNcId], [tweedeNcId]) =>
        eersteNcId.localeCompare(tweedeNcId, "nl-BE", {
          numeric: true,
          sensitivity: "base",
        }),
    );

    for (const [ncId, aantal] of gesorteerdeTellingen) {
      ncIdSamenvatting.addRow({
        ncId,
        aantal,
      });
    }

    ncIdSamenvatting.getColumn("aantal").numFmt = "0";
    ncIdSamenvatting.autoFilter = "A1:B1";

    const bestand = await werkboek.xlsx.writeBuffer();
    const bestandsdatum = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(bestand), {
      status: 200,
      headers: {
        ...GEEN_TABEL_CACHE,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="non-conformiteiten-${bestandsdatum}.xlsx"`,
      },
    });
  } catch (fout) {
    if (fout instanceof OngeldigePagineringFout) {
      return NextResponse.json(
        { fout: fout.message },
        { status: 400, headers: GEEN_TABEL_CACHE },
      );
    }

    console.error("Non-conformiteiten exporteren mislukt:", fout);

    return NextResponse.json(
      { fout: "Het Excel-bestand kon niet worden aangemaakt." },
      { status: 500, headers: GEEN_TABEL_CACHE },
    );
  }
}

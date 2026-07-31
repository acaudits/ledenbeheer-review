import ExcelJS from "exceljs";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function formatteerDatumVoorExcel(
  datum: Date | null,
) {
  if (!datum) {
    return "";
  }

  const jaar =
    datum.getUTCFullYear();

  const maand = String(
    datum.getUTCMonth() + 1,
  ).padStart(2, "0");

  const dag = String(
    datum.getUTCDate(),
  ).padStart(2, "0");

  return `${jaar}-${maand}-${dag}`;
}

function statusLabel(
  status: string,
) {
  if (status === "IN_OPMAAK") {
    return "In opmaak";
  }

  if (status === "GEACTUALISEERD") {
    return "Geactualiseerd";
  }

  if (status === "AFGEROND") {
    return "Afgerond";
  }

  return "Geen";
}

function typeControleLabel(
  typeControle: string | null,
) {
  if (
    typeControle ===
    "NIEUWE_CONTROLE"
  ) {
    return "Nieuwe controle";
  }

  if (
    typeControle ===
    "OPVOLGING"
  ) {
    return "Opvolging";
  }

  return "";
}


function booleanLabel(
  waarde: boolean | null,
) {
  if (waarde === true) {
    return "Ja";
  }

  if (waarde === false) {
    return "Nee";
  }

  return "";
}


export async function GET() {
  await vereisMachtiging("DESKCONTROLES_EXCEL_EXPORTEREN");

  const deskcontroles =
    await prisma.deskcontrole.findMany({
      where: {
        verwijderdOp: null,
      },
      include: {
        lid: {
          select: {
            naamPersoon: true,
            ovamId: true,
            certificaatnummer: true,
            certificatiePlatform: true,
          },
        },
        procescertificaat: {
          select: {
            naamBedrijf: true,
            kboNummer: true,
            certificaatnummer: true,
          },
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          datumControle:
            "desc",
        },
      ],
    });

  const werkboek =
    new ExcelJS.Workbook();

  werkboek.creator =
    "Ledenbeheer";

  werkboek.created =
    new Date();

  const werkblad =
    werkboek.addWorksheet(
      "Deskcontroles",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

  werkblad.columns = [
    {
      header: "ID",
      key: "id",
      width: 10,
    },
    {
      header: "Auditeur",
      key: "auditeur",
      width: 24,
    },
    {
      header: "Naam ADI",
      key: "naamAdi",
      width: 32,
    },
    {
      header: "PersoonsID",
      key: "persoonsId",
      width: 18,
    },
    {
      header:
        "Persoonscertificaat",
      key: "persoonscertificaat",
      width: 22,
    },
    {
      header:
        "Certificatieplatform",
      key: "certificatiePlatform",
      width: 42,
    },
    {
      header: "Bedrijfsnaam",
      key: "bedrijfsnaam",
      width: 34,
    },
    {
      header:
        "Ondernemingsnummer / EU-btw-nummer",
      key: "ondernemingsnummer",
      width: 28,
    },
    {
      header:
        "Procescertificaat",
      key: "procescertificaat",
      width: 22,
    },
    {
      header: "Attestnummer",
      key: "attestnummer",
      width: 26,
    },
    {
      header: "Attest-ID",
      key: "attestId",
      width: 40,
    },
    {
      header: "Link Attest",
      key: "linkAttest",
      width: 70,
    },
    {
      header: "Status",
      key: "status",
      width: 16,
    },
    {
      header: "Type controle",
      key: "typeControle",
      width: 20,
    },
    {
      header: "Datum controle",
      key: "datumControle",
      width: 18,
    },
    {
      header:
        "Deadline sanctie",
      key: "deadlineSanctie",
      width: 18,
    },
    {
      header:
        "Mail sanctie verzonden",
      key: "mailSanctieVerzonden",
      width: 24,
    },
    {
      header:
        "Finalisatie Datum",
      key: "finalisatieDatum",
      width: 20,
    },
    {
      header:
        "Deadline correctie",
      key: "deadlineCorrectie",
      width: 20,
    },
    {
      header:
        "Mail correctie verzonden",
      key: "mailCorrectieVerzonden",
      width: 26,
    },
    {
      header:
        "Voorwaardelijke opheffing",
      key: "voorwaardelijkeOpheffing",
      width: 28,
    },
    {
      header: "OneDrive",
      key: "oneDrive",
      width: 60,
    },
    {
      header: "Adres",
      key: "adres",
      width: 48,
    },
    {
      header: "Opmerkingen",
      key: "opmerkingen",
      width: 60,
    },
  ];

  for (
    const deskcontrole of
    deskcontroles
  ) {
    werkblad.addRow({
      id:
        deskcontrole.id,

      auditeur:
        deskcontrole.auditeur,

      naamAdi:
        deskcontrole.lid
          ?.naamPersoon ??
        "Niet gekoppeld",

      persoonsId:
        deskcontrole.lid
          ?.ovamId ??
        "Niet gekoppeld",

      persoonscertificaat:
        deskcontrole.lid
          ?.certificaatnummer ??
        "Niet gekoppeld",

      certificatiePlatform:
        deskcontrole.lid
          ?.certificatiePlatform ??
        "",

      bedrijfsnaam:
        deskcontrole
          .procescertificaat
          ?.naamBedrijf ??
        "Niet gekoppeld",

      ondernemingsnummer:
        deskcontrole
          .procescertificaat
          ?.kboNummer ??
        "Niet gekoppeld",

      procescertificaat:
        deskcontrole
          .procescertificaat
          ?.certificaatnummer ??
        "Niet gekoppeld",

      attestnummer:
        deskcontrole.attestnummer,

      attestId:
        deskcontrole.attestId,

      linkAttest:
        deskcontrole.linkAttest,

      status:
        statusLabel(
          deskcontrole.status,
        ),

      typeControle:
        typeControleLabel(
          deskcontrole.typeControle,
        ),

      datumControle:
        formatteerDatumVoorExcel(
          deskcontrole.datumControle,
        ),

      deadlineSanctie:
        formatteerDatumVoorExcel(
          deskcontrole.deadlineSanctie,
        ),

      mailSanctieVerzonden:
        booleanLabel(
          deskcontrole
            .mailSanctieVerzonden,
        ),

      finalisatieDatum:
        formatteerDatumVoorExcel(
          deskcontrole.finalisatieDatum,
        ),

      deadlineCorrectie:
        formatteerDatumVoorExcel(
          deskcontrole.deadlineCorrectie,
        ),

      mailCorrectieVerzonden:
        booleanLabel(
          deskcontrole
            .mailCorrectieVerzonden,
        ),

      voorwaardelijkeOpheffing:
        booleanLabel(
          deskcontrole
            .voorwaardelijkeOpheffing,
        ),

      oneDrive:
        deskcontrole.oneDrive ??
        "",

      adres:
        deskcontrole.adres ??
        "",

      opmerkingen:
        deskcontrole.opmerkingen ??
        "",
    });
  }

  const koprij =
    werkblad.getRow(1);

  koprij.height = 28;

  koprij.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  koprij.alignment = {
    vertical: "middle",
    horizontal: "left",
  };

  koprij.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF047857",
    },
  };

  koprij.eachCell((cel) => {
    cel.border = {
      top: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
      left: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
      bottom: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
      right: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
    };
  });

  for (
    let rijnummer = 2;
    rijnummer <=
    werkblad.rowCount;
    rijnummer++
  ) {
    const rij =
      werkblad.getRow(
        rijnummer,
      );

    rij.alignment = {
      vertical: "top",
      wrapText: true,
    };

    rij.eachCell(
      {
        includeEmpty: true,
      },
      (cel) => {
        cel.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
          left: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
          right: {
            style: "thin",
            color: {
              argb: "FFE2E8F0",
            },
          },
        };
      },
    );

    if (
      rijnummer % 2 === 0
    ) {
      rij.eachCell(
        {
          includeEmpty: true,
        },
        (cel) => {
          cel.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFF8FAFC",
            },
          };
        },
      );
    }
  }

  if (
    werkblad.rowCount >= 1
  ) {
    werkblad.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },
      to: {
        row: werkblad.rowCount,
        column:
          werkblad.columnCount,
      },
    };
  }

  const excelBuffer =
    await werkboek.xlsx.writeBuffer();

  const blob = new Blob(
    [
      excelBuffer as unknown as BlobPart,
    ],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );

  const datum =
    new Date()
      .toISOString()
      .slice(0, 10);

  const bestandsnaam =
    `deskcontroles-${datum}.xlsx`;

  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "Content-Disposition":
        `attachment; filename="${bestandsnaam}"`,

      "Cache-Control":
        "no-store",
    },
  });
}


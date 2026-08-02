import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";

function formatteerDatum(
  waarde: Date | null,
) {
  if (!waarde) {
    return "";
  }

  const jaar =
    waarde.getUTCFullYear();

  const maand = String(
    waarde.getUTCMonth() + 1,
  ).padStart(2, "0");

  const dag = String(
    waarde.getUTCDate(),
  ).padStart(2, "0");

  return `${jaar}-${maand}-${dag}`;
}

function statusLabel(
  status: string,
) {
  if (status === "IN_OPMAAK") {
    return "In opmaak";
  }

  if (
    status === "GEACTUALISEERD"
  ) {
    return "Geactualiseerd";
  }

  if (status === "AFGEROND") {
    return "Afgerond";
  }

  return "Geen";
}

function geefCelRand(
  kleur: string,
): Partial<ExcelJS.Borders> {
  return {
    top: {
      style: "thin",
      color: {
        argb: kleur,
      },
    },
    left: {
      style: "thin",
      color: {
        argb: kleur,
      },
    },
    bottom: {
      style: "thin",
      color: {
        argb: kleur,
      },
    },
    right: {
      style: "thin",
      color: {
        argb: kleur,
      },
    },
  };
}

function formatteerWerkblad(
  werkblad: ExcelJS.Worksheet,
) {
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
    cel.border =
      geefCelRand(
        "FFCBD5E1",
      );
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
        cel.border =
          geefCelRand(
            "FFE2E8F0",
          );

        if (
          rijnummer % 2 === 0
        ) {
          cel.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFF8FAFC",
            },
          };
        }
      },
    );
  }

  werkblad.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },
    to: {
      row: Math.max(
        werkblad.rowCount,
        1,
      ),
      column:
        werkblad.columnCount,
    },
  };
}

export async function maakTerreincontroleExcel(
  alleenOpenstaand = false,
) {
  const dossiers =
    await prisma.terreincontroleDossier.findMany({
      where: {
        verwijderdOp: null,
        status: alleenOpenstaand
          ? {
              in: [
                "GEEN",
                "IN_OPMAAK",
              ],
            }
          : undefined,
      },
      include: {
        vaststellingen: {
          orderBy: [
            {
              excelRij: "asc",
            },
            {
              id: "asc",
            },
          ],
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
        {
          id: "desc",
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
      alleenOpenstaand
        ? "Geen - In opmaak"
        : "Terreincontroles",
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
      header: "Auditeur",
      key: "auditeur",
      width: 26,
    },
    {
      header: "Naam ADI",
      key: "naamAdi",
      width: 32,
    },
    {
      header: "Link Attest",
      key: "linkAttest",
      width: 70,
    },
    {
      header: "Attestnummer",
      key: "attestnummer",
      width: 28,
    },
    {
      header: "Status",
      key: "status",
      width: 18,
    },
    {
      header:
        "Certificatieplatform",
      key: "certificatiePlatform",
      width: 45,
    },
    {
      header: "Opmerkingen",
      key: "opmerkingen",
      width: 60,
    },
    {
      header: "Datum controle",
      key: "datumControle",
      width: 18,
    },
    {
      header: "Adres",
      key: "adres",
      width: 48,
    },
    {
      header: "PersoonsID",
      key: "persoonsId",
      width: 20,
    },
    {
      header: "Bedrijfsnaam",
      key: "bedrijfsnaam",
      width: 38,
    },
    {
      header:
        "Ondernemingsnummer",
      key: "ondernemingsnummer",
      width: 24,
    },
    {
      header:
        "Persoonscertificaat",
      key: "persoonscertificaat",
      width: 24,
    },
    {
      header:
        "Procescertificaat",
      key: "procescertificaat",
      width: 24,
    },
    {
      header: "ID",
      key: "attestId",
      width: 40,
    },
  ];

  for (
    const dossier of dossiers
  ) {
    werkblad.addRow({
      auditeur:
        dossier.auditeur,
      naamAdi:
        dossier.naamAdi,
      linkAttest:
        dossier.linkAttest,
      attestnummer:
        dossier.attestnummer,
      status:
        statusLabel(
          dossier.status,
        ),
      certificatiePlatform:
        dossier.certificatiePlatform ??
        "",
      opmerkingen:
        dossier.opmerkingen ??
        "",
      datumControle:
        formatteerDatum(
          dossier.datumControle,
        ),
      adres:
        dossier.adres ?? "",
      persoonsId:
        dossier.persoonsId,
      bedrijfsnaam:
        dossier.bedrijfsnaam,
      ondernemingsnummer:
        dossier.ondernemingsnummer,
      persoonscertificaat:
        dossier
          .persoonscertificaatNummer,
      procescertificaat:
        dossier
          .procescertificaatNummer,
      attestId:
        dossier.attestId,
    });
  }

  formatteerWerkblad(
    werkblad,
  );

  /*
   * Vaststellingen worden in een apart
   * werkblad opgenomen. Daardoor blijven
   * meerdere vaststellingen per dossier
   * afzonderlijk beschikbaar.
   */
  const vaststellingenWerkblad =
    werkboek.addWorksheet(
      "Vaststellingen",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

  vaststellingenWerkblad.columns = [
    {
      header: "Terreincontrole-ID",
      key: "terreincontroleId",
      width: 22,
    },
    {
      header: "Attest-ID",
      key: "attestId",
      width: 40,
    },
    {
      header: "Attestnummer",
      key: "attestnummer",
      width: 28,
    },
    {
      header: "Excelrij",
      key: "excelRij",
      width: 14,
    },
    {
      header: "NC-ID",
      key: "ncId",
      width: 20,
    },
    {
      header: "Parameter",
      key: "parameter",
      width: 30,
    },
    {
      header: "Omschrijving",
      key: "omschrijving",
      width: 60,
    },
    {
      header:
        "Vastgesteld door CI",
      key: "vastgesteldDoorCi",
      width: 28,
    },
    {
      header: "Verduidelijking",
      key: "verduidelijking",
      width: 60,
    },
    {
      header: "Grote impact",
      key: "groteImpact",
      width: 20,
    },
    {
      header: "Categorie",
      key: "categorie",
      width: 24,
    },
    {
      header:
        "Motivatie aanpassing",
      key: "motivatieAanpassing",
      width: 60,
    },
  ];

  for (
    const dossier of dossiers
  ) {
    for (
      const vaststelling of
      dossier.vaststellingen
    ) {
      vaststellingenWerkblad.addRow({
        terreincontroleId:
          dossier.id,
        attestId:
          dossier.attestId,
        attestnummer:
          dossier.attestnummer,
        excelRij:
          vaststelling.excelRij,
        ncId:
          vaststelling.ncId,
        parameter:
          vaststelling.parameter ??
          "",
        omschrijving:
          vaststelling.omschrijving ??
          "",
        vastgesteldDoorCi:
          vaststelling
            .vastgesteldDoorCi ??
          "",
        verduidelijking:
          vaststelling.verduidelijking ??
          "",
        groteImpact:
          vaststelling.groteImpact ??
          "",
        categorie:
          vaststelling.categorie ??
          "",
        motivatieAanpassing:
          vaststelling
            .motivatieAanpassing ??
          "",
      });
    }
  }

  formatteerWerkblad(
    vaststellingenWerkblad,
  );

  return werkboek.xlsx.writeBuffer();
}

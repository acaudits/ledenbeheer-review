import ExcelJS from "exceljs";

import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";
import {
  maakGoogleMapsUrl,
} from "@/lib/terreincontrole";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function bestandsdatum() {
  const datum = new Date();

  const jaar =
    datum
      .getFullYear()
      .toString();

  const maand =
    String(
      datum.getMonth() + 1,
    ).padStart(2, "0");

  const dag =
    String(
      datum.getDate(),
    ).padStart(2, "0");

  return `${jaar}-${maand}-${dag}`;
}

export async function GET() {
  await vereisMachtiging("TERREINCONTROLES_EXPORTEREN");


  const terreincontroles =
    await prisma.terreincontrole.findMany(
      {
        where: {
          verwijderdOp: null,
        },

        orderBy: [
          {
            datumPlaatsbezoek:
              "desc",
          },
          {
            id: "desc",
          },
        ],

        select: {
          id: true,
          auditeur: true,
          factuurVerzonden: true,
          status: true,

          inspectielocatie: true,
          bouwjaar: true,
          vloeroppervlakteM2: true,

          datumPlaatsbezoek: true,
          uurPlaatsbezoek: true,

          ovamId: true,
          naamAdi: true,
          attestUrl: true,
          bedrijfsnaam: true,

          postcode: true,
          gemeente: true,
          straat: true,
          huisnummer: true,
          extraAdresDetails: true,

          perceelGemeenteCode: true,
          perceelAfdelingscode: true,
          perceelSectieCode: true,

          attestId: true,
          adres: true,
        },
      },
    );

  const werkmap =
    new ExcelJS.Workbook();

  werkmap.creator =
    "Ledenbeheer";

  werkmap.created =
    new Date();

  const werkblad =
    werkmap.addWorksheet(
      "Terreincontroles",
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
      header: "Google Maps",
      key: "googleMaps",
      width: 18,
    },
    {
      header: "Inspectielocatie",
      key: "inspectielocatie",
      width: 45,
    },
    {
      header: "Bouwjaar",
      key: "bouwjaar",
      width: 12,
    },
    {
      header:
        "Vloeroppervlakte (m²)",
      key: "vloeroppervlakteM2",
      width: 24,
    },
    {
      header:
        "Datum plaatsbezoek",
      key: "datumPlaatsbezoek",
      width: 22,
    },
    {
      header:
        "Uur plaatsbezoek",
      key: "uurPlaatsbezoek",
      width: 20,
    },
    {
      header:
        "Deskundige persoonsid",
      key: "ovamId",
      width: 26,
    },
    {
      header:
        "Deskundige naam",
      key: "naamAdi",
      width: 30,
    },
    {
      header:
        "Deskundige kwaliteitspagina",
      key: "attestUrl",
      width: 35,
    },
    {
      header:
        "Naam asbestdeskundig bedrijf",
      key: "bedrijfsnaam",
      width: 35,
    },
    {
      header: "Status",
      key: "status",
      width: 26,
    },
    {
      header: "Postcode",
      key: "postcode",
      width: 14,
    },
    {
      header: "Gemeente",
      key: "gemeente",
      width: 26,
    },
    {
      header: "Straat",
      key: "straat",
      width: 30,
    },
    {
      header: "Huisnummer",
      key: "huisnummer",
      width: 15,
    },
    {
      header:
        "Extra adres details",
      key: "extraAdresDetails",
      width: 30,
    },
    {
      header:
        "Perceel gemeente code",
      key: "perceelGemeenteCode",
      width: 25,
    },
    {
      header:
        "Perceel afdelingscode",
      key: "perceelAfdelingscode",
      width: 25,
    },
    {
      header:
        "Perceel sectie code",
      key: "perceelSectieCode",
      width: 23,
    },
    {
      header: "Liggingsadres",
      key: "attestId",
      width: 40,
    },
    {
      header: "Auditeur",
      key: "auditeur",
      width: 26,
    },
    {
      header:
        "Factuur verzonden",
      key: "factuurVerzonden",
      width: 20,
    },
  ];

  const kopRij =
    werkblad.getRow(1);

  kopRij.height = 28;

  kopRij.eachCell(
    (cel) => {
      cel.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      cel.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF047857",
        },
      };

      cel.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      cel.border = {
        bottom: {
          style: "thin",
          color: {
            argb: "FFCBD5E1",
          },
        },
      };
    },
  );

  for (
    const terreincontrole
    of terreincontroles
  ) {
    const googleMapsUrl =
      maakGoogleMapsUrl(
        terreincontrole
          .inspectielocatie ??
          terreincontrole.adres,
      );

    const rij =
      werkblad.addRow({
        googleMaps:
          googleMapsUrl
            ? {
                text:
                  "Google Maps",
                hyperlink:
                  googleMapsUrl,
              }
            : "",

        inspectielocatie:
          terreincontrole
            .inspectielocatie ??
          "",

        bouwjaar:
          terreincontrole
            .bouwjaar ??
          "",

        vloeroppervlakteM2:
          terreincontrole
            .vloeroppervlakteM2 ===
          null
            ? ""
            : Number(
                terreincontrole
                  .vloeroppervlakteM2,
              ),

        datumPlaatsbezoek:
          terreincontrole
            .datumPlaatsbezoek ??
          "",

        uurPlaatsbezoek:
          terreincontrole
            .uurPlaatsbezoek ??
          "",

        ovamId:
          terreincontrole.ovamId ??
          "",

        naamAdi:
          terreincontrole
            .naamAdi ??
          "",

        attestUrl:
          terreincontrole
            .attestUrl
            ? {
                text:
                  terreincontrole
                    .attestUrl,
                hyperlink:
                  terreincontrole
                    .attestUrl,
              }
            : "",

        bedrijfsnaam:
          terreincontrole
            .bedrijfsnaam ??
          "",

        status:
          terreincontrole.status ??
          "NULL",

        postcode:
          terreincontrole
            .postcode ??
          "",

        gemeente:
          terreincontrole
            .gemeente ??
          "",

        straat:
          terreincontrole.straat ??
          "",

        huisnummer:
          terreincontrole
            .huisnummer ??
          "",

        extraAdresDetails:
          terreincontrole
            .extraAdresDetails ??
          "",

        perceelGemeenteCode:
          terreincontrole
            .perceelGemeenteCode ??
          "",

        perceelAfdelingscode:
          terreincontrole
            .perceelAfdelingscode ??
          "",

        perceelSectieCode:
          terreincontrole
            .perceelSectieCode ??
          "",

        attestId:
          terreincontrole
            .attestId ??
          "",

        auditeur:
          terreincontrole
            .auditeur ??
          "",

        factuurVerzonden:
          terreincontrole
            .factuurVerzonden
            ? "Ja"
            : "Nee",
      });

    rij.alignment = {
      vertical: "top",
      wrapText: true,
    };
  }

  const datumKolom =
    werkblad.getColumn(
      "datumPlaatsbezoek",
    );

  datumKolom.numFmt =
    "dd/mm/yyyy";

  const googleMapsKolom =
    werkblad.getColumn(
      "googleMaps",
    );

  googleMapsKolom.eachCell(
    {
      includeEmpty: false,
    },
    (cel, rijNummer) => {
      if (rijNummer === 1) {
        return;
      }

      cel.font = {
        color: {
          argb: "FF2563EB",
        },
        underline: true,
      };
    },
  );

  const attestUrlKolom =
    werkblad.getColumn(
      "attestUrl",
    );

  attestUrlKolom.eachCell(
    {
      includeEmpty: false,
    },
    (cel, rijNummer) => {
      if (rijNummer === 1) {
        return;
      }

      cel.font = {
        color: {
          argb: "FF047857",
        },
        underline: true,
      };
    },
  );

  werkblad.autoFilter = {
    from: "A1",
    to: "V1",
  };

  const buffer =
    await werkmap.xlsx.writeBuffer();

  return new Response(
    new Uint8Array(buffer),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="terreincontroles-${bestandsdatum()}.xlsx"`,

        "Cache-Control":
          "no-store",
      },
    },
  );
}

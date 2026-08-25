"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  haalAttestIdUitUrl,
  isGeldigeTerreincontroleAuditeur,
  uurNaarDatabaseTijd,
} from "@/lib/terreincontrole";

type ActieStatus = {
  fout: string;
};

type TerreincontroleStatus =
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null;

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function leesTekst(
  formData: FormData,
  naam: string,
) {
  const waarde =
    formData.get(naam);

  return typeof waarde === "string"
    ? waarde.trim()
    : "";
}

function leesOptioneleTekst(
  formData: FormData,
  naam: string,
) {
  return (
    leesTekst(formData, naam) ||
    null
  );
}

function leesStatus(
  waarde: string,
):
  | TerreincontroleStatus
  | "ONGELDIG" {
  if (
    waarde === "" ||
    waarde === "NULL"
  ) {
    return null;
  }

  if (
    waarde ===
      "GEARCHIVEERD_ATTEST" ||
    waarde ===
      "ACTUEEL_ATTEST" ||
    waarde ===
      "IN_OPMAAK"
  ) {
    return waarde;
  }

  return "ONGELDIG";
}

function leesFactuurVerzonden(
  waarde: string,
):
  | boolean
  | null
  | "ONGELDIG" {
  if (waarde === "JA") {
    return true;
  }

  if (waarde === "NEE") {
    return false;
  }

  if (waarde === "NVT") {
    return null;
  }

  return "ONGELDIG";
}

function leesDatum(
  waarde: string,
) {
  if (!waarde) {
    return null;
  }

  const datum =
    new Date(
      `${waarde}T00:00:00.000Z`,
    );

  return Number.isNaN(
    datum.getTime(),
  )
    ? null
    : datum;
}

function maakAdres({
  inspectielocatie,
  straat,
  huisnummer,
  postcode,
  gemeente,
  extraAdresDetails,
}: {
  inspectielocatie: string;
  straat: string;
  huisnummer: string;
  postcode: string;
  gemeente: string;
  extraAdresDetails: string;
}) {
  const straatEnNummer = [
    straat,
    huisnummer,
  ]
    .filter(Boolean)
    .join(" ");

  const postcodeEnGemeente = [
    postcode,
    gemeente,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    [
      straatEnNummer,
      postcodeEnGemeente,
      extraAdresDetails,
    ]
      .filter(Boolean)
      .join(", ") ||
    inspectielocatie ||
    null
  );
}

export async function wijzigTerreincontrole(
  id: number,
  _vorigeStatus: ActieStatus,
  formData: FormData,
): Promise<ActieStatus> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return {
      fout:
        "Ongeldige terreincontrole.",
    };
  }

  const bestaandeTerreincontrole =
    await prisma.terreincontrole.findFirst(
      {
        where: {
          id,
          verwijderdOp: null,
          afwezigOp: null,
        },
        select: {
          id: true,
        },
      },
    );

  if (!bestaandeTerreincontrole) {
    return {
      fout:
        "De terreincontrole bestaat niet of werd verwijderd.",
    };
  }

  const auditeur =
    leesTekst(
      formData,
      "auditeur",
    );

  if (
    !isGeldigeTerreincontroleAuditeur(
      auditeur,
    )
  ) {
    return {
      fout:
        "Selecteer een geldige auditeur.",
    };
  }

  const status = leesStatus(
    leesTekst(
      formData,
      "status",
    ),
  );

  if (
    status === "ONGELDIG"
  ) {
    return {
      fout:
        "De geselecteerde status is ongeldig.",
    };
  }

  const inspectielocatie =
    leesTekst(
      formData,
      "inspectielocatie",
    );

  if (!inspectielocatie) {
    return {
      fout:
        "Inspectielocatie is verplicht.",
    };
  }

  if (
    inspectielocatie.length >
    1000
  ) {
    return {
      fout:
        "Inspectielocatie mag maximaal 1000 tekens bevatten.",
    };
  }

  const attestUrl =
    leesTekst(
      formData,
      "attestUrl",
    );

  const attestIdInvoer =
    leesTekst(
      formData,
      "attestId",
    );

  let attestId =
    UUID_PATROON.test(
      attestIdInvoer,
    )
      ? attestIdInvoer.toLowerCase()
      : null;

  if (
    !attestId &&
    attestUrl
  ) {
    attestId =
      haalAttestIdUitUrl(
        attestUrl,
      );
  }

  if (!attestId) {
    return {
      fout:
        "Vul een geldige Attest-ID in of gebruik een geldige OVAM-kwaliteitspagina.",
    };
  }

  const bouwjaarTekst =
    leesTekst(
      formData,
      "bouwjaar",
    );

  let bouwjaar: number | null =
    null;

  if (bouwjaarTekst) {
    bouwjaar = Number(
      bouwjaarTekst,
    );

    if (
      !Number.isInteger(
        bouwjaar,
      ) ||
      bouwjaar < 1000 ||
      bouwjaar > 9999
    ) {
      return {
        fout:
          "Bouwjaar moet uit vier cijfers bestaan.",
      };
    }
  }

  const vloeroppervlakteTekst =
    leesTekst(
      formData,
      "vloeroppervlakteM2",
    ).replace(",", ".");

  let vloeroppervlakteM2:
    | string
    | null = null;

  if (
    vloeroppervlakteTekst
  ) {
    const numeriekeOppervlakte =
      Number(
        vloeroppervlakteTekst,
      );

    if (
      !Number.isFinite(
        numeriekeOppervlakte,
      ) ||
      numeriekeOppervlakte < 0
    ) {
      return {
        fout:
          "Vloeroppervlakte moet een geldig positief getal zijn.",
      };
    }

    vloeroppervlakteM2 =
      vloeroppervlakteTekst;
  }

  const datumTekst =
    leesTekst(
      formData,
      "datumPlaatsbezoek",
    );

  const datumPlaatsbezoek =
    leesDatum(datumTekst);

  if (
    datumTekst &&
    !datumPlaatsbezoek
  ) {
    return {
      fout:
        "Datum plaatsbezoek is ongeldig.",
    };
  }

  const uurPlaatsbezoek =
    leesTekst(
      formData,
      "uurPlaatsbezoek",
    );

  if (
    uurPlaatsbezoek &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      uurPlaatsbezoek,
    )
  ) {
    return {
      fout:
        "Uur plaatsbezoek moet in het formaat UU:MM staan.",
    };
  }

  const straat =
    leesTekst(
      formData,
      "straat",
    );

  const huisnummer =
    leesTekst(
      formData,
      "huisnummer",
    );

  const postcode =
    leesTekst(
      formData,
      "postcode",
    );

  const gemeente =
    leesTekst(
      formData,
      "gemeente",
    );

  const extraAdresDetails =
    leesTekst(
      formData,
      "extraAdresDetails",
    );

  const opmerkingen =
    leesTekst(
      formData,
      "opmerkingen",
    );

  if (
    opmerkingen.length > 5000
  ) {
    return {
      fout:
        "Opmerkingen mogen maximaal 5000 tekens bevatten.",
    };
  }

  const factuurVerzonden =
    leesFactuurVerzonden(
      leesTekst(
        formData,
        "factuurVerzonden",
      ),
    );

  if (
    factuurVerzonden ===
    "ONGELDIG"
  ) {
    return {
      fout:
        "Selecteer een geldige factuurstatus.",
    };
  }

  const adres = maakAdres({
    inspectielocatie,
    straat,
    huisnummer,
    postcode,
    gemeente,
    extraAdresDetails,
  });

  try {
    await prisma.terreincontrole.update(
      {
        where: {
          id,
        },
        data: {
          auditeur,
          status,

          factuurVerzonden,

          inspectielocatie,
          bouwjaar,
          vloeroppervlakteM2,

          datumPlaatsbezoek,

          uurPlaatsbezoek:
            uurPlaatsbezoek
              ? uurNaarDatabaseTijd(
                  uurPlaatsbezoek,
                )
              : null,

          ovamId:
            leesOptioneleTekst(
              formData,
              "ovamId",
            ),

          naamAdi:
            leesOptioneleTekst(
              formData,
              "naamAdi",
            ),

          attestUrl:
            attestUrl || null,

          bedrijfsnaam:
            leesOptioneleTekst(
              formData,
              "bedrijfsnaam",
            ),

          postcode:
            postcode || null,

          gemeente:
            gemeente || null,

          straat:
            straat || null,

          huisnummer:
            huisnummer ||
            null,

          extraAdresDetails:
            extraAdresDetails ||
            null,

          perceelGemeenteCode:
            leesOptioneleTekst(
              formData,
              "perceelGemeenteCode",
            ),

          perceelAfdelingscode:
            leesOptioneleTekst(
              formData,
              "perceelAfdelingscode",
            ),

          perceelSectieCode:
            leesOptioneleTekst(
              formData,
              "perceelSectieCode",
            ),

          adres,
          attestId,

          opmerkingen:
            opmerkingen || null,
        },
      },
    );
  } catch (fout) {
    console.error(
      "Terreincontrole wijzigen mislukt:",
      fout,
    );

    return {
      fout:
        "Opslaan is mislukt. Controleer of de Attest-ID al bij een andere terreincontrole wordt gebruikt.",
    };
  }

  revalidatePath(
    "/terreincontroles-inplannen",
  );

  revalidatePath(
    `/terreincontroles-inplannen/${id}`,
  );

  redirect(
    `/terreincontroles-inplannen/${id}`,
  );
}


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

type FormulierStatus = {
  fout: string;
};

type Status =
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

  if (
    typeof waarde !== "string"
  ) {
    return "";
  }

  return waarde.trim();
}

function leesOptioneleTekst(
  formData: FormData,
  naam: string,
) {
  const waarde =
    leesTekst(
      formData,
      naam,
    );

  return waarde || null;
}

function leesStatus(
  waarde: string,
): Status | "ONGELDIG" {
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

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return null;
  }

  return datum;
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

  const samengesteldAdres = [
    straatEnNummer,
    postcodeEnGemeente,
    extraAdresDetails,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    samengesteldAdres ||
    inspectielocatie ||
    null
  );
}

export async function maakHandmatigeTerreincontrole(
  _vorigeStatus: FormulierStatus,
  formData: FormData,
): Promise<FormulierStatus> {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

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

  const adres = maakAdres({
    inspectielocatie,
    straat,
    huisnummer,
    postcode,
    gemeente,
    extraAdresDetails,
  });

  let nieuwId: number;

  try {
    const terreincontrole =
      await prisma.terreincontrole.create(
        {
          data: {
            auditeur,
            status,
            factuurVerzonden:
              leesTekst(
                formData,
                "factuurVerzonden",
              ) === "JA",

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
              attestUrl ||
              null,

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
              huisnummer || null,

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

            attestId,
            adres,

            opmerkingen:
              leesOptioneleTekst(
                formData,
                "opmerkingen",
              ),
          },

          select: {
            id: true,
          },
        },
      );

    nieuwId =
      terreincontrole.id;
  } catch (fout) {
    console.error(
      "Handmatige terreincontrole opslaan mislukt:",
      fout,
    );

    return {
      fout:
        "Opslaan is mislukt. Controleer of deze Attest-ID al bestaat.",
    };
  }

  revalidatePath(
    "/terreincontroles-inplannen",
  );

  redirect(
    `/terreincontroles-inplannen/${nieuwId}`,
  );
}


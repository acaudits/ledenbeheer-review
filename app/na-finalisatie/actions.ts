"use server";

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
  prisma,
} from "@/lib/prisma";
import {
  haalAttestIdUitUrl,
} from "@/lib/terreincontrole";

export type NaFinalisatieFormulierStatus = {
  succes?: boolean;
  fout?: string;
};

export type NaFinalisatieActieResultaat = {
  succes: boolean;
  message?: string;
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

type GeldigeInvoer = {
  auditeur: string;
  naamAdi: string | null;
  geregistreerd: boolean;
  linkAttest: string;
  attestnummer: string;
  attestId: string;
  datumNaFinalisatie: Date;
  plaatsbezoek: Plaatsbezoek;
  typeControle: TypeControle;
  reden: string | null;
  opmerking: string;
  inspectielocatie: string | null;
  naamBedrijf: string | null;
  persoonsId: string | null;
};

type InvoerResultaat =
  | {
      geldig: true;
      data: GeldigeInvoer;
    }
  | {
      geldig: false;
      fout: string;
    };

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function leesTekst(
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

function leesGeregistreerd(
  waarde: string,
) {
  if (waarde === "JA") {
    return true;
  }

  if (waarde === "NEE") {
    return false;
  }

  return null;
}

function leesAttestId(
  attestIdInvoer: string,
  linkAttest: string,
) {
  if (
    UUID_PATROON.test(
      attestIdInvoer,
    )
  ) {
    return attestIdInvoer.toLowerCase();
  }

  const uitUrl =
    haalAttestIdUitUrl(
      linkAttest,
    );

  if (
    uitUrl &&
    UUID_PATROON.test(uitUrl)
  ) {
    return uitUrl.toLowerCase();
  }

  return null;
}

function controleerLengte(
  waarde: string | null,
  maximum: number,
) {
  return (
    waarde === null ||
    waarde.length <= maximum
  );
}

function valideerInvoer(
  formData: FormData,
): InvoerResultaat {
  const auditeur =
    leesTekst(
      formData,
      "auditeur",
    );

  const naamAdi =
    leesOptioneleTekst(
      formData,
      "naamAdi",
    );

  const geregistreerd =
    leesGeregistreerd(
      leesTekst(
        formData,
        "geregistreerd",
      ),
    );

  const linkAttest =
    leesTekst(
      formData,
      "linkAttest",
    );

  const attestnummer =
    leesTekst(
      formData,
      "attestnummer",
    ).toUpperCase();

  const datumNaFinalisatie =
    leesDatum(
      leesTekst(
        formData,
        "datumNaFinalisatie",
      ),
    );

  const plaatsbezoek =
    leesPlaatsbezoek(
      leesTekst(
        formData,
        "plaatsbezoek",
      ),
    );

  const typeControle =
    leesTypeControle(
      leesTekst(
        formData,
        "typeControle",
      ),
    );

  const reden =
    leesOptioneleTekst(
      formData,
      "reden",
    );

  const opmerking =
    leesTekst(
      formData,
      "opmerking",
    );

  const inspectielocatie =
    leesOptioneleTekst(
      formData,
      "inspectielocatie",
    );

  const naamBedrijf =
    leesOptioneleTekst(
      formData,
      "naamBedrijf",
    );

  const persoonsId =
    leesOptioneleTekst(
      formData,
      "persoonsId",
    )?.toUpperCase() ??
    null;

  const attestId =
    leesAttestId(
      leesTekst(
        formData,
        "attestId",
      ),
      linkAttest,
    );

  if (!auditeur) {
    return {
      geldig: false,
      fout:
        "Auditeur is verplicht.",
    };
  }

  if (
    geregistreerd === null
  ) {
    return {
      geldig: false,
      fout:
        "Selecteer bij Geregistreerd Ja of Nee.",
    };
  }

  if (!linkAttest) {
    return {
      geldig: false,
      fout:
        "Link Attest is verplicht.",
    };
  }

  try {
    const url =
      new URL(linkAttest);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return {
        geldig: false,
        fout:
          "Link Attest moet een geldige webkoppeling zijn.",
      };
    }
  } catch {
    return {
      geldig: false,
      fout:
        "Link Attest is geen geldige URL.",
    };
  }

  if (!attestnummer) {
    return {
      geldig: false,
      fout:
        "Attestnummer is verplicht.",
    };
  }

  if (!attestId) {
    return {
      geldig: false,
      fout:
        "Vul een geldige Attest-ID in of gebruik een geldige OVAM-attestlink.",
    };
  }

  if (!datumNaFinalisatie) {
    return {
      geldig: false,
      fout:
        "Datum na finalisatie is verplicht en moet een geldige datum zijn.",
    };
  }

  if (!plaatsbezoek) {
    return {
      geldig: false,
      fout:
        "Selecteer een geldig plaatsbezoek.",
    };
  }

  if (!typeControle) {
    return {
      geldig: false,
      fout:
        "Selecteer een geldig type controle.",
    };
  }

  if (
    typeControle !== "GEHEEL" &&
    !reden
  ) {
    return {
      geldig: false,
      fout:
        "Reden is verplicht bij Deels en Enkel van openbare weg.",
    };
  }

  if (!opmerking) {
    return {
      geldig: false,
      fout:
        "Opmerking is verplicht.",
    };
  }

  if (
    !controleerLengte(
      auditeur,
      255,
    )
  ) {
    return {
      geldig: false,
      fout:
        "Auditeur mag maximaal 255 tekens bevatten.",
    };
  }

  if (
    !controleerLengte(
      naamAdi,
      255,
    )
  ) {
    return {
      geldig: false,
      fout:
        "Naam ADI mag maximaal 255 tekens bevatten.",
    };
  }

  if (
    !controleerLengte(
      linkAttest,
      2000,
    )
  ) {
    return {
      geldig: false,
      fout:
        "Link Attest mag maximaal 2000 tekens bevatten.",
    };
  }

  if (
    !controleerLengte(
      attestnummer,
      255,
    )
  ) {
    return {
      geldig: false,
      fout:
        "Attestnummer mag maximaal 255 tekens bevatten.",
    };
  }

  if (
    !controleerLengte(
      naamBedrijf,
      500,
    )
  ) {
    return {
      geldig: false,
      fout:
        "Naam bedrijf mag maximaal 500 tekens bevatten.",
    };
  }

  if (
    !controleerLengte(
      persoonsId,
      100,
    )
  ) {
    return {
      geldig: false,
      fout:
        "PersoonsID mag maximaal 100 tekens bevatten.",
    };
  }

  if (
    opmerking.length > 5000
  ) {
    return {
      geldig: false,
      fout:
        "Opmerking mag maximaal 5000 tekens bevatten.",
    };
  }

  if (
    reden &&
    reden.length > 5000
  ) {
    return {
      geldig: false,
      fout:
        "Reden mag maximaal 5000 tekens bevatten.",
    };
  }

  if (
    inspectielocatie &&
    inspectielocatie.length >
      5000
  ) {
    return {
      geldig: false,
      fout:
        "Inspectielocatie mag maximaal 5000 tekens bevatten.",
    };
  }

  return {
    geldig: true,
    data: {
      auditeur,
      naamAdi,
      geregistreerd,
      linkAttest,
      attestnummer,
      attestId,
      datumNaFinalisatie,
      plaatsbezoek,
      typeControle,
      reden,
      opmerking,
      inspectielocatie,
      naamBedrijf,
      persoonsId,
    },
  };
}

function isGeldigId(
  id: number,
) {
  return (
    Number.isInteger(id) &&
    id > 0
  );
}

function vernieuwPaden(
  id?: number,
) {
  revalidatePath(
    "/na-finalisatie",
  );

  revalidatePath(
    "/na-finalisatie/verwijderd",
  );

  revalidatePath(
    "/mijn-overzicht",
  );

  revalidatePath(
    "/persoonscertificaten",
  );

  if (id) {
    revalidatePath(
      `/na-finalisatie/${id}`,
    );

    revalidatePath(
      `/na-finalisatie/${id}/bewerken`,
    );
  }
}

async function bestaatDuplicaat(
  data: GeldigeInvoer,
  uitgeslotenId?: number,
) {
  return prisma.naFinalisatie.findFirst({
    where: {
      verwijderdOp: null,
      attestId:
        data.attestId,
      datumNaFinalisatie:
        data.datumNaFinalisatie,
      plaatsbezoek:
        data.plaatsbezoek,
      typeControle:
        data.typeControle,

      ...(uitgeslotenId
        ? {
            id: {
              not: uitgeslotenId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });
}

export async function maakNaFinalisatie(
  _vorigeStatus:
    NaFinalisatieFormulierStatus,
  formData: FormData,
): Promise<NaFinalisatieFormulierStatus> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const resultaat =
    valideerInvoer(
      formData,
    );

  if (!resultaat.geldig) {
    return {
      succes: false,
      fout: resultaat.fout,
    };
  }

  const duplicaat =
    await bestaatDuplicaat(
      resultaat.data,
    );

  if (duplicaat) {
    return {
      succes: false,
      fout:
        "Voor dit attest bestaat al een actieve registratie met dezelfde datum, hetzelfde plaatsbezoek en hetzelfde type controle.",
    };
  }

  let nieuwId: number;

  try {
    const registratie =
      await prisma.naFinalisatie.create({
        data:
          resultaat.data,
        select: {
          id: true,
        },
      });

    nieuwId =
      registratie.id;
  } catch (fout) {
    console.error(
      "Na finalisatie aanmaken mislukt:",
      fout,
    );

    return {
      succes: false,
      fout:
        "De registratie kon niet worden opgeslagen.",
    };
  }

  vernieuwPaden(
    nieuwId,
  );

  redirect(
    `/na-finalisatie/${nieuwId}`,
  );
}

export async function bewerkNaFinalisatie(
  id: number,
  _vorigeStatus:
    NaFinalisatieFormulierStatus,
  formData: FormData,
): Promise<NaFinalisatieFormulierStatus> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  if (!isGeldigId(id)) {
    return {
      succes: false,
      fout:
        "Ongeldige registratie.",
    };
  }

  const resultaat =
    valideerInvoer(
      formData,
    );

  if (!resultaat.geldig) {
    return {
      succes: false,
      fout: resultaat.fout,
    };
  }

  const duplicaat =
    await bestaatDuplicaat(
      resultaat.data,
      id,
    );

  if (duplicaat) {
    return {
      succes: false,
      fout:
        "Voor dit attest bestaat al een andere actieve registratie met dezelfde datum, hetzelfde plaatsbezoek en hetzelfde type controle.",
    };
  }

  try {
    const bijgewerkt =
      await prisma.naFinalisatie.updateMany({
        where: {
          id,
          verwijderdOp: null,
        },
        data:
          resultaat.data,
      });

    if (
      bijgewerkt.count === 0
    ) {
      return {
        succes: false,
        fout:
          "De registratie bestaat niet of werd verwijderd.",
      };
    }
  } catch (fout) {
    console.error(
      "Na finalisatie bijwerken mislukt:",
      fout,
    );

    return {
      succes: false,
      fout:
        "De registratie kon niet worden bijgewerkt.",
    };
  }

  vernieuwPaden(id);

  redirect(
    `/na-finalisatie/${id}`,
  );
}

export async function verwijderNaFinalisatie(
  id: number,
): Promise<NaFinalisatieActieResultaat> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  if (!isGeldigId(id)) {
    return {
      succes: false,
      message:
        "Ongeldige registratie.",
    };
  }

  try {
    const verwijderd =
      await prisma.naFinalisatie.updateMany({
        where: {
          id,
          verwijderdOp: null,
        },
        data: {
          verwijderdOp:
            new Date(),
        },
      });

    if (
      verwijderd.count === 0
    ) {
      return {
        succes: false,
        message:
          "De registratie bestaat niet of werd al verwijderd.",
      };
    }

    vernieuwPaden(id);

    return {
      succes: true,
    };
  } catch (fout) {
    console.error(
      "Na finalisatie verwijderen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De registratie kon niet worden verwijderd.",
    };
  }
}

export async function herstelNaFinalisatie(
  id: number,
): Promise<NaFinalisatieActieResultaat> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  if (!isGeldigId(id)) {
    return {
      succes: false,
      message:
        "Ongeldige registratie.",
    };
  }

  try {
    const hersteld =
      await prisma.naFinalisatie.updateMany({
        where: {
          id,
          verwijderdOp: {
            not: null,
          },
        },
        data: {
          verwijderdOp: null,
        },
      });

    if (
      hersteld.count === 0
    ) {
      return {
        succes: false,
        message:
          "De registratie bestaat niet of werd al hersteld.",
      };
    }

    vernieuwPaden(id);

    return {
      succes: true,
    };
  } catch (fout) {
    console.error(
      "Na finalisatie herstellen mislukt:",
      fout,
    );

    return {
      succes: false,
      message:
        "De registratie kon niet worden hersteld.",
    };
  }
}

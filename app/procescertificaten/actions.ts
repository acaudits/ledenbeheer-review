"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisMachtiging } from "@/lib/auth";
import {
  isGeldigOndernemingsnummer,
  normaliseerOndernemingsnummer,
  ondernemingsnummerFoutmelding,
} from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export type ProcescertificaatFormState = {
  message?: string;
  errors?: {
    naamBedrijf?: string;
    kboNummer?: string;
    certificaatnummer?: string;
    uitgereiktOp?: string;
    oneDrive?: string;
    opmerking?: string;
    ondernemingstype?: string;
  };
};

function tekst(
  formData: FormData,
  veld: string,
) {
  return String(
    formData.get(veld) ?? "",
  ).trim();
}

function optioneleTekst(
  formData: FormData,
  veld: string,
) {
  const waarde = tekst(
    formData,
    veld,
  );

  return waarde || null;
}

function leesDatum(
  waarde: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      waarde,
    )
  ) {
    return null;
  }

  const datum = new Date(
    `${waarde}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(datum.getTime()) ||
    datum.toISOString().slice(0, 10) !==
      waarde
  ) {
    return null;
  }

  return datum;
}

function isGeldigeUrl(
  waarde: string,
) {
  try {
    const url = new URL(waarde);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isUniekheidsfout(
  fout: unknown,
) {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

export async function maakProcescertificaatAan(
  _vorigeStatus: ProcescertificaatFormState,
  formData: FormData,
): Promise<ProcescertificaatFormState> {
  await vereisMachtiging("CERTIFICATEN_BEHEREN");

  const naamBedrijf = tekst(
    formData,
    "naamBedrijf",
  );

  const kboNummer =
    normaliseerOndernemingsnummer(
      tekst(
        formData,
        "kboNummer",
      ),
    );

  const certificaatnummer = tekst(
    formData,
    "certificaatnummer",
  ).toUpperCase();

  const uitgereiktOpWaarde = tekst(
    formData,
    "uitgereiktOp",
  );

  const oneDrive = optioneleTekst(
    formData,
    "oneDrive",
  );

  const opmerking = optioneleTekst(
    formData,
    "opmerking",
  );

  const ondernemingstypeWaarde = tekst(
    formData,
    "ondernemingstype",
  );

  const ondernemingstype =
    ondernemingstypeWaarde ===
      "EENMANSZAAK" ||
    ondernemingstypeWaarde ===
      "BEDRIJF"
      ? ondernemingstypeWaarde
      : null;

  const errors: NonNullable<
    ProcescertificaatFormState["errors"]
  > = {};

  if (!naamBedrijf) {
    errors.naamBedrijf =
      "Naam bedrijf is verplicht.";
  } else if (
    naamBedrijf.length > 500
  ) {
    errors.naamBedrijf =
      "Naam bedrijf is te lang.";
  }

  if (!kboNummer) {
    errors.kboNummer =
      "Ondernemingsnummer is verplicht.";
  } else if (
    !isGeldigOndernemingsnummer(
      kboNummer,
    )
  ) {
    errors.kboNummer =
      ondernemingsnummerFoutmelding();
  }

  if (!certificaatnummer) {
    errors.certificaatnummer =
      "Certificaatnummer is verplicht.";
  } else if (
    certificaatnummer.length > 255
  ) {
    errors.certificaatnummer =
      "Certificaatnummer is te lang.";
  }

  if (!ondernemingstype) {
    errors.ondernemingstype =
      "Kies eenmanszaak of bedrijf.";
  }

  let uitgereiktOp: Date | null =
    null;

  if (uitgereiktOpWaarde) {
    uitgereiktOp = leesDatum(
      uitgereiktOpWaarde,
    );

    if (!uitgereiktOp) {
      errors.uitgereiktOp =
        "Vul een geldige datum in.";
    }
  }

  if (
    oneDrive &&
    !isGeldigeUrl(oneDrive)
  ) {
    errors.oneDrive =
      "Vul een geldige OneDrive-URL in.";
  }

  if (
    opmerking &&
    opmerking.length > 5000
  ) {
    errors.opmerking =
      "Opmerking mag maximaal 5000 tekens bevatten.";
  }

  if (
    Object.keys(errors).length > 0
  ) {
    return {
      message:
        "Controleer de gemarkeerde velden.",
      errors,
    };
  }

  if (!ondernemingstype) {
    return {
      message:
        "Kies een ondernemingstype.",
      errors: {
        ondernemingstype:
          "Kies eenmanszaak of bedrijf.",
      },
    };
  }

  const [
    bestaandNummer,
    bestaandCertificaat,
  ] = await Promise.all([
    prisma.procescertificaat.findUnique({
      where: {
        kboNummer,
      },
      select: {
        id: true,
      },
    }),

    prisma.procescertificaat.findUnique({
      where: {
        certificaatnummer,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (bestaandNummer) {
    errors.kboNummer =
      "Dit ondernemingsnummer bestaat al.";
  }

  if (bestaandCertificaat) {
    errors.certificaatnummer =
      "Dit certificaatnummer bestaat al.";
  }

  if (
    Object.keys(errors).length > 0
  ) {
    return {
      message:
        "Het procescertificaat kan niet worden opgeslagen.",
      errors,
    };
  }

  try {
    await prisma.procescertificaat.create({
      data: {
        naamBedrijf,
        kboNummer,
        certificaatnummer,
        uitgereiktOp,
        oneDrive,
        opmerking,
        ondernemingstype,
      },
    });
  } catch (fout) {
    if (isUniekheidsfout(fout)) {
      return {
        message:
          "Het ondernemingsnummer of certificaatnummer bestaat al.",
        errors: {
          kboNummer:
            "Controleer of dit ondernemingsnummer al bestaat.",
          certificaatnummer:
            "Controleer of dit certificaatnummer al bestaat.",
        },
      };
    }

    console.error(
      "Procescertificaat opslaan mislukt:",
      fout,
    );

    return {
      message:
        "Er is een technische fout opgetreden. Probeer opnieuw.",
    };
  }

  revalidatePath("/");
  revalidatePath(
    "/procescertificaten",
  );

  redirect(
    "/procescertificaten?toegevoegd=1",
  );
}

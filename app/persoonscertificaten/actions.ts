"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type LidFormState = {
  message?: string;
  errors?: {
    naamPersoon?: string;
    mailadres?: string;
    ovamId?: string;
    certificaatnummer?: string;
    uitgereiktOp?: string;
    certificatiePlatform?: string;
  };
};

function verplichteTekst(formData: FormData, veld: string) {
  return String(formData.get(veld) ?? "").trim();
}

function optioneleTekst(formData: FormData, veld: string) {
  const waarde = String(formData.get(veld) ?? "").trim();
  return waarde || null;
}

export async function maakLidAan(
  _vorigeStatus: LidFormState,
  formData: FormData,
): Promise<LidFormState> {
  const naamPersoon = verplichteTekst(
    formData,
    "naamPersoon",
  );

  const telefoonnummer = optioneleTekst(
    formData,
    "telefoonnummer",
  );

  const mailadres =
    optioneleTekst(formData, "mailadres")?.toLowerCase() ??
    null;

  const ovamId = verplichteTekst(
    formData,
    "ovamId",
  ).toUpperCase();

  const certificaatnummer = verplichteTekst(
    formData,
    "certificaatnummer",
  ).toUpperCase();

  const uitgereiktOpWaarde = verplichteTekst(
    formData,
    "uitgereiktOp",
  );

  const bedrijf = optioneleTekst(formData, "bedrijf");

  const aansluiting = optioneleTekst(
    formData,
    "aansluiting",
  );

  const opmerking = optioneleTekst(
    formData,
    "opmerking",
  );

  const certificatiePlatform = optioneleTekst(
    formData,
    "certificatiePlatform",
  );

  const errors: NonNullable<LidFormState["errors"]> = {};

  if (!naamPersoon) {
    errors.naamPersoon = "Naam persoon is verplicht.";
  }

  if (!ovamId) {
    errors.ovamId = "OVAM-ID is verplicht.";
  }

  if (!certificaatnummer) {
    errors.certificaatnummer =
      "Certificaatnummer is verplicht.";
  }

  if (
    mailadres &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailadres)
  ) {
    errors.mailadres = "Vul een geldig e-mailadres in.";
  }

  let uitgereiktOp: Date | null = null;

  if (uitgereiktOpWaarde) {
    uitgereiktOp = new Date(
      `${uitgereiktOpWaarde}T00:00:00.000Z`,
    );

    if (Number.isNaN(uitgereiktOp.getTime())) {
      errors.uitgereiktOp = "Vul een geldige datum in.";
    }
  }

  if (certificatiePlatform) {
    try {
      const url = new URL(certificatiePlatform);

      if (!["http:", "https:"].includes(url.protocol)) {
        errors.certificatiePlatform =
          "De URL moet met http:// of https:// beginnen.";
      }
    } catch {
      errors.certificatiePlatform =
        "Vul een geldige URL in, bijvoorbeeld https://platform.be.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: "Controleer de gemarkeerde velden.",
      errors,
    };
  }

  const [bestaandOvam, bestaandCertificaat] =
    await Promise.all([
      prisma.lid.findUnique({
        where: {
          ovamId,
        },
        select: {
          id: true,
        },
      }),

      prisma.lid.findUnique({
        where: {
          certificaatnummer,
        },
        select: {
          id: true,
        },
      }),
    ]);

  if (bestaandOvam) {
    errors.ovamId = "Dit OVAM-ID bestaat al.";
  }

  if (bestaandCertificaat) {
    errors.certificaatnummer =
      "Dit certificaatnummer bestaat al.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: "Het lid kan niet worden opgeslagen.",
      errors,
    };
  }

  try {
    await prisma.lid.create({
      data: {
        naamPersoon,
        telefoonnummer,
        mailadres,
        ovamId,
        certificaatnummer,
        uitgereiktOp,
        bedrijf,
        aansluiting,
        opmerking,
        certificatiePlatform,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        message:
          "Het OVAM-ID of certificaatnummer bestaat al.",
      };
    }

    console.error("Lid opslaan mislukt:", error);

    return {
      message:
        "Er is een technische fout opgetreden. Probeer opnieuw.",
    };
  }

  revalidatePath("/persoonscertificaten");
  redirect("/persoonscertificaten?toegevoegd=1");
}

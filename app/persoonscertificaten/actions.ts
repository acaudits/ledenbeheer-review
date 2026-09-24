"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normaliseerTelefoonnummer } from "@/lib/telefoonnummer";

export type LidFormState = {
  message?: string;
  errors?: Record<string, string>;
};

function tekst(formData: FormData, veld: string) {
  return String(formData.get(veld) ?? "").trim();
}

function optioneleTekst(formData: FormData, veld: string) {
  return tekst(formData, veld) || null;
}

function leesJaNee(formData: FormData, veld: string) {
  const waarde = tekst(formData, veld);

  if (waarde === "JA") {
    return true;
  }

  if (waarde === "NEE") {
    return false;
  }

  return null;
}

function leesDatum(waarde: string | null): Date | null | "ONGELDIG" {
  if (!waarde) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(waarde)) {
    return "ONGELDIG";
  }

  const datum = new Date(`${waarde}T00:00:00.000Z`);

  if (
    Number.isNaN(datum.getTime()) ||
    datum.toISOString().slice(0, 10) !== waarde
  ) {
    return "ONGELDIG";
  }

  return datum;
}

export async function maakLidAan(
  _vorigeStatus: LidFormState,
  formData: FormData,
): Promise<LidFormState> {
  await vereisMachtiging("CERTIFICATEN_BEHEREN");

  const errors: Record<string, string> = {};

  const lidSoortWaarde = tekst(formData, "lidSoort");
  const lidSoort =
    lidSoortWaarde === "NIEUW_LID" || lidSoortWaarde === "OVERNAME"
      ? lidSoortWaarde
      : null;

  const naamPersoon = tekst(formData, "naamPersoon");
  const telefoonnummerInvoer = optioneleTekst(formData, "telefoonnummer");
  const telefoonnummer = normaliseerTelefoonnummer(telefoonnummerInvoer);
  const mailadres =
    optioneleTekst(formData, "mailadres")?.toLowerCase() ?? null;
  const ovamId = tekst(formData, "ovamId").toUpperCase();
  const certificaatnummer = tekst(formData, "certificaatnummer").toUpperCase();
  const bedrijf = optioneleTekst(formData, "bedrijf");
  const certificatiePlatform = optioneleTekst(formData, "certificatiePlatform");
  const opmerking = optioneleTekst(formData, "opmerking");

  const aansluitingWaarde = tekst(formData, "aansluiting");
  const aansluiting =
    aansluitingWaarde === "JA"
      ? "Ja"
      : aansluitingWaarde === "NEE"
        ? "Nee"
        : null;

  const praktijkBijscholingGevolgd = leesJaNee(
    formData,
    "praktijkBijscholingGevolgd",
  );
  const bijscholing2026Gevolgd = leesJaNee(formData, "bijscholing2026Gevolgd");
  const begeleidingstraject = leesJaNee(formData, "begeleidingstraject");

  const uitgereiktOpResultaat = leesDatum(
    optioneleTekst(formData, "uitgereiktOp"),
  );
  const verzekeringResultaat = leesDatum(
    optioneleTekst(formData, "verzekeringVerlooptOp"),
  );

  if (!lidSoort) {
    errors.lidSoort = "Kies Nieuw lid of Overname.";
  }

  if (!naamPersoon) {
    errors.naamPersoon = "Naam persoon is verplicht.";
  }

  if (!ovamId) {
    errors.ovamId = "OVAM-ID is verplicht.";
  }

  if (!certificaatnummer) {
    errors.certificaatnummer = "Certificaatnummer is verplicht.";
  }

  if (telefoonnummerInvoer && !telefoonnummer) {
    errors.telefoonnummer =
      "Vul een geldig telefoonnummer in, bijvoorbeeld +32488907867.";
  }

  if (mailadres && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailadres)) {
    errors.mailadres = "Vul een geldig e-mailadres in.";
  }

  if (uitgereiktOpResultaat === "ONGELDIG") {
    errors.uitgereiktOp = "Vul een geldige datum in.";
  }

  if (verzekeringResultaat === "ONGELDIG") {
    errors.verzekeringVerlooptOp = "Vul een geldige datum in.";
  }

  if (!aansluiting) {
    errors.aansluiting = "Kies Ja of Nee.";
  }

  if (praktijkBijscholingGevolgd === null) {
    errors.praktijkBijscholingGevolgd = "Kies Ja of Nee.";
  }

  if (bijscholing2026Gevolgd === null) {
    errors.bijscholing2026Gevolgd = "Kies Ja of Nee.";
  }

  if (begeleidingstraject === null) {
    errors.begeleidingstraject = "Kies Ja of Nee.";
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
        "Vul een geldige certificatieplatform-URL in.";
    }
  }

  let overgekomenVan: "COPRO" | "DNV" | null = null;
  let aantalAttestenAndereCi2026: number | null = null;
  let controleverslagenOvergenomen: boolean | null = null;
  let officieleKlachten: boolean | null = null;
  let officieleKlachtenToelichting: string | null = null;

  if (lidSoort === "OVERNAME") {
    const overgekomenVanWaarde = tekst(formData, "overgekomenVan");

    if (overgekomenVanWaarde === "COPRO" || overgekomenVanWaarde === "DNV") {
      overgekomenVan = overgekomenVanWaarde;
    } else {
      errors.overgekomenVan = "Kies Copro of DNV.";
    }

    const aantalWaarde = tekst(formData, "aantalAttestenAndereCi2026");

    if (!/^\d+$/.test(aantalWaarde)) {
      errors.aantalAttestenAndereCi2026 = "Vul een geheel getal vanaf 0 in.";
    } else {
      aantalAttestenAndereCi2026 = Number(aantalWaarde);

      if (!Number.isSafeInteger(aantalAttestenAndereCi2026)) {
        errors.aantalAttestenAndereCi2026 = "Het opgegeven aantal is te groot.";
      }
    }

    const controleWaarde = tekst(formData, "controleverslagenOvergenomen");

    if (controleWaarde === "JA") {
      controleverslagenOvergenomen = true;
    } else if (controleWaarde === "NEE") {
      controleverslagenOvergenomen = false;
    } else if (controleWaarde !== "") {
      errors.controleverslagenOvergenomen = "Kies Ja, Nee of Niet ingevuld.";
    }

    officieleKlachten = leesJaNee(formData, "officieleKlachten");

    if (officieleKlachten === null) {
      errors.officieleKlachten = "Kies Ja of Nee.";
    }

    officieleKlachtenToelichting = optioneleTekst(
      formData,
      "officieleKlachtenToelichting",
    );

    if (officieleKlachten === true && !officieleKlachtenToelichting) {
      errors.officieleKlachtenToelichting =
        "Beschrijf welke officiële klachten er zijn.";
    }

    if (officieleKlachten === false) {
      officieleKlachtenToelichting = null;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      message: "Controleer de gemarkeerde velden.",
      errors,
    };
  }

  const [bestaandOvam, bestaandCertificaat] = await Promise.all([
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
    errors.certificaatnummer = "Dit certificaatnummer bestaat al.";
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
        uitgereiktOp:
          uitgereiktOpResultaat === "ONGELDIG" ? null : uitgereiktOpResultaat,
        bedrijf,
        aansluiting,
        verzekeringVerlooptOp:
          verzekeringResultaat === "ONGELDIG" ? null : verzekeringResultaat,
        praktijkBijscholingGevolgd,
        bijscholing2026Gevolgd,
        lidSoort,
        begeleidingstraject: begeleidingstraject ?? false,
        overgekomenVan,
        aantalAttestenAndereCi2026,
        controleverslagenOvergenomen,
        officieleKlachten,
        officieleKlachtenToelichting,
        certificatiePlatform,
        opmerking,
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
        message: "Het OVAM-ID of certificaatnummer bestaat al.",
      };
    }

    console.error("Lid opslaan mislukt:", error);

    return {
      message: "Er is een technische fout opgetreden. Probeer opnieuw.",
    };
  }

  revalidatePath("/persoonscertificaten");
  revalidatePath("/begeleiding-starters");

  redirect("/persoonscertificaten?toegevoegd=1");
}

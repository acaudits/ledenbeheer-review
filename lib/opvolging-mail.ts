import "server-only";

import { createHash } from "node:crypto";
import { htmlToText } from "html-to-text";
import PostalMime from "postal-mime";

const MAX_BESTANDSGROOTTE = 10 * 1024 * 1024;
const MAX_TEKSTLENGTE = 1_000_000;

type MailAdres = {
  naam: string | null;
  email: string;
};

export type BijlageReferentie = {
  bestandsnaam: string;
  mimeType: string;
  bestandsgrootte: number;
  contentId: string | null;
  inline: boolean;
  opgeslagen: false;
};

export type TeAnalyserenOpvolgingMail = {
  bestandsnaam: string;
  mimeType: string;
  bestandsgrootte: number;
  bytes: () => Promise<Uint8Array>;
};

export type GeparseerdeOpvolgingMail = {
  bestandsnaam: string;
  bestandstype: "EML";
  mimeType: "message/rfc822";
  bestandsgrootte: number;
  sha256: string;
  afzenderNaam: string | null;
  afzenderEmail: string;
  ontvangers: MailAdres[];
  cc: MailAdres[];
  onderwerp: string | null;
  berichtId: string | null;
  verzondenOp: Date;
  tekstInhoud: string;
  bijlagen: BijlageReferentie[];
  internVerzonden: boolean;
};

type OnbekendAdres = {
  name?: unknown;
  address?: unknown;
  group?: unknown;
};

function normaliseerEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isInternEmailadres(email: string): boolean {
  return (
    email.endsWith("@asbest-certificaat.be") ||
    email.endsWith("@skh.be")
  );
}

function normaliseerAdressen(waarde: unknown): MailAdres[] {
  const resultaat: MailAdres[] = [];

  function voegToe(invoer: unknown): void {
    if (Array.isArray(invoer)) {
      invoer.forEach(voegToe);
      return;
    }

    if (!invoer || typeof invoer !== "object") {
      return;
    }

    const adres = invoer as OnbekendAdres;

    if (Array.isArray(adres.group)) {
      adres.group.forEach(voegToe);
      return;
    }

    const email = normaliseerEmail(adres.address);

    if (email) {
      resultaat.push({
        naam:
          typeof adres.name === "string" && adres.name.trim()
            ? adres.name.trim()
            : null,
        email,
      });
    }
  }

  voegToe(waarde);
  return resultaat;
}

function leesAttribuut(tag: string, attribuut: string): string | null {
  const resultaat = tag.match(
    new RegExp(
      `${attribuut}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );

  return resultaat?.[1] ?? resultaat?.[2] ?? resultaat?.[3] ?? null;
}

function maakAfbeeldingReferentie(tag: string): string {
  const bron = leesAttribuut(tag, "src");
  const alt = leesAttribuut(tag, "alt");

  if (!bron || bron.toLowerCase().startsWith("data:")) {
    return `[Inline afbeelding${alt ? `: ${alt}` : ""} – niet opgeslagen]`;
  }

  if (bron.toLowerCase().startsWith("cid:")) {
    return `[Inline afbeelding: ${bron} – niet opgeslagen]`;
  }

  if (/^https?:\/\//i.test(bron)) {
    return `[Afbeelding: ${bron}]`;
  }

  return `[Inline afbeelding${alt ? `: ${alt}` : ""} – niet opgeslagen]`;
}

function maakLeesbareTekst(
  platteTekst: string | undefined,
  html: string | undefined,
): string {
  const basis =
    platteTekst?.trim() ||
    (html
      ? htmlToText(
          html.replace(/<img\b[^>]*>/gi, ""),
          {
            preserveNewlines: true,
            wordwrap: false,
          },
        ).trim()
      : "");

  const referenties = html
    ? [...html.matchAll(/<img\b[^>]*>/gi)].map((match) =>
        maakAfbeeldingReferentie(match[0]),
      )
    : [];

  return [...new Set([basis, ...referenties].filter(Boolean))]
    .join("\n\n")
    .slice(0, MAX_TEKSTLENGTE);
}

function bepaalInhoudGrootte(
  inhoud: string | ArrayBuffer | Uint8Array | undefined,
): number {
  if (typeof inhoud === "string") {
    return Buffer.byteLength(inhoud, "utf8");
  }

  return inhoud?.byteLength ?? 0;
}

function veiligeBestandsnaam(bestandsnaam: string): string {
  const waarde = bestandsnaam.trim();

  if (
    !waarde ||
    waarde.length > 255 ||
    waarde.includes("/") ||
    waarde.includes("\\") ||
    waarde.includes("\0")
  ) {
    throw new Error("De bestandsnaam is ongeldig.");
  }

  return waarde;
}

export async function parseOpvolgingMailBestand(
  bestand: TeAnalyserenOpvolgingMail,
): Promise<GeparseerdeOpvolgingMail> {
  const bestandsnaam = veiligeBestandsnaam(bestand.bestandsnaam);

  if (!bestandsnaam.toLowerCase().endsWith(".eml")) {
    throw new Error("Alleen .eml-bestanden zijn toegestaan.");
  }

  if (bestand.bestandsgrootte <= 0 || bestand.bestandsgrootte > MAX_BESTANDSGROOTTE) {
    throw new Error("Het EML-bestand moet tussen 1 byte en 10 MB groot zijn.");
  }

  const bytes = await bestand.bytes();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const mail = await PostalMime.parse(bytes);

  const afzenderEmail = normaliseerEmail(mail.from?.address);

  if (!afzenderEmail || !afzenderEmail.includes("@")) {
    throw new Error("De afzender van het EML-bestand is ongeldig.");
  }

  const verzondenOp = mail.date ? new Date(mail.date) : new Date();

  if (Number.isNaN(verzondenOp.getTime())) {
    throw new Error("De verzenddatum van het EML-bestand is ongeldig.");
  }

  const bijlagen: BijlageReferentie[] = (mail.attachments ?? []).map(
    (bijlage, index) => ({
      bestandsnaam:
        bijlage.filename?.trim() || `bijlage-${index + 1}`,
      mimeType:
        bijlage.mimeType?.trim() || "application/octet-stream",
      bestandsgrootte: bepaalInhoudGrootte(bijlage.content),
      contentId: bijlage.contentId?.trim() || null,
      inline:
        bijlage.related === true ||
        bijlage.disposition?.toLowerCase() === "inline",
      opgeslagen: false,
    }),
  );

  return {
    bestandsnaam,
    bestandstype: "EML",
    mimeType: "message/rfc822",
    bestandsgrootte: bestand.bestandsgrootte,
    sha256,
    afzenderNaam: mail.from?.name?.trim() || null,
    afzenderEmail,
    ontvangers: normaliseerAdressen(mail.to),
    cc: normaliseerAdressen(mail.cc),
    onderwerp: mail.subject?.trim() || null,
    berichtId: mail.messageId?.trim() || null,
    verzondenOp,
    tekstInhoud: maakLeesbareTekst(mail.text, mail.html),
    bijlagen,
    internVerzonden: isInternEmailadres(afzenderEmail),

    // Originele EML en attachment-bytes worden bewust niet teruggegeven.
  };
}

// Compatibele naam voor de bestaande uploadroute.
export const analyseerOpvolgingMail = parseOpvolgingMailBestand;

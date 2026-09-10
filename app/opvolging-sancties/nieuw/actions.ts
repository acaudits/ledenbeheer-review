"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";

import {
  schrijfAuditlog,
} from "@/lib/auditlog";
import {
  ontleedDatumInvoer,
  valideerOpvolgingSanctieInvoer,
} from "@/lib/opvolging-sancties";
import {
  vereisOpvolgingSanctieBeheer,
} from "@/lib/opvolging-sanctie-toegang";
import {
  prisma,
} from "@/lib/prisma";

export type NieuweOpvolgingStatus = {
  fout?: string;
  succes?: string;
};

function tekst(
  formData: FormData,
  naam: string,
  maximum: number,
) {
  return String(
    formData.get(naam) ?? "",
  )
    .trim()
    .slice(0, maximum);
}

function optioneelId(
  formData: FormData,
  naam: string,
) {
  const waarde =
    tekst(formData, naam, 20);

  if (!waarde) {
    return null;
  }

  const id = Number(waarde);

  return Number.isInteger(id) &&
    id > 0
    ? id
    : NaN;
}

export async function maakHandmatigeOpvolgingSanctie(
  _vorigeStatus: NieuweOpvolgingStatus,
  formData: FormData,
): Promise<NieuweOpvolgingStatus> {
  const gebruiker =
    await vereisOpvolgingSanctieBeheer(
      "HANDMATIG",
    );

  const validatie =
    valideerOpvolgingSanctieInvoer(
      formData,
    );

  if (!validatie.geldig) {
    return {
      fout: validatie.melding,
    };
  }

  const bedrijfsnaam =
    tekst(
      formData,
      "bedrijfsnaam",
      500,
    );

  const linkAttest =
    tekst(
      formData,
      "linkAttest",
      2048,
    );

  const attestnummer =
    tekst(
      formData,
      "attestnummer",
      255,
    );

  const opmerkingen =
    tekst(
      formData,
      "opmerkingen",
      10_000,
    );

  const lidId =
    optioneelId(
      formData,
      "lidId",
    );

  if (
    Number.isNaN(lidId) ||
    !lidId
  ) {
    return {
      fout:
        "Kies een Naam ADI uit Persoonscertificaten.",
    };
  }

  const geselecteerdLid =
    await prisma.lid.findFirst({
      where: {
        id: lidId,
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamPersoon: true,
        ovamId: true,
      },
    });

  if (!geselecteerdLid) {
    return {
      fout:
        "De geselecteerde persoon bestaat niet meer in Persoonscertificaten.",
    };
  }

  const naamAdi =
    geselecteerdLid.naamPersoon;

  const ovamId =
    geselecteerdLid.ovamId;

  if (!ovamId.trim()) {
    return {
      fout:
        "De geselecteerde persoon heeft geen geldige OVAM-ID.",
    };
  }

  if (
    linkAttest &&
    !/^https?:\/\/\S+$/i.test(
      linkAttest,
    )
  ) {
    return {
      fout:
        "De link naar het attest moet een geldige http- of https-URL zijn.",
    };
  }

  const auditeurGebruikerId =
    optioneelId(
      formData,
      "auditeurGebruikerId",
    );

  const opvolgingAfgerond =
    formData.get(
      "opvolgingAfgerond",
    ) === "on";

  const datumAfgerond =
    opvolgingAfgerond
      ? ontleedDatumInvoer(
          formData.get(
            "datumAfgerond",
          ),
        )
      : null;

  const afgerondDoorGebruikerId =
    opvolgingAfgerond
      ? optioneelId(
          formData,
          "afgerondDoorGebruikerId",
        )
      : null;

  if (
    Number.isNaN(
      auditeurGebruikerId,
    ) ||
    Number.isNaN(
      afgerondDoorGebruikerId,
    )
  ) {
    return {
      fout:
        "Selecteer een geldige gebruiker.",
    };
  }

  if (!auditeurGebruikerId) {
    return {
      fout:
        "Kies een auditeur.",
    };
  }

  if (
    opvolgingAfgerond &&
    (
      !datumAfgerond ||
      !afgerondDoorGebruikerId
    )
  ) {
    return {
      fout:
        "Vul bij een afgeronde opvolging de datum en de verantwoordelijke in.",
    };
  }

  const gebruikersIds =
    Array.from(
      new Set(
        [
          auditeurGebruikerId,
          afgerondDoorGebruikerId,
        ].filter(
          (
            id,
          ): id is number =>
            typeof id ===
            "number",
        ),
      ),
    );

  const geldigeGebruikers =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        id: {
          in: gebruikersIds,
        },
        actief: true,
        rollen: {
          has: "AUDITEUR",
        },
      },
      select: {
        id: true,
        email: true,
        naam: true,
        voornaam: true,
        achternaam: true,
      },
    });

  if (
    geldigeGebruikers.length !==
    gebruikersIds.length
  ) {
    return {
      fout:
        "Een geselecteerde auditeur is niet meer actief.",
    };
  }

  const geselecteerdeAuditeur =
    geldigeGebruikers.find(
      (auditeur) =>
        auditeur.id ===
        auditeurGebruikerId,
    );

  if (!geselecteerdeAuditeur) {
    return {
      fout:
        "Kies een geldige auditeur.",
    };
  }

  const auditeurNaam =
    [
      geselecteerdeAuditeur.voornaam,
      geselecteerdeAuditeur.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    geselecteerdeAuditeur.naam?.trim() ||
    geselecteerdeAuditeur.email;

  const aangemaakt =
    await prisma.$transaction(
      async (database) => {
        const registratie =
          await database.opvolgingSanctie.create({
            data: {
              bronType:
                "HANDMATIG",
              bronId: null,
              bronBestandsnaam:
                null,
              bronExcelRij: null,
              auditeur:
                auditeurNaam,
              auditeurGebruikerId,
              naamAdi:
                naamAdi || null,
              opvolgingAfgerond,
              datumAfgerond,
              afgerondDoorGebruikerId:
                opvolgingAfgerond
                  ? afgerondDoorGebruikerId
                  : null,
              linkAttest:
                linkAttest || null,
              attestnummer:
                attestnummer || null,
              reden:
                validatie.invoer
                  .reden,
              bedrijfsnaam:
                bedrijfsnaam || null,
              ovamId:
                ovamId || null,
              datumVaststelling:
                validatie.invoer
                  .datumVaststelling,
              opmerkingen:
                opmerkingen || null,
              ncCategorie:
                validatie.invoer
                  .ncCategorie,
              sanctieBegindatum:
                validatie.invoer
                  .sanctieBegindatum,
              sanctieEinddatum:
                validatie.invoer
                  .sanctieEinddatum,
              sanctieDoorgezet:
                validatie.invoer
                  .sanctieDoorgezet,
              redenNietDoorzetten:
                validatie.invoer
                  .redenNietDoorzetten,
              aangemaaktDoorId:
                gebruiker.id,
            },
          });

        await schrijfAuditlog(
          database,
          gebruiker,
          {
            actie:
              "OPVOLGING_SANCTIE_HANDMATIG_AANGEMAAKT",
            entiteit:
              "OpvolgingSanctie",
            entiteitId:
              registratie.id,
            omschrijving:
              "Opvolging/sanctie handmatig aangemaakt.",
            nieuweWaarde: {
              bronType:
                "HANDMATIG",
              naamAdi:
                registratie.naamAdi,
              ovamId:
                registratie.ovamId,
              attestnummer:
                registratie.attestnummer,
              datumVaststelling:
                registratie.datumVaststelling.toISOString(),
              ncCategorie:
                registratie.ncCategorie,
              opvolgingAfgerond:
                registratie.opvolgingAfgerond,
            },
          },
        );

        return registratie;
      },
    );

  revalidatePath(
    "/opvolging-sancties",
  );

  redirect(
    `/opvolging-sancties/${aangemaakt.id}`,
  );
}

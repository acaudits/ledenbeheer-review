"use server";

import { revalidatePath } from "next/cache";

import { schrijfAuditlog } from "@/lib/auditlog";
import { vereisMachtiging } from "@/lib/auth";
import {
  isOpvolgingBron,
  ontleedDatumInvoer,
  type OpvolgingBron,
  valideerOpvolgingSanctieInvoer,
} from "@/lib/opvolging-sancties";
import { prisma } from "@/lib/prisma";

export type MaakOpvolgingSanctieResultaat =
  | {
      succes: true;
      id: number;
      melding: string;
    }
  | {
      succes: false;
      melding: string;
    };

type BronMomentopname = {
  auditeur: string | null;
  auditeurGebruikerId: number | null;
  naamAdi: string | null;
  linkAttest: string | null;
  attestnummer: string | null;
  bedrijfsnaam: string | null;
  ovamId: string | null;
  opmerkingen: string | null;
};

function isPrismaUniekeFout(
  fout: unknown,
) {
  return (
    typeof fout === "object" &&
    fout !== null &&
    "code" in fout &&
    fout.code === "P2002"
  );
}

function geldigeBronId(
  waarde: unknown,
): waarde is number {
  return (
    typeof waarde === "number" &&
    Number.isInteger(waarde) &&
    waarde > 0
  );
}

async function vereisMachtigingVoorBron(
  bronType: OpvolgingBron,
) {
  if (bronType === "DESKCONTROLE") {
    return vereisMachtiging(
      "DESKCONTROLES_BEHEREN",
    );
  }

  return vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );
}

async function haalBronMomentopnameOp(
  bronType: OpvolgingBron,
  bronId: number,
): Promise<BronMomentopname | null> {
  if (bronType === "DESKCONTROLE") {
    const bron =
      await prisma.deskcontrole.findFirst({
        where: {
          id: bronId,
          verwijderdOp: null,
        },
        select: {
          auditeur: true,
          auditeurGebruiker: {
            select: {
              id: true,
              actief: true,
              rol: true,
            },
          },
          linkAttest: true,
          attestnummer: true,
          opmerkingen: true,
          lid: {
            select: {
              naamPersoon: true,
              ovamId: true,
              bedrijf: true,
            },
          },
          procescertificaat: {
            select: {
              naamBedrijf: true,
            },
          },
        },
      });

    if (!bron) {
      return null;
    }

    const actieveAuditeur =
      bron.auditeurGebruiker?.actief &&
      bron.auditeurGebruiker.rol ===
        "AUDITEUR"
        ? bron.auditeurGebruiker.id
        : null;

    return {
      auditeur: bron.auditeur,
      auditeurGebruikerId:
        actieveAuditeur,
      naamAdi:
        bron.lid.naamPersoon,
      linkAttest:
        bron.linkAttest,
      attestnummer:
        bron.attestnummer,
      bedrijfsnaam:
        bron.procescertificaat
          ?.naamBedrijf ??
        bron.lid.bedrijf,
      ovamId: bron.lid.ovamId,
      opmerkingen:
        bron.opmerkingen,
    };
  }

  if (bronType === "TERREINCONTROLE") {
    const bron =
      await prisma.terreincontroleDossier.findFirst({
        where: {
          id: bronId,
          verwijderdOp: null,
        },
        select: {
          auditeur: true,
          auditeurGebruiker: {
            select: {
              id: true,
              actief: true,
              rol: true,
            },
          },
          naamAdi: true,
          linkAttest: true,
          attestnummer: true,
          bedrijfsnaam: true,
          persoonsId: true,
          opmerkingen: true,
        },
      });

    if (!bron) {
      return null;
    }

    const actieveAuditeur =
      bron.auditeurGebruiker?.actief &&
      bron.auditeurGebruiker.rol ===
        "AUDITEUR"
        ? bron.auditeurGebruiker.id
        : null;

    return {
      auditeur: bron.auditeur,
      auditeurGebruikerId:
        actieveAuditeur,
      naamAdi: bron.naamAdi,
      linkAttest:
        bron.linkAttest,
      attestnummer:
        bron.attestnummer,
      bedrijfsnaam:
        bron.bedrijfsnaam,
      ovamId: bron.persoonsId,
      opmerkingen:
        bron.opmerkingen,
    };
  }

  const bron =
    await prisma.naFinalisatie.findFirst({
      where: {
        id: bronId,
        verwijderdOp: null,
      },
      select: {
        auditeur: true,
        naamAdi: true,
        linkAttest: true,
        attestnummer: true,
        naamBedrijf: true,
        persoonsId: true,
        opmerking: true,
      },
    });

  if (!bron) {
    return null;
  }

  return {
    auditeur: bron.auditeur,
    auditeurGebruikerId: null,
    naamAdi: bron.naamAdi,
    linkAttest: bron.linkAttest,
    attestnummer: bron.attestnummer,
    bedrijfsnaam: bron.naamBedrijf,
    ovamId: bron.persoonsId,
    opmerkingen: bron.opmerking,
  };
}

export async function maakOpvolgingSanctie(
  bronTypeWaarde: unknown,
  bronIdWaarde: unknown,
  formData: FormData,
): Promise<MaakOpvolgingSanctieResultaat> {
  if (
    !isOpvolgingBron(
      bronTypeWaarde,
    )
  ) {
    return {
      succes: false,
      melding:
        "De geselecteerde bron is ongeldig.",
    };
  }

  if (
    !geldigeBronId(
      bronIdWaarde,
    )
  ) {
    return {
      succes: false,
      melding:
        "De geselecteerde registratie is ongeldig.",
    };
  }

  const bronType =
    bronTypeWaarde;
  const bronId =
    bronIdWaarde;

  const gebruiker =
    await vereisMachtigingVoorBron(
      bronType,
    );

  const validatie =
    valideerOpvolgingSanctieInvoer(
      formData,
    );

  if (!validatie.geldig) {
    return {
      succes: false,
      melding: validatie.melding,
    };
  }

  const momentopname =
    await haalBronMomentopnameOp(
      bronType,
      bronId,
    );

  if (!momentopname) {
    return {
      succes: false,
      melding:
        "De oorspronkelijke registratie bestaat niet meer of werd verwijderd.",
    };
  }

  try {
    const opvolging =
      await prisma.$transaction(
        async (database) => {
          const bestaande =
            await database.opvolgingSanctie.findUnique({
              where: {
                bronType_bronId: {
                  bronType,
                  bronId,
                },
              },
              select: {
                id: true,
                verwijderdOp: true,
              },
            });

          if (bestaande) {
            throw new Error(
              bestaande.verwijderdOp
                ? "VERWIJDERDE_OPVOLGING_BESTAAT"
                : "OPVOLGING_BESTAAT",
            );
          }

          const aangemaakt =
            await database.opvolgingSanctie.create({
              data: {
                bronType,
                bronId,
                auditeur:
                  momentopname.auditeur,
                auditeurGebruikerId:
                  momentopname.auditeurGebruikerId,
                naamAdi:
                  momentopname.naamAdi,
                opvolgingAfgerond: false,
                datumAfgerond: null,
                afgerondDoorGebruikerId:
                  null,
                linkAttest:
                  momentopname.linkAttest,
                attestnummer:
                  momentopname.attestnummer,
                reden:
                  validatie.invoer.reden,
                bedrijfsnaam:
                  momentopname.bedrijfsnaam,
                ovamId:
                  momentopname.ovamId,
                datumVaststelling:
                  validatie.invoer
                    .datumVaststelling,
                opmerkingen:
                  momentopname.opmerkingen,
                ncCategorie:
                  validatie.invoer
                    .ncCategorie,
                sanctieBegindatum:
                  validatie.invoer
                    .sanctieBegindatum,
                sanctieEinddatum:
                  validatie.invoer
                    .sanctieEinddatum,
                aangemaaktDoorId:
                  gebruiker.id,
              },
            });

          await schrijfAuditlog(
            database,
            gebruiker,
            {
              actie:
                "OPVOLGING_SANCTIE_AANGEMAAKT",
              entiteit:
                "OpvolgingSanctie",
              entiteitId:
                aangemaakt.id,
              omschrijving:
                "Registratie gekopieerd naar Opvolging/sancties.",
              nieuweWaarde: {
                bronType,
                bronId,
                ncCategorie:
                  validatie.invoer
                    .ncCategorie,
                datumVaststelling:
                  validatie.invoer
                    .datumVaststelling
                    .toISOString(),
                sanctieBegindatum:
                  validatie.invoer
                    .sanctieBegindatum
                    ?.toISOString() ??
                  null,
                sanctieEinddatum:
                  validatie.invoer
                    .sanctieEinddatum
                    ?.toISOString() ??
                  null,
              },
            },
          );

          return aangemaakt;
        },
      );

    revalidatePath(
      "/opvolging-sancties",
    );

    return {
      succes: true,
      id: opvolging.id,
      melding:
        "De registratie werd toegevoegd aan Opvolging/sancties.",
    };
  } catch (fout) {
    if (
      fout instanceof Error &&
      fout.message ===
        "OPVOLGING_BESTAAT"
    ) {
      return {
        succes: false,
        melding:
          "Deze registratie staat al in Opvolging/sancties.",
      };
    }

    if (
      fout instanceof Error &&
      fout.message ===
        "VERWIJDERDE_OPVOLGING_BESTAAT"
    ) {
      return {
        succes: false,
        melding:
          "Voor deze registratie bestaat al een verwijderde opvolging. Herstel die registratie eerst.",
      };
    }

    if (isPrismaUniekeFout(fout)) {
      return {
        succes: false,
        melding:
          "Deze registratie staat al in Opvolging/sancties.",
      };
    }

    console.error(
      "Opvolging/sanctie aanmaken mislukt:",
      fout,
    );

    return {
      succes: false,
      melding:
        "De opvolging kon niet worden opgeslagen.",
    };
  }
}


export type WijzigOpvolgingSanctieResultaat =
  | {
      succes: true;
      melding: string;
    }
  | {
      succes: false;
      melding: string;
    };

function leesOptioneelGebruikerId(
  waarde: FormDataEntryValue | null,
) {
  if (
    waarde === null ||
    String(waarde).trim() === ""
  ) {
    return null;
  }

  const id = Number(waarde);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return undefined;
  }

  return id;
}

export async function bewerkOpvolgingSanctie(
  id: number,
  formData: FormData,
): Promise<WijzigOpvolgingSanctieResultaat> {
  if (!geldigeBronId(id)) {
    return {
      succes: false,
      melding:
        "De geselecteerde opvolging is ongeldig.",
    };
  }

  const bestaande =
    await prisma.opvolgingSanctie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
      select: {
        id: true,
        bronType: true,
        auditeur: true,
        auditeurGebruikerId: true,
        opvolgingAfgerond: true,
        datumAfgerond: true,
        afgerondDoorGebruikerId: true,
        opmerkingen: true,
      },
    });

  if (!bestaande) {
    return {
      succes: false,
      melding:
        "De opvolging bestaat niet meer of werd verwijderd.",
    };
  }

  const gebruiker =
    await vereisMachtigingVoorBron(
      bestaande.bronType,
    );

  const auditeurGebruikerId =
    leesOptioneelGebruikerId(
      formData.get(
        "auditeurGebruikerId",
      ),
    );

  if (
    auditeurGebruikerId ===
    undefined
  ) {
    return {
      succes: false,
      melding:
        "Selecteer een geldige auditeur.",
    };
  }

  const opvolgingAfgerond =
    formData.get(
      "opvolgingAfgerond",
    ) === "on";

  const opmerkingen =
    String(
      formData.get(
        "opmerkingen",
      ) ?? "",
    ).trim();

  if (
    opmerkingen.length >
    10_000
  ) {
    return {
      succes: false,
      melding:
        "De opmerkingen mogen maximaal 10.000 tekens bevatten.",
    };
  }

  let datumAfgerond:
    Date | null = null;

  let afgerondDoorGebruikerId:
    number | null = null;

  if (opvolgingAfgerond) {
    datumAfgerond =
      ontleedDatumInvoer(
        formData.get(
          "datumAfgerond",
        ),
      );

    const afgerondDoorId =
      leesOptioneelGebruikerId(
        formData.get(
          "afgerondDoorGebruikerId",
        ),
      );

    if (!datumAfgerond) {
      return {
        succes: false,
        melding:
          "Vul een geldige datum afgerond in.",
      };
    }

    if (
      afgerondDoorId ===
        null ||
      afgerondDoorId ===
        undefined
    ) {
      return {
        succes: false,
        melding:
          "Selecteer wie de opvolging heeft afgerond.",
      };
    }

    afgerondDoorGebruikerId =
      afgerondDoorId;
  }

  const teControlerenIds =
    Array.from(
      new Set(
        [
          auditeurGebruikerId,
          afgerondDoorGebruikerId,
        ].filter(
          (
            waarde,
          ): waarde is number =>
            typeof waarde ===
            "number",
        ),
      ),
    );

  const actieveAuditeurs =
    teControlerenIds.length > 0
      ? await prisma.toegestaneGebruiker.findMany({
          where: {
            id: {
              in: teControlerenIds,
            },
            actief: true,
            rol: "AUDITEUR",
          },
          select: {
            id: true,
            email: true,
            naam: true,
            voornaam: true,
            achternaam: true,
          },
        })
      : [];

  if (
    actieveAuditeurs.length !==
    teControlerenIds.length
  ) {
    return {
      succes: false,
      melding:
        "Auditeur en afgerond door mogen uitsluitend actieve gebruikers met de rol Auditeur zijn.",
    };
  }

  const geselecteerdeAuditeur =
    auditeurGebruikerId === null
      ? null
      : actieveAuditeurs.find(
          (auditeur) =>
            auditeur.id ===
            auditeurGebruikerId,
        ) ?? null;

  const auditeurNaam =
    geselecteerdeAuditeur
      ? [
          geselecteerdeAuditeur
            .voornaam,
          geselecteerdeAuditeur
            .achternaam,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        geselecteerdeAuditeur
          .naam?.trim() ||
        geselecteerdeAuditeur
          .email
      : bestaande.auditeur;

  await prisma.$transaction(
    async (database) => {
      await database.opvolgingSanctie.update({
        where: {
          id,
        },
        data: {
          auditeurGebruikerId,
          auditeur: auditeurNaam,
          opvolgingAfgerond,
          datumAfgerond,
          afgerondDoorGebruikerId,
          opmerkingen:
            opmerkingen || null,
        },
      });

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "OPVOLGING_SANCTIE_GEWIJZIGD",
          entiteit:
            "OpvolgingSanctie",
          entiteitId: id,
          omschrijving:
            "Opvolging/sanctie gewijzigd.",
          oudeWaarde: {
            auditeur:
              bestaande.auditeur,
            auditeurGebruikerId:
              bestaande.auditeurGebruikerId,
            opvolgingAfgerond:
              bestaande.opvolgingAfgerond,
            datumAfgerond:
              bestaande.datumAfgerond
                ?.toISOString() ??
              null,
            afgerondDoorGebruikerId:
              bestaande.afgerondDoorGebruikerId,
            opmerkingen:
              bestaande.opmerkingen,
          },
          nieuweWaarde: {
            auditeur:
              auditeurNaam,
            auditeurGebruikerId,
            opvolgingAfgerond,
            datumAfgerond:
              datumAfgerond
                ?.toISOString() ??
              null,
            afgerondDoorGebruikerId,
            opmerkingen:
              opmerkingen || null,
          },
        },
      );
    },
  );

  revalidatePath(
    "/opvolging-sancties",
  );

  return {
    succes: true,
    melding:
      "De opvolging werd bijgewerkt.",
  };
}

export async function verwijderOpvolgingSanctie(
  id: number,
): Promise<WijzigOpvolgingSanctieResultaat> {
  if (!geldigeBronId(id)) {
    return {
      succes: false,
      melding:
        "De geselecteerde opvolging is ongeldig.",
    };
  }

  const bestaande =
    await prisma.opvolgingSanctie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
      select: {
        id: true,
        bronType: true,
        bronId: true,
        ncCategorie: true,
      },
    });

  if (!bestaande) {
    return {
      succes: false,
      melding:
        "De opvolging bestaat niet meer of werd al verwijderd.",
    };
  }

  const gebruiker =
    await vereisMachtigingVoorBron(
      bestaande.bronType,
    );

  const verwijderdOp =
    new Date();

  await prisma.$transaction(
    async (database) => {
      await database.opvolgingSanctie.update({
        where: {
          id,
        },
        data: {
          verwijderdOp,
        },
      });

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "OPVOLGING_SANCTIE_VERWIJDERD",
          entiteit:
            "OpvolgingSanctie",
          entiteitId: id,
          omschrijving:
            "Opvolging/sanctie verwijderd.",
          oudeWaarde: {
            bronType:
              bestaande.bronType,
            bronId:
              bestaande.bronId,
            ncCategorie:
              bestaande.ncCategorie,
            verwijderdOp: null,
          },
          nieuweWaarde: {
            verwijderdOp:
              verwijderdOp.toISOString(),
          },
        },
      );
    },
  );

  revalidatePath(
    "/opvolging-sancties",
  );

  return {
    succes: true,
    melding:
      "De opvolging werd verwijderd.",
  };
}

export async function herstelOpvolgingSanctie(
  id: number,
): Promise<WijzigOpvolgingSanctieResultaat> {
  if (!geldigeBronId(id)) {
    return {
      succes: false,
      melding:
        "De geselecteerde opvolging is ongeldig.",
    };
  }

  const bestaande =
    await prisma.opvolgingSanctie.findFirst({
      where: {
        id,
        verwijderdOp: {
          not: null,
        },
      },
      select: {
        id: true,
        bronType: true,
        bronId: true,
        ncCategorie: true,
        verwijderdOp: true,
      },
    });

  if (!bestaande?.verwijderdOp) {
    return {
      succes: false,
      melding:
        "De opvolging bestaat niet of werd al hersteld.",
    };
  }

  const verwijderdOp =
    bestaande.verwijderdOp;

  const gebruiker =
    await vereisMachtigingVoorBron(
      bestaande.bronType,
    );

  const hersteld =
    await prisma.$transaction(
      async (database) => {
        const resultaat =
          await database.opvolgingSanctie.updateMany({
            where: {
              id,
              verwijderdOp:
                verwijderdOp,
            },
            data: {
              verwijderdOp: null,
            },
          });

        if (resultaat.count === 0) {
          return false;
        }

        await schrijfAuditlog(
          database,
          gebruiker,
          {
            actie:
              "OPVOLGING_SANCTIE_HERSTELD",
            entiteit:
              "OpvolgingSanctie",
            entiteitId: id,
            omschrijving:
              "Verwijderde opvolging/sanctie hersteld.",
            oudeWaarde: {
              bronType:
                bestaande.bronType,
              bronId:
                bestaande.bronId,
              ncCategorie:
                bestaande.ncCategorie,
              verwijderdOp:
                verwijderdOp.toISOString(),
            },
            nieuweWaarde: {
              verwijderdOp: null,
            },
          },
        );

        return true;
      },
    );

  if (!hersteld) {
    return {
      succes: false,
      melding:
        "De opvolging werd intussen al hersteld.",
    };
  }

  revalidatePath(
    "/opvolging-sancties",
  );
  revalidatePath(
    "/opvolging-sancties/verwijderd",
  );

  return {
    succes: true,
    melding:
      "De opvolging werd hersteld.",
  };
}

export type BewerkOpvolgingSanctieDetailStatus = {
  fout?: string;
  succes?: string;
};

export async function bewerkOpvolgingSanctieDetail(
  id: number,
  _vorigeStatus: BewerkOpvolgingSanctieDetailStatus,
  formData: FormData,
): Promise<BewerkOpvolgingSanctieDetailStatus> {
  if (!geldigeBronId(id)) {
    return {
      fout: "Ongeldige registratie.",
    };
  }

  const bestaande =
    await prisma.opvolgingSanctie.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
    });

  if (!bestaande) {
    return {
      fout: "De opvolging/sanctie bestaat niet meer.",
    };
  }

  const gebruiker =
    await vereisMachtigingVoorBron(
      bestaande.bronType,
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

  function invoer(
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
    naam: string,
  ) {
    const waarde =
      String(
        formData.get(naam) ?? "",
      ).trim();

    if (!waarde) {
      return null;
    }

    const nummer =
      Number(waarde);

    return Number.isInteger(nummer) &&
      nummer > 0
      ? nummer
      : NaN;
  }

  const auditeur =
    invoer("auditeur", 500);

  const naamAdi =
    invoer("naamAdi", 500);

  const linkAttest =
    invoer("linkAttest", 2048);

  const attestnummer =
    invoer("attestnummer", 255);

  const bedrijfsnaam =
    invoer("bedrijfsnaam", 500);

  const ovamId =
    invoer("ovamId", 255);

  const opmerkingen =
    invoer("opmerkingen", 10_000);

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
      "auditeurGebruikerId",
    );

  const afgerondDoorGebruikerId =
    optioneelId(
      "afgerondDoorGebruikerId",
    );

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

  const gebruikersIds = [
    auditeurGebruikerId,
    afgerondDoorGebruikerId,
  ].filter(
    (
      waarde,
    ): waarde is number =>
      waarde !== null,
  );

  if (gebruikersIds.length > 0) {
    const geldigeGebruikers =
      await prisma.toegestaneGebruiker.count({
        where: {
          id: {
            in: Array.from(
              new Set(
                gebruikersIds,
              ),
            ),
          },
          actief: true,
          rol: "AUDITEUR",
        },
      });

    if (
      geldigeGebruikers !==
      new Set(
        gebruikersIds,
      ).size
    ) {
      return {
        fout:
          "Een geselecteerde auditeur is niet meer actief.",
      };
    }
  }

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

  const nieuweWaarde = {
    auditeur:
      auditeur || null,
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
      validatie.invoer.reden,
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
  };

  function auditDatum(
    waarde: Date | null,
  ) {
    return waarde
      ? waarde.toISOString()
      : null;
  }

  await prisma.$transaction(
    async (database) => {
      await database.opvolgingSanctie.update({
        where: {
          id,
        },
        data: nieuweWaarde,
      });

      await schrijfAuditlog(
        database,
        gebruiker,
        {
          actie:
            "OPVOLGING_SANCTIE_GEWIJZIGD",
          entiteit:
            "OpvolgingSanctie",
          entiteitId: id,
          omschrijving:
            "Opvolging/sanctie via detailpagina gewijzigd.",
          oudeWaarde: {
            auditeur:
              bestaande.auditeur,
            auditeurGebruikerId:
              bestaande.auditeurGebruikerId,
            naamAdi:
              bestaande.naamAdi,
            opvolgingAfgerond:
              bestaande.opvolgingAfgerond,
            datumAfgerond:
              auditDatum(
                bestaande.datumAfgerond,
              ),
            afgerondDoorGebruikerId:
              bestaande.afgerondDoorGebruikerId,
            linkAttest:
              bestaande.linkAttest,
            attestnummer:
              bestaande.attestnummer,
            reden:
              bestaande.reden,
            bedrijfsnaam:
              bestaande.bedrijfsnaam,
            ovamId:
              bestaande.ovamId,
            datumVaststelling:
              auditDatum(
                bestaande.datumVaststelling,
              ),
            opmerkingen:
              bestaande.opmerkingen,
            ncCategorie:
              bestaande.ncCategorie,
            sanctieBegindatum:
              auditDatum(
                bestaande.sanctieBegindatum,
              ),
            sanctieEinddatum:
              auditDatum(
                bestaande.sanctieEinddatum,
              ),
          },
          nieuweWaarde: {
            ...nieuweWaarde,
            datumAfgerond:
              auditDatum(
                nieuweWaarde.datumAfgerond,
              ),
            datumVaststelling:
              auditDatum(
                nieuweWaarde.datumVaststelling,
              ),
            sanctieBegindatum:
              auditDatum(
                nieuweWaarde.sanctieBegindatum,
              ),
            sanctieEinddatum:
              auditDatum(
                nieuweWaarde.sanctieEinddatum,
              ),
          },
        },
      );
    },
  );

  revalidatePath(
    "/opvolging-sancties",
  );
  revalidatePath(
    `/opvolging-sancties/${id}`,
  );

  return {
    succes:
      "De wijzigingen zijn opgeslagen.",
  };
}

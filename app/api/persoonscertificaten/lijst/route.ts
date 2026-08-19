import {
  NextResponse,
} from "next/server";

import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";
import {
  normaliseerTelefoonnummer,
} from "@/lib/telefoonnummer";
import {
  leesPersoonscertificaatLijstcontract,
  PERSOONSCERTIFICAAT_SORTERINGEN,
} from "@/lib/persoonscertificaat-lijstcontract";
import {
  laadPersoonscertificaatSelectie,
} from "@/lib/persoonscertificaat-selectie";
import {
  type TargetStatus,
} from "@/lib/persoonscertificaat-targetselectie";
import {
  GEEN_TABEL_CACHE,
  maakTabelCursor,
  OngeldigePagineringFout,
  leesTabelAanvraag,
} from "@/lib/server-paginering";

export const dynamic =
  "force-dynamic";

function berekenTargetStatus({
  aantalAttesten,
  aantalDeskcontroles,
  aantalTerreincontroles,
}: {
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalTerreincontroles: number;
}): TargetStatus {
  if (aantalAttesten === 0) {
    return "GRIJS";
  }

  if (
    aantalDeskcontroles === 0 ||
    aantalTerreincontroles === 0
  ) {
    return "ROOD";
  }

  const targetDeskcontroles =
    Math.ceil(
      aantalAttesten * 0.05,
    );

  const targetTerreincontroles =
    Math.min(
      4,
      Math.ceil(
        aantalAttesten / 100,
      ),
    );

  if (
    aantalDeskcontroles >=
      targetDeskcontroles &&
    aantalTerreincontroles >=
      targetTerreincontroles
  ) {
    return "GROEN";
  }

  return "GEEL";
}

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

export async function GET(
  verzoek: Request,
) {
  try {
    const gebruiker =
      await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return NextResponse.json(
        {
          fout:
            "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    if (
      !heeftMachtiging(
        gebruiker.rol,
        "CERTIFICATEN_BEKIJKEN",
      )
    ) {
      return NextResponse.json(
        {
          fout:
            "Je hebt geen toegang tot persoonscertificaten.",
        },
        {
          status: 403,
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    const url =
      new URL(verzoek.url);

    const aanvraag =
      leesTabelAanvraag(
        url,
        {
          toegelatenSorteringen:
            PERSOONSCERTIFICAAT_SORTERINGEN,
          standaardSortering:
            "naamPersoon",
          standaardRichting:
            "asc",
          standaardLimiet: 50,
        },
      );

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag voor persoonscertificaten maximaal 50 zijn.",
      );
    }

    const {
      contract,
      sortering,
      richting,
    } =
      leesPersoonscertificaatLijstcontract(
        url,
        aanvraag.richting,
      );

    const selectie =
      await laadPersoonscertificaatSelectie({
        zoekterm:
          aanvraag.zoekterm,
        contract,
        sortering,
        richting,
        limiet:
          aanvraag.limiet,
        cursorId:
          aanvraag.cursor
            ?.id ?? null,
      });

    const heeftVolgendePagina =
      selectie.length >
      aanvraag.limiet;

    const paginaSelectie =
      selectie.slice(
        0,
        aanvraag.limiet,
      );

    const geselecteerdeIds =
      paginaSelectie.map(
        (rij) => rij.id,
      );

    const gevondenLeden =
      geselecteerdeIds.length === 0
        ? []
        : await prisma.lid.findMany({
            where: {
              id: {
                in:
                  geselecteerdeIds,
              },
              verwijderdOp: null,
            },
            select: {
              id: true,
              naamPersoon: true,
              telefoonnummer: true,
              mailadres: true,
              ovamId: true,
              certificaatnummer: true,
              uitgereiktOp: true,
              bedrijf: true,
              aansluiting: true,
              opmerking: true,
              certificatiePlatform:
                true,
            },
          });

    const ledenPerId =
      new Map(
        gevondenLeden.map(
          (lid) => [
            lid.id,
            lid,
          ],
        ),
      );

    const leden =
      paginaSelectie.flatMap(
        (selectieRij) => {
          const lid =
            ledenPerId.get(
              selectieRij.id,
            );

          return lid
            ? [lid]
            : [];
        },
      );

    if (
      leden.length !==
      paginaSelectie.length
    ) {
      throw new Error(
        "Een geselecteerd persoonscertificaat kon niet worden geladen.",
      );
    }

    const targetStatusPerLid =
      new Map(
        paginaSelectie.map(
          (rij) => [
            rij.id,
            rij.targetStatus,
          ],
        ),
      );

    const aantalTotaal =
      aanvraag.cursor
        ? null
        : (
            selectie[0]
              ?.aantalTotaal ??
            0
          );

    const lidIds =
      leden.map(
        (lid) => lid.id,
      );

    const ovamIds =
      leden.map(
        (lid) => lid.ovamId,
      );

    const [
      atteststatistieken,
      deskcontroletellingen,
      terreincontroletellingen,
    ] = await Promise.all([
      ovamIds.length === 0
        ? Promise.resolve([])
        : prisma
            .attestPersoonStatistiek
            .findMany({
              where: {
                persoonsId: {
                  in: ovamIds,
                },
              },
              select: {
                persoonsId: true,
                aantalAttesten:
                  true,
              },
            }),

      lidIds.length === 0
        ? Promise.resolve([])
        : prisma
            .deskcontrole
            .groupBy({
              by: ["lidId"],
              where: {
                verwijderdOp:
                  null,
                lidId: {
                  in: lidIds,
                },
              },
              _count: {
                _all: true,
              },
            }),

      lidIds.length === 0
        ? Promise.resolve([])
        : prisma
            .terreincontroleDossier
            .groupBy({
              by: ["lidId"],
              where: {
                verwijderdOp:
                  null,
                lidId: {
                  in: lidIds,
                },
              },
              _count: {
                _all: true,
              },
            }),
    ]);

    const attestenPerPersoon =
      new Map(
        atteststatistieken.map(
          (statistiek) => [
            statistiek.persoonsId,
            statistiek
              .aantalAttesten,
          ],
        ),
      );

    const deskcontrolesPerLid =
      new Map(
        deskcontroletellingen.map(
          (telling) => [
            telling.lidId,
            telling._count._all,
          ],
        ),
      );

    const terreincontrolesPerLid =
      new Map(
        terreincontroletellingen.map(
          (telling) => [
            telling.lidId,
            telling._count._all,
          ],
        ),
      );

    const rijen =
      leden.map((lid) => {
        const aantalAttesten =
          attestenPerPersoon.get(
            lid.ovamId,
          ) ?? 0;

        const aantalDeskcontroles =
          deskcontrolesPerLid.get(
            lid.id,
          ) ?? 0;

        const aantalTerreincontroles =
          terreincontrolesPerLid.get(
            lid.id,
          ) ?? 0;

        const targetDeskcontroles =
          aantalAttesten === 0
            ? 0
            : Math.ceil(
                aantalAttesten *
                  0.05,
              );

        const targetTerreincontroles =
          aantalAttesten === 0
            ? 0
            : Math.min(
                4,
                Math.ceil(
                  aantalAttesten /
                    100,
                ),
              );

        const controleTargetStatus =
          berekenTargetStatus({
            aantalAttesten,
            aantalDeskcontroles,
            aantalTerreincontroles,
          });

        const geselecteerdeStatus =
          targetStatusPerLid.get(
            lid.id,
          );

        if (
          geselecteerdeStatus !==
          controleTargetStatus
        ) {
          throw new Error(
            "De berekende targetstatus is niet consistent.",
          );
        }

        const controleTargetStatusToelichting =
          aantalAttesten === 0
            ? "Geen attesten — er zijn geen controletargets."
            : [
                `${aantalAttesten} attesten`,
                `deskcontroles ${aantalDeskcontroles}/${targetDeskcontroles}`,
                `terreincontroles ${aantalTerreincontroles}/${targetTerreincontroles}`,
              ].join(" — ");

        return {
          id: lid.id,
          naamPersoon:
            lid.naamPersoon,
          controleTargetStatus,
          controleTargetStatusToelichting,
          telefoonnummer:
            normaliseerTelefoonnummer(
              lid.telefoonnummer,
            ) ??
            lid.telefoonnummer,
          mailadres:
            lid.mailadres,
          ovamId: lid.ovamId,
          certificaatnummer:
            lid.certificaatnummer,
          uitgereiktOp:
            formatteerDatum(
              lid.uitgereiktOp,
            ),
          bedrijf: lid.bedrijf,
          aansluiting:
            lid.aansluiting,
          opmerking:
            lid.opmerking,
          certificatiePlatform:
            lid
              .certificatiePlatform,
        };
      });

    const laatsteLid =
      leden.at(-1);

    const volgendeCursor =
      heeftVolgendePagina &&
      laatsteLid
        ? maakTabelCursor({
            id: laatsteLid.id,
            waarde: null,
          })
        : null;

    return NextResponse.json(
      {
        rijen,
        volgendeCursor,
        heeftVolgendePagina,
        aantalTotaal,
      },
      {
        headers:
          GEEN_TABEL_CACHE,
      },
    );
  } catch (fout) {
    if (
      fout instanceof
      OngeldigePagineringFout
    ) {
      return NextResponse.json(
        {
          fout: fout.message,
        },
        {
          status: 400,
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    console.error(
      "Persoonscertificaten laden mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        fout:
          "De persoonscertificaten konden niet worden geladen.",
      },
      {
        status: 500,
        headers:
          GEEN_TABEL_CACHE,
      },
    );
  }
}

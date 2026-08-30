import { NextResponse } from "next/server";

import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";
import {
  leesProcescertificaatLijstcontract,
  PROCESCERTIFICAAT_SORTERINGEN,
} from "@/lib/procescertificaat-lijstcontract";
import {
  laadProcescertificaatFilterwaarden,
  laadProcescertificaatSelectie,
} from "@/lib/procescertificaat-selectie";
import {
  GEEN_TABEL_CACHE,
  maakTabelCursor,
  OngeldigePagineringFout,
  leesTabelAanvraag,
} from "@/lib/server-paginering";

export const dynamic = "force-dynamic";

function formatteerDatum(datum: Date | null) {
  if (!datum) {
    return "";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(datum);
}

export async function GET(verzoek: Request) {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return NextResponse.json(
        {
          fout: "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    if (!heeftMachtiging(gebruiker.rollen, "CERTIFICATEN_BEKIJKEN")) {
      return NextResponse.json(
        {
          fout: "Je hebt geen toegang tot procescertificaten.",
        },
        {
          status: 403,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const url = new URL(verzoek.url);

    const filterwaardenKolom = url.searchParams.get("filterwaardenKolom");

    if (filterwaardenKolom !== null) {
      const toegelatenFilterkolommen = [
        "bedrijf",
        "kboNummer",
        "certificaatnummer",
        "ondernemingstype",
      ] as const;

      if (
        !toegelatenFilterkolommen.includes(
          filterwaardenKolom as (typeof toegelatenFilterkolommen)[number],
        )
      ) {
        throw new OngeldigePagineringFout(
          "De gekozen filterkolom is ongeldig.",
        );
      }

      const filterwaardenZoekterm = (
        url.searchParams.get("filterwaardenZoekterm") ?? ""
      )
        .replace(/\s+/g, " ")
        .trim();

      if (filterwaardenZoekterm.length > 100) {
        throw new OngeldigePagineringFout(
          "De zoekterm voor filterwaarden is te lang.",
        );
      }

      const gevondenWaarden = await laadProcescertificaatFilterwaarden({
        kolom: filterwaardenKolom as
          "bedrijf" | "kboNummer" | "certificaatnummer" | "ondernemingstype",
        zoekterm: filterwaardenZoekterm,
      });

      return NextResponse.json(
        {
          waarden: gevondenWaarden.slice(0, 250),
          afgekapt: gevondenWaarden.length > 250,
        },
        {
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: PROCESCERTIFICAAT_SORTERINGEN,
      standaardSortering: "bedrijf",
      standaardRichting: "asc",
      standaardLimiet: 50,
    });

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag voor procescertificaten maximaal 50 zijn.",
      );
    }

    const { contract, sorteringen } = leesProcescertificaatLijstcontract(
      url,
      aanvraag.richting,
    );

    const selectie = await laadProcescertificaatSelectie({
      zoekterm: aanvraag.zoekterm,
      contract,
      sorteringen,
      limiet: aanvraag.limiet,
      cursorId: aanvraag.cursor?.id ?? null,
    });

    const heeftVolgendePagina = selectie.length > aanvraag.limiet;

    const paginaSelectie = selectie.slice(0, aanvraag.limiet);

    const aantalTotaal = aanvraag.cursor
      ? null
      : (paginaSelectie[0]?.aantalTotaal ?? 0);

    const geselecteerdeIds = paginaSelectie.map((rij) => rij.id);

    const gevondenCertificaten =
      geselecteerdeIds.length === 0
        ? []
        : await prisma.procescertificaat.findMany({
            where: {
              id: {
                in: geselecteerdeIds,
              },
              verwijderdOp: null,
            },
            select: {
              id: true,
              naamBedrijf: true,
              kboNummer: true,
              certificaatnummer: true,
              uitgereiktOp: true,
              oneDrive: true,
              opmerking: true,
              ondernemingstype: true,
            },
          });

    const certificatenPerId = new Map(
      gevondenCertificaten.map((certificaat) => [certificaat.id, certificaat]),
    );

    const certificaten = paginaSelectie.flatMap((selectieRij) => {
      const certificaat = certificatenPerId.get(selectieRij.id);

      return certificaat ? [certificaat] : [];
    });

    if (certificaten.length !== paginaSelectie.length) {
      throw new Error(
        "Een geselecteerd procescertificaat kon niet worden geladen.",
      );
    }

    const rijen = certificaten.map((certificaat) => ({
      id: certificaat.id,
      bedrijf: certificaat.naamBedrijf,
      kboNummer: formatteerOndernemingsnummer(certificaat.kboNummer),
      certificaatnummer: certificaat.certificaatnummer,
      uitgereiktOp: formatteerDatum(certificaat.uitgereiktOp),
      oneDrive: certificaat.oneDrive,
      opmerking: certificaat.opmerking,
      ondernemingstype:
        certificaat.ondernemingstype === "EENMANSZAAK"
          ? "Eenmanszaak"
          : "Bedrijf",
    }));

    const laatsteCertificaat = certificaten.at(-1);

    const volgendeCursor =
      heeftVolgendePagina && laatsteCertificaat
        ? maakTabelCursor({
            id: laatsteCertificaat.id,
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
        headers: GEEN_TABEL_CACHE,
      },
    );
  } catch (fout) {
    if (fout instanceof OngeldigePagineringFout) {
      return NextResponse.json(
        {
          fout: fout.message,
        },
        {
          status: 400,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    console.error("Procescertificaten laden mislukt:", fout);

    return NextResponse.json(
      {
        fout: "De procescertificaten konden niet worden geladen.",
      },
      {
        status: 500,
        headers: GEEN_TABEL_CACHE,
      },
    );
  }
}

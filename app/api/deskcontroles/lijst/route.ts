import { NextResponse } from "next/server";

import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import {
  DESKCONTROLE_SORTERINGEN,
  leesDeskcontroleLijstcontract,
  type DeskcontroleSortering,
} from "@/lib/deskcontrole-lijstcontract";
import {
  laadDeskcontroleDashboardTellingen,
  laadDeskcontroleFilterwaarden,
  laadDeskcontroleSelectie,
} from "@/lib/deskcontrole-selectie";
import {
  GEEN_TABEL_CACHE,
  maakTabelCursor,
  OngeldigePagineringFout,
  leesTabelAanvraag,
} from "@/lib/server-paginering";

export const dynamic = "force-dynamic";

export async function GET(verzoek: Request) {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return NextResponse.json(
        { fout: "Je bent niet ingelogd." },
        {
          status: 401,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    if (!heeftMachtiging(gebruiker.rol, "DESKCONTROLES_BEKIJKEN")) {
      return NextResponse.json(
        {
          fout: "Je hebt geen toegang tot deskcontroles.",
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
      const toegelatenFilterkolommen: DeskcontroleSortering[] = [
        "auditeur",
        "naamAdi",
        "afgerond",
        "attestnummer",
        "status",
        "adres",
        "deadlineSanctie",
        "datumControle",
        "voorwaardelijkeOpheffing",
      ];

      if (
        !toegelatenFilterkolommen.includes(
          filterwaardenKolom as DeskcontroleSortering,
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

      const waarden = await laadDeskcontroleFilterwaarden({
        kolom: filterwaardenKolom as DeskcontroleSortering,
        zoekterm: filterwaardenZoekterm,
      });

      return NextResponse.json(
        {
          waarden: waarden.slice(0, 250),
          afgekapt: waarden.length > 250,
        },
        {
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: DESKCONTROLE_SORTERINGEN,
      standaardSortering: "datumControle",
      standaardRichting: "desc",
      standaardLimiet: 50,
    });

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag voor deskcontroles maximaal 50 zijn.",
      );
    }

    const { contract, sorteringen } = leesDeskcontroleLijstcontract(
      url,
      aanvraag.richting,
    );

    const [selectie, dashboard] = await Promise.all([
      laadDeskcontroleSelectie({
        zoekterm: aanvraag.zoekterm,
        contract,
        sorteringen,
        limiet: aanvraag.limiet,
        cursorId: aanvraag.cursor?.id ?? null,
      }),
      laadDeskcontroleDashboardTellingen(),
    ]);

    const heeftVolgendePagina = selectie.length > aanvraag.limiet;

    const pagina = selectie.slice(0, aanvraag.limiet);

    const aantalTotaal = aanvraag.cursor
      ? null
      : (pagina[0]?.aantalTotaal ?? 0);

    const rijen = pagina.map(({ aantalTotaal: rijAantalTotaal, ...rij }) => {
      void rijAantalTotaal;
      return rij;
    });

    const laatsteRij = rijen.at(-1);

    const volgendeCursor =
      heeftVolgendePagina && laatsteRij
        ? maakTabelCursor({
            id: laatsteRij.id,
            waarde: null,
          })
        : null;

    return NextResponse.json(
      {
        rijen,
        volgendeCursor,
        heeftVolgendePagina,
        aantalTotaal,
        dashboard,
      },
      {
        headers: GEEN_TABEL_CACHE,
      },
    );
  } catch (fout) {
    if (fout instanceof OngeldigePagineringFout) {
      return NextResponse.json(
        { fout: fout.message },
        {
          status: 400,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    console.error("Deskcontroles laden mislukt:", fout);

    return NextResponse.json(
      {
        fout: "De deskcontroles konden niet worden geladen.",
      },
      {
        status: 500,
        headers: GEEN_TABEL_CACHE,
      },
    );
  }
}

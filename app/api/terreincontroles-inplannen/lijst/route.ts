import { NextResponse } from "next/server";

import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import {
  INGEPLANDE_TERREINCONTROLE_SORTERINGEN,
  leesIngeplandeTerreincontroleLijstcontract,
  type IngeplandeTerreincontroleSortering,
} from "@/lib/ingeplande-terreincontrole-lijstcontract";
import {
  laadIngeplandeTerreincontroleDashboardTellingen,
  laadIngeplandeTerreincontroleFilterwaarden,
  laadIngeplandeTerreincontroleSelectie,
} from "@/lib/ingeplande-terreincontrole-selectie";
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
        {
          fout: "Je bent niet ingelogd.",
        },
        {
          status: 401,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    if (!heeftMachtiging(gebruiker.rollen, "TERREINCONTROLES_BEKIJKEN")) {
      return NextResponse.json(
        {
          fout: "Je hebt geen toegang tot ingeplande terreincontroles.",
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
      if (
        !INGEPLANDE_TERREINCONTROLE_SORTERINGEN.includes(
          filterwaardenKolom as IngeplandeTerreincontroleSortering,
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

      const waarden = await laadIngeplandeTerreincontroleFilterwaarden({
        kolom: filterwaardenKolom as IngeplandeTerreincontroleSortering,
        zoekterm: filterwaardenZoekterm,
      });

      const limiet = filterwaardenKolom === "datumPlaatsbezoek" ? 2000 : 300;

      return NextResponse.json(
        {
          waarden,
          afgekapt: waarden.length === limiet,
        },
        {
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: INGEPLANDE_TERREINCONTROLE_SORTERINGEN,
      standaardSortering: "datumPlaatsbezoek",
      standaardRichting: "desc",
      standaardLimiet: 50,
    });

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag voor ingeplande terreincontroles maximaal 50 zijn.",
      );
    }

    const { contract, sorteringen } =
      leesIngeplandeTerreincontroleLijstcontract(url, aanvraag.richting);

    const [selectie, dashboard] = await Promise.all([
      laadIngeplandeTerreincontroleSelectie({
        zoekterm: aanvraag.zoekterm,
        contract,
        sorteringen,
        limiet: aanvraag.limiet,
        cursorId: aanvraag.cursor?.id ?? null,
      }),
      laadIngeplandeTerreincontroleDashboardTellingen(),
    ]);

    const heeftVolgendePagina = selectie.length > aanvraag.limiet;

    const pagina = selectie.slice(0, aanvraag.limiet);

    const aantalTotaal =
      pagina[0]?.aantalTotaal ?? (aanvraag.cursor === null ? 0 : null);

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
        {
          fout: fout.message,
        },
        {
          status: 400,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    console.error("Ingeplande terreincontroles laden mislukt:", fout);

    return NextResponse.json(
      {
        fout: "De ingeplande terreincontroles konden niet worden geladen.",
      },
      {
        status: 500,
        headers: GEEN_TABEL_CACHE,
      },
    );
  }
}

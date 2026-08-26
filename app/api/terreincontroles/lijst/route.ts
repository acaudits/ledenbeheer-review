import { NextResponse } from "next/server";

import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import {
  GEEN_TABEL_CACHE,
  maakTabelCursor,
  OngeldigePagineringFout,
  leesTabelAanvraag,
} from "@/lib/server-paginering";
import {
  leesTerreincontroleLijstcontract,
  TERREINCONTROLE_SORTERINGEN,
  type TerreincontroleSortering,
} from "@/lib/terreincontrole-lijstcontract";
import {
  laadTerreincontroleDashboardTellingen,
  laadTerreincontroleFilterwaarden,
  laadTerreincontroleSelectie,
} from "@/lib/terreincontrole-selectie";

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

    if (!heeftMachtiging(gebruiker.rol, "TERREINCONTROLES_BEKIJKEN")) {
      return NextResponse.json(
        {
          fout: "Je hebt geen toegang tot terreincontroles.",
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
        !TERREINCONTROLE_SORTERINGEN.includes(
          filterwaardenKolom as TerreincontroleSortering,
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

      const waarden = await laadTerreincontroleFilterwaarden({
        kolom: filterwaardenKolom as TerreincontroleSortering,
        zoekterm: filterwaardenZoekterm,
      });

      return NextResponse.json(
        {
          waarden,
          afgekapt:
            waarden.length ===
            (filterwaardenKolom === "datumControle" ? 2000 : 300),
        },
        {
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: TERREINCONTROLE_SORTERINGEN,
      standaardSortering: "datumControle",
      standaardRichting: "desc",
      standaardLimiet: 50,
    });

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag voor terreincontroles maximaal 50 zijn.",
      );
    }

    const { contract, sorteringen } = leesTerreincontroleLijstcontract(
      url,
      aanvraag.richting,
    );

    const [selectie, dashboard] = await Promise.all([
      laadTerreincontroleSelectie({
        zoekterm: aanvraag.zoekterm,
        contract,
        sorteringen,
        limiet: aanvraag.limiet,
        cursorId: aanvraag.cursor?.id ?? null,
      }),
      laadTerreincontroleDashboardTellingen(),
    ]);

    const heeftVolgendePagina = selectie.length > aanvraag.limiet;

    const pagina = selectie.slice(0, aanvraag.limiet);

    const aantalTotaal =
      pagina[0]?.aantalTotaal ?? (aanvraag.cursor === null ? 0 : null);

    const rijen = pagina.map(
      ({ aantalTotaal: rijAantalTotaal, ondernemingsnummer, ...rij }) => {
        void rijAantalTotaal;

        return {
          ...rij,
          ondernemingsnummer: formatteerOndernemingsnummer(ondernemingsnummer),
        };
      },
    );

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

    console.error("Terreincontroles laden mislukt:", fout);

    return NextResponse.json(
      {
        fout: "De terreincontroles konden niet worden geladen.",
      },
      {
        status: 500,
        headers: GEEN_TABEL_CACHE,
      },
    );
  }
}

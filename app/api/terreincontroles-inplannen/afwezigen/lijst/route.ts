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
  AFWEZIGE_TERREINCONTROLE_SORTERINGEN,
  leesAfwezigeTerreincontroleLijstcontract,
} from "@/lib/afwezige-terreincontrole-lijstcontract";
import {
  laadAfwezigeTerreincontroleDashboardTellingen,
  laadAfwezigeTerreincontroleSelectie,
} from "@/lib/afwezige-terreincontrole-selectie";
import {
  GEEN_TABEL_CACHE,
  maakTabelCursor,
  OngeldigePagineringFout,
  leesTabelAanvraag,
} from "@/lib/server-paginering";

export const dynamic =
  "force-dynamic";

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
        "TERREINCONTROLES_BEKIJKEN",
      )
    ) {
      return NextResponse.json(
        {
          fout:
            "Je hebt geen toegang tot afwezige terreincontroles.",
        },
        {
          status: 403,
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    const url =
      new URL(
        verzoek.url,
      );

    const aanvraag =
      leesTabelAanvraag(
        url,
        {
          toegelatenSorteringen:
            AFWEZIGE_TERREINCONTROLE_SORTERINGEN,
          standaardSortering:
            "datumPlaatsbezoek",
          standaardRichting:
            "desc",
          standaardLimiet:
            50,
        },
      );

    if (
      aanvraag.limiet >
      50
    ) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag voor afwezige terreincontroles maximaal 50 zijn.",
      );
    }

    const {
      contract,
      sortering,
      richting,
    } =
      leesAfwezigeTerreincontroleLijstcontract(
        url,
        aanvraag.richting,
      );

    const [
      selectie,
      dashboard,
    ] =
      await Promise.all([
        laadAfwezigeTerreincontroleSelectie(
          {
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
          },
        ),
        laadAfwezigeTerreincontroleDashboardTellingen(),
      ]);

    const heeftVolgendePagina =
      selectie.length >
      aanvraag.limiet;

    const pagina =
      selectie.slice(
        0,
        aanvraag.limiet,
      );

    const aantalTotaal =
      pagina[0]
        ?.aantalTotaal ??
      (
        aanvraag.cursor ===
        null
          ? 0
          : null
      );

    const rijen =
      pagina.map(
        ({
          aantalTotaal:
            rijAantalTotaal,
          ...rij
        }) => {
          void rijAantalTotaal;

          return rij;
        },
      );

    const laatsteRij =
      rijen.at(-1);

    const volgendeCursor =
      heeftVolgendePagina &&
      laatsteRij
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
          fout:
            fout.message,
        },
        {
          status: 400,
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    console.error(
      "Ingeplande terreincontroles laden mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        fout:
          "De afwezige terreincontroles konden niet worden geladen.",
      },
      {
        status: 500,
        headers:
          GEEN_TABEL_CACHE,
      },
    );
  }
}

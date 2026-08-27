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
  LAATTIJDIGE_PLAATSBEZOEKEN_SORTERINGEN,
  leesLaattijdigePlaatsbezoekenLijstcontract,
  type LaattijdigePlaatsbezoekenSortering,
} from "@/lib/laattijdige-plaatsbezoeken-lijstcontract";
import {
  laadLaattijdigePlaatsbezoekenFilterwaarden,
  laadLaattijdigePlaatsbezoekenKaart,
  laadLaattijdigePlaatsbezoekenOverzicht,
  selecteerLaattijdigePlaatsbezoeken,
} from "@/lib/laattijdige-plaatsbezoeken-selectie";
import {
  GEEN_TABEL_CACHE,
  leesTabelAanvraag,
  maakTabelCursor,
  OngeldigePagineringFout,
} from "@/lib/server-paginering";

export const dynamic =
  "force-dynamic";

async function controleerToegang() {
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
          "Je hebt geen toegang tot laattijdige plaatsbezoeken.",
      },
      {
        status: 403,
        headers:
          GEEN_TABEL_CACHE,
      },
    );
  }

  return null;
}

export async function GET(
  verzoek: Request,
) {
  try {
    const toegangsFout =
      await controleerToegang();

    if (toegangsFout) {
      return toegangsFout;
    }

    const url =
      new URL(
        verzoek.url,
      );

    const filterwaardenKolom =
      url.searchParams.get(
        "filterwaardenKolom",
      );

    if (
      filterwaardenKolom !==
      null
    ) {
      if (
        !LAATTIJDIGE_PLAATSBEZOEKEN_SORTERINGEN.includes(
          filterwaardenKolom as
            LaattijdigePlaatsbezoekenSortering,
        )
      ) {
        throw new OngeldigePagineringFout(
          "De gekozen filterkolom is ongeldig.",
        );
      }

      const filterwaardenZoekterm =
        (
          url.searchParams.get(
            "filterwaardenZoekterm",
          ) ?? ""
        )
          .replace(
            /\s+/g,
            " ",
          )
          .trim();

      if (
        filterwaardenZoekterm.length >
        100
      ) {
        throw new OngeldigePagineringFout(
          "De zoekterm voor filterwaarden is te lang.",
        );
      }

      const waarden =
        await laadLaattijdigePlaatsbezoekenFilterwaarden(
          {
            kolom:
              filterwaardenKolom as
                LaattijdigePlaatsbezoekenSortering,
            zoekterm:
              filterwaardenZoekterm,
          },
        );

      const limiet =
        filterwaardenKolom ===
        "datum"
          ? 2000
          : 300;

      return NextResponse.json(
        {
          waarden,
          afgekapt:
            waarden.length ===
            limiet,
        },
        {
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    const onderdeel =
      url.searchParams.get(
        "onderdeel",
      ) ?? "tabel";

    if (
      onderdeel !== "tabel" &&
      onderdeel !== "kaart"
    ) {
      throw new OngeldigePagineringFout(
        "Het gekozen onderdeel is ongeldig.",
      );
    }

    if (
      onderdeel === "kaart"
    ) {
      const [
        rijen,
        overzicht,
      ] =
        await Promise.all([
          laadLaattijdigePlaatsbezoekenKaart(),
          laadLaattijdigePlaatsbezoekenOverzicht(),
        ]);

      return NextResponse.json(
        {
          rijen,
          overzicht,
        },
        {
          headers:
            GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag =
      leesTabelAanvraag(
        url,
        {
          toegelatenSorteringen:
            LAATTIJDIGE_PLAATSBEZOEKEN_SORTERINGEN,
          standaardSortering:
            "aangemeldOp",
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
        "De paginalimiet mag voor laattijdige plaatsbezoeken maximaal 50 zijn.",
      );
    }

    const {
      contract,
      sortering,
      richting,
    } =
      leesLaattijdigePlaatsbezoekenLijstcontract(
        url,
        aanvraag.richting,
      );

    const [
      selectie,
      overzicht,
    ] =
      await Promise.all([
        selecteerLaattijdigePlaatsbezoeken(
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
        laadLaattijdigePlaatsbezoekenOverzicht(),
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
        overzicht,
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
      "Laattijdige plaatsbezoeken laden mislukt:",
      fout,
    );

    return NextResponse.json(
      {
        fout:
          "De laattijdige plaatsbezoeken konden niet worden geladen.",
      },
      {
        status: 500,
        headers:
          GEEN_TABEL_CACHE,
      },
    );
  }
}

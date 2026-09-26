import { NextResponse } from "next/server";
import { heeftMachtiging } from "@/lib/autorisatie";
import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import {
  laadNonConformiteiten,
  laadNonConformiteitFilterwaarden,
  leesNonConformiteitFilters,
  leesNonConformiteitSorteringen,
  NON_CONFORMITEIT_SORTERINGEN,
  type NonConformiteitSortering,
} from "@/lib/non-conformiteit-lijst";
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
        { fout: "Je bent niet ingelogd." },
        {
          status: 401,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const magDeskcontrolesBekijken = heeftMachtiging(
      gebruiker.rollen,
      "DESKCONTROLES_BEKIJKEN",
    );

    const magTerreincontrolesBekijken = heeftMachtiging(
      gebruiker.rollen,
      "TERREINCONTROLES_BEKIJKEN",
    );

    if (!magDeskcontrolesBekijken && !magTerreincontrolesBekijken) {
      return NextResponse.json(
        {
          fout: "Je hebt geen toegang tot non-conformiteiten.",
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
        !NON_CONFORMITEIT_SORTERINGEN.includes(
          filterwaardenKolom as NonConformiteitSortering,
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

      const waarden = await laadNonConformiteitFilterwaarden({
        kolom: filterwaardenKolom as NonConformiteitSortering,
        zoekterm: filterwaardenZoekterm,
      });

      return NextResponse.json(
        {
          waarden,
          afgekapt: waarden.length === 500,
        },
        {
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: NON_CONFORMITEIT_SORTERINGEN,
      standaardSortering: "datumControle",
      standaardRichting: "desc",
      standaardLimiet: 50,
    });

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag maximaal 50 zijn.",
      );
    }

    const filters = leesNonConformiteitFilters(url);
    const sorteringen = leesNonConformiteitSorteringen(url);

    const selectie = await laadNonConformiteiten({
      zoekterm: aanvraag.zoekterm,
      filters,
      sorteringen,
      limiet: aanvraag.limiet,
      cursorId: aanvraag.cursor?.id ?? null,
    });

    const heeftVolgendePagina = selectie.length > aanvraag.limiet;
    const pagina = selectie.slice(0, aanvraag.limiet);
    const aantalTotaal =
      pagina[0]?.aantalTotaal ?? (aanvraag.cursor === null ? 0 : null);

    const rijen = pagina.map((selectieRij) => {
      const {
        aantalTotaal: rijAantalTotaal,
        datumControle,
        aangemaaktOp,
        ...rij
      } = selectieRij;

      void rijAantalTotaal;

      return {
        ...rij,
        datumControle: formatteerDatum(datumControle),
        aangemaaktOp: formatteerDatum(aangemaaktOp),
      };
    });

    const laatsteRij = rijen.at(-1);

    const volgendeCursor =
      heeftVolgendePagina && laatsteRij
        ? maakTabelCursor({
            id: laatsteRij.lijstId,
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
        { fout: fout.message },
        {
          status: 400,
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    console.error("Non-conformiteiten laden mislukt:", fout);

    return NextResponse.json(
      {
        fout: "De non-conformiteiten konden niet worden geladen.",
      },
      {
        status: 500,
        headers: GEEN_TABEL_CACHE,
      },
    );
  }
}

import { NextResponse } from "next/server";

import { haalIngelogdeGebruikerOp } from "@/lib/auth";
import {
  FORMULIERGEBRUIK_SORTERINGEN,
  leesFormuliergebruikLijstcontract,
  type FormuliergebruikSortering,
} from "@/lib/formuliergebruik-lijstcontract";
import {
  laadFormuliergebruikFilterwaarden,
  laadFormuliergebruikSelectie,
} from "@/lib/formuliergebruik-selectie";
import {
  GEEN_TABEL_CACHE,
  leesTabelAanvraag,
  maakTabelCursor,
  OngeldigePagineringFout,
} from "@/lib/server-paginering";

export const dynamic = "force-dynamic";

function fout(bericht: string, status: number) {
  return NextResponse.json(
    {
      fout: bericht,
    },
    {
      status,
      headers: GEEN_TABEL_CACHE,
    },
  );
}

export async function GET(verzoek: Request) {
  try {
    const gebruiker = await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return fout("Je bent niet ingelogd.", 401);
    }

    if (!gebruiker.rollen.includes("BEHEERDER")) {
      return fout(
        "Alleen beheerders hebben toegang tot formuliergebruik.",
        403,
      );
    }

    const url = new URL(verzoek.url);

    const filterwaardenKolom = url.searchParams.get("filterwaardenKolom");

    if (filterwaardenKolom !== null) {
      if (
        !FORMULIERGEBRUIK_SORTERINGEN.includes(
          filterwaardenKolom as FormuliergebruikSortering,
        )
      ) {
        throw new OngeldigePagineringFout(
          "De gekozen filterkolom is ongeldig.",
        );
      }

      const zoekterm = (url.searchParams.get("filterwaardenZoekterm") ?? "")
        .replace(/\s+/g, " ")
        .trim();

      if (zoekterm.length > 100) {
        throw new OngeldigePagineringFout(
          "De zoekterm voor filterwaarden is te lang.",
        );
      }

      const kolom = filterwaardenKolom as FormuliergebruikSortering;

      const waarden = await laadFormuliergebruikFilterwaarden({
        kolom,
        zoekterm,
      });

      const datumkolom =
        kolom === "gestartOp" ||
        kolom === "laatsteActiviteitOp" ||
        kolom === "ovamLinkLaatstOp";

      return NextResponse.json(
        {
          waarden,
          afgekapt: waarden.length === (datumkolom ? 2000 : 300),
        },
        {
          headers: GEEN_TABEL_CACHE,
        },
      );
    }

    const aanvraag = leesTabelAanvraag(url, {
      toegelatenSorteringen: FORMULIERGEBRUIK_SORTERINGEN,
      standaardSortering: "gestartOp",
      standaardRichting: "desc",
      standaardLimiet: 50,
    });

    if (aanvraag.limiet > 50) {
      throw new OngeldigePagineringFout(
        "De paginalimiet mag maximaal 50 zijn.",
      );
    }

    const contract = leesFormuliergebruikLijstcontract(url);

    const selectie = await laadFormuliergebruikSelectie({
      zoekterm: aanvraag.zoekterm,
      filters: contract.filters,
      sorteringen: contract.sorteringen,
      limiet: aanvraag.limiet,
      cursorId: aanvraag.cursor?.id ?? null,
    });

    const heeftVolgendePagina = selectie.length > aanvraag.limiet;

    const pagina = selectie.slice(0, aanvraag.limiet);

    const aantalTotaal =
      pagina[0]?.aantalTotaal ?? (aanvraag.cursor === null ? 0 : null);

    const rijen = pagina.map(
      ({
        aantalTotaal: rijAantal,
        gestartOp,
        laatsteActiviteitOp,
        ovamLinkLaatstOp,
        ...rij
      }) => {
        void rijAantal;

        return {
          ...rij,
          gestartOp: gestartOp.toISOString(),
          laatsteActiviteitOp: laatsteActiviteitOp.toISOString(),
          ovamLinkLaatstOp: ovamLinkLaatstOp?.toISOString() ?? null,
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
      },
      {
        headers: GEEN_TABEL_CACHE,
      },
    );
  } catch (error) {
    if (error instanceof OngeldigePagineringFout) {
      return fout(error.message, 400);
    }

    console.error("Formuliergebruik laden mislukt:", error);

    return fout("De formulierlogs konden niet worden geladen.", 500);
  }
}

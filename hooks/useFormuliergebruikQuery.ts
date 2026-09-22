"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { type FormuliergebruikRij } from "@/components/FormuliergebruikKaarten";
import { type FormuliergebruikCardSortering } from "@/components/FormuliergebruikKaartKolombalk";

type Invoer = {
  zoekterm: string;
  filters: Record<string, string>;
  sorteringen: FormuliergebruikCardSortering[];
};

type Pagina = {
  rijen: FormuliergebruikRij[];
  volgendeCursor: string | null;
  heeftVolgendePagina: boolean;
  aantalTotaal: number | null;
};

const FILTERPARAMETERS: Record<string, string> = {
  gestartOp: "filterGestartOp",
  laatsteActiviteitOp: "filterLaatsteActiviteitOp",
  actieveDuurSeconden: "filterActieveDuurSeconden",
  status: "filterStatus",
  stap: "filterStap",
  apparaat: "filterApparaat",
  naamAdi: "filterNaamAdi",
  persoonsId: "filterPersoonsId",
  foutcode: "filterFoutcode",
  foutmelding: "filterFoutmelding",
  ovamLinkGeklikt: "filterOvamLinkGeklikt",
  ovamLinkKlikken: "filterOvamLinkKlikken",
  ovamLinkLaatstOp: "filterOvamLinkLaatstOp",
  referentie: "filterReferentie",
  aantalPlaatsbezoeken: "filterAantalPlaatsbezoeken",
  id: "filterId",
};

function isPagina(waarde: unknown): waarde is Pagina {
  if (typeof waarde !== "object" || waarde === null) {
    return false;
  }

  const pagina = waarde as Record<string, unknown>;

  return (
    Array.isArray(pagina.rijen) &&
    (typeof pagina.volgendeCursor === "string" ||
      pagina.volgendeCursor === null) &&
    typeof pagina.heeftVolgendePagina === "boolean" &&
    (typeof pagina.aantalTotaal === "number" || pagina.aantalTotaal === null)
  );
}

async function leesFoutmelding(antwoord: Response) {
  try {
    const inhoud = (await antwoord.json()) as {
      fout?: unknown;
    };

    if (typeof inhoud.fout === "string" && inhoud.fout.trim()) {
      return inhoud.fout;
    }
  } catch {
    // Veilige algemene melding.
  }

  return "De formulierlogs konden niet worden geladen.";
}

export function useFormuliergebruikQuery({
  zoekterm,
  filters,
  sorteringen,
}: Invoer) {
  const [uitgesteldeZoekterm, setUitgesteldeZoekterm] = useState(zoekterm);

  const [uitgesteldeFilters, setUitgesteldeFilters] = useState(filters);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUitgesteldeZoekterm(zoekterm);
      setUitgesteldeFilters(filters);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filters, zoekterm]);

  const aanvraag = useMemo(
    () => ({
      zoekterm: uitgesteldeZoekterm.trim(),
      filters: uitgesteldeFilters,
      sorteringen,
    }),
    [sorteringen, uitgesteldeFilters, uitgesteldeZoekterm],
  );

  const query = useInfiniteQuery({
    queryKey: ["formuliergebruik", aanvraag],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const parameters = new URLSearchParams({
        limiet: "50",
      });

      if (aanvraag.zoekterm) {
        parameters.set("q", aanvraag.zoekterm);
      }

      for (const [sleutel, parameter] of Object.entries(FILTERPARAMETERS)) {
        const waarde = aanvraag.filters[sleutel]?.trim();

        if (waarde) {
          parameters.set(parameter, waarde);
        }
      }

      if (aanvraag.sorteringen.length > 0) {
        parameters.set(
          "sorteringen",
          aanvraag.sorteringen
            .map(
              (sortering) =>
                `${sortering.sleutel}:${
                  sortering.richting === "oplopend" ? "asc" : "desc"
                }`,
            )
            .join(","),
        );
      }

      if (pageParam) {
        parameters.set("cursor", pageParam);
      }

      const antwoord = await fetch(
        `/api/laattijdige-plaatsbezoeken/formuliergebruik/lijst?${parameters.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal,
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!antwoord.ok) {
        throw new Error(await leesFoutmelding(antwoord));
      }

      const inhoud: unknown = await antwoord.json();

      if (!isPagina(inhoud)) {
        throw new Error("De server gaf een ongeldig antwoord.");
      }

      return inhoud;
    },
    getNextPageParam: (laatstePagina) =>
      laatstePagina.heeftVolgendePagina
        ? (laatstePagina.volgendeCursor ?? undefined)
        : undefined,
  });

  const rijen = useMemo(() => {
    const perId = new Map<number, FormuliergebruikRij>();

    for (const pagina of query.data?.pages ?? []) {
      for (const rij of pagina.rijen) {
        perId.set(rij.id, rij);
      }
    }

    return Array.from(perId.values());
  }, [query.data]);

  const aantalTotaal =
    query.data?.pages
      .map((pagina) => pagina.aantalTotaal)
      .find((aantal): aantal is number => typeof aantal === "number") ?? null;

  return {
    rijen,
    aantalTotaal,
    fout: query.error instanceof Error ? query.error.message : null,
    isEersteKeerLaden: query.isPending,
    isVolgendePaginaLaden: query.isFetchingNextPage,
    heeftVolgendePagina: Boolean(query.hasNextPage),
    laadVolgendePagina: query.fetchNextPage,
    opnieuwLaden: query.refetch,
  };
}

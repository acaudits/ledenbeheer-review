"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type {
  NonConformiteitRij,
  NonConformiteitSortering,
} from "@/components/NonConformiteitenLijst";
import type { NonConformiteitCardSortering } from "@/components/NonConformiteitKaartKolombalk";

const FILTERPARAMETERS: Record<NonConformiteitSortering, string> = {
  bron: "filterBron",
  ncId: "filterNcId",
  categorie: "filterCategorie",
  parameter: "filterParameter",
  naamAdi: "filterNaamAdi",
  ovamId: "filterOvamId",
  datumControle: "filterDatumControle",
  attestnummer: "filterAttestnummer",
  adres: "filterAdres",
  vastgesteldDoorCi: "filterVastgesteldDoorCi",
  groteImpact: "filterGroteImpact",
};

type Pagina = {
  rijen: NonConformiteitRij[];
  volgendeCursor: string | null;
  heeftVolgendePagina: boolean;
  aantalTotaal: number | null;
};

type Invoer = {
  zoekterm: string;
  filters: Record<string, string>;
  sorteringen: NonConformiteitCardSortering[];
};

function maakAanvraagParameters(aanvraag: Invoer) {
  const parameters = new URLSearchParams();

  if (aanvraag.zoekterm) {
    parameters.set("q", aanvraag.zoekterm);
  }

  for (const [sleutel, parameter] of Object.entries(FILTERPARAMETERS)) {
    const waarde = aanvraag.filters[sleutel]?.trim();

    if (waarde) {
      parameters.set(parameter, waarde);
    }
  }

  if (aanvraag.sorteringen.length) {
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

  return parameters;
}

function isPagina(waarde: unknown): waarde is Pagina {
  if (typeof waarde !== "object" || waarde === null || Array.isArray(waarde)) {
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
    // Gebruik een veilige algemene foutmelding.
  }

  return "De non-conformiteiten konden niet worden geladen.";
}

export function useNonConformiteitenQuery({
  zoekterm,
  filters,
  sorteringen,
}: Invoer) {
  const [uitgesteld, setUitgesteld] = useState({
    zoekterm,
    filters,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUitgesteld({
        zoekterm,
        filters,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [zoekterm, filters]);

  const aanvraag = useMemo(
    () => ({
      zoekterm: uitgesteld.zoekterm.trim(),
      filters: uitgesteld.filters,
      sorteringen,
    }),
    [uitgesteld, sorteringen],
  );

  const query = useInfiniteQuery({
    queryKey: ["non-conformiteiten", aanvraag],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const parameters = maakAanvraagParameters(aanvraag);

      parameters.set("limiet", "50");

      if (pageParam) {
        parameters.set("cursor", pageParam);
      }

      const antwoord = await fetch(
        `/api/non-conformiteiten/lijst?${parameters.toString()}`,
        {
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
    const perId = new Map<number, NonConformiteitRij>();

    for (const pagina of query.data?.pages ?? []) {
      for (const rij of pagina.rijen) {
        perId.set(rij.lijstId, rij);
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

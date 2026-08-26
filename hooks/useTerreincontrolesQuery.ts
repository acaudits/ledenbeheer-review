"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { type TerreincontroleDossierRij } from "@/components/TerreincontroleDossiersTabel";

export const TERREINCONTROLES_QUERY_SLEUTEL = ["terreincontroles"] as const;

export const TERREINCONTROLE_SERVERGEGEVENS_EVENT =
  "terreincontrole-servergegevens";

export type TerreincontroleServergegevens = {
  dashboard: TerreincontroleDashboardTellingen;
};

const TEKSTFILTERPARAMETERS = {
  auditeur: "filterAuditeur",
  naamAdi: "filterNaamAdi",
  linkAttest: "filterLinkAttest",
  attestnummer: "filterAttestnummer",
  certificatiePlatform: "filterCertificatiePlatform",
  opmerkingen: "filterOpmerkingen",
  datumControle: "filterDatumControle",
  adres: "filterAdres",
  persoonsId: "filterPersoonsId",
  bedrijfsnaam: "filterBedrijfsnaam",
  ondernemingsnummer: "filterOndernemingsnummer",
  persoonscertificaat: "filterPersoonscertificaat",
  procescertificaat: "filterProcescertificaat",
  attestId: "filterAttestId",
} as const;

export type TerreincontroleCardSortering = {
  sleutel: string;
  richting: "oplopend" | "aflopend";
};

export type TerreincontroleDashboardTellingen = {
  terreincontroles: number;
  nonConformiteiten: number;
};

type Invoer = {
  ingeschakeld?: boolean;
  zoekterm: string;
  filters: Record<string, string>;
  datumJaar: string;
  datumMaand: string;
  sorteringen: TerreincontroleCardSortering[];
};

type Pagina = {
  rijen: TerreincontroleDossierRij[];
  volgendeCursor: string | null;
  heeftVolgendePagina: boolean;
  aantalTotaal: number | null;
  dashboard: TerreincontroleDashboardTellingen;
};

function isDashboard(
  waarde: unknown,
): waarde is TerreincontroleDashboardTellingen {
  if (typeof waarde !== "object" || waarde === null) {
    return false;
  }

  const dashboard = waarde as Record<string, unknown>;

  return (
    typeof dashboard.terreincontroles === "number" &&
    typeof dashboard.nonConformiteiten === "number"
  );
}

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
    (typeof pagina.aantalTotaal === "number" || pagina.aantalTotaal === null) &&
    isDashboard(pagina.dashboard)
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
    // Gebruik een veilige algemene melding.
  }

  return "De terreincontroles konden niet worden geladen.";
}

export function useTerreincontrolesQuery({
  ingeschakeld = true,
  zoekterm,
  filters,
  datumJaar,
  datumMaand,
  sorteringen,
}: Invoer) {
  const [uitgesteld, setUitgesteld] = useState({
    zoekterm,
    filters,
    datumJaar,
    datumMaand,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUitgesteld({
        zoekterm,
        filters,
        datumJaar,
        datumMaand,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [zoekterm, filters, datumJaar, datumMaand]);

  const aanvraag = useMemo(
    () => ({
      zoekterm: uitgesteld.zoekterm.trim(),
      filters: uitgesteld.filters,
      datumJaar: uitgesteld.datumJaar,
      datumMaand: uitgesteld.datumMaand,
      sorteringen,
    }),
    [uitgesteld, sorteringen],
  );

  const query = useInfiniteQuery({
    enabled: ingeschakeld,
    queryKey: [...TERREINCONTROLES_QUERY_SLEUTEL, aanvraag],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const parameters = new URLSearchParams({
        limiet: "50",
      });

      if (aanvraag.zoekterm) {
        parameters.set("q", aanvraag.zoekterm);
      }

      for (const [sleutel, parameter] of Object.entries(
        TEKSTFILTERPARAMETERS,
      )) {
        const waarde = aanvraag.filters[sleutel]?.trim();

        if (waarde) {
          parameters.set(parameter, waarde);
        }
      }

      if (aanvraag.datumJaar) {
        parameters.set("jaarDatumControle", aanvraag.datumJaar);
      }

      if (aanvraag.datumMaand) {
        parameters.set("maandDatumControle", aanvraag.datumMaand);
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
        `/api/terreincontroles/lijst?${parameters.toString()}`,
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
        throw new Error(
          "De server gaf een ongeldig antwoord voor terreincontroles.",
        );
      }

      return inhoud;
    },
    getNextPageParam: (laatstePagina) =>
      laatstePagina.heeftVolgendePagina
        ? (laatstePagina.volgendeCursor ?? undefined)
        : undefined,
  });

  const rijen = useMemo(() => {
    const perId = new Map<number, TerreincontroleDossierRij>();

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

  const dashboard = query.data?.pages[0]?.dashboard ?? null;

  useEffect(() => {
    if (!ingeschakeld || !dashboard) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<TerreincontroleServergegevens>(
        TERREINCONTROLE_SERVERGEGEVENS_EVENT,
        {
          detail: {
            dashboard,
          },
        },
      ),
    );
  }, [ingeschakeld, dashboard]);

  return {
    rijen,
    aantalTotaal,
    dashboard,
    fout: query.error instanceof Error ? query.error.message : null,
    isEersteKeerLaden: ingeschakeld && query.isPending,
    isVolgendePaginaLaden: ingeschakeld && query.isFetchingNextPage,
    heeftVolgendePagina: ingeschakeld && Boolean(query.hasNextPage),
    laadVolgendePagina: query.fetchNextPage,
    opnieuwLaden: query.refetch,
  };
}

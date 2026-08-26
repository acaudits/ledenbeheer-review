"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { type DeskcontroleRij } from "@/components/DeskcontrolesTabel";
export type DeskcontroleDashboardFilter =
  | "afgerond"
  | "in-opmaak"
  | "geactualiseerd"
  | "openstaand"
  | "binnen-zeven-dagen"
  | "verstreken";

export const DESKCONTROLES_QUERY_SLEUTEL = ["deskcontroles"] as const;

const DESKCONTROLE_TEKSTFILTERPARAMETERS = {
  auditeur: "filterAuditeur",
  naamAdi: "filterNaamAdi",
  afgerond: "filterAfgerond",
  linkAttest: "filterLinkAttest",
  attestnummer: "filterAttestnummer",
  status: "filterStatus",
  deadlineSanctie: "filterDeadlineSanctie",
  mailSanctieVerzonden: "filterMailSanctieVerzonden",
  typeControle: "filterTypeControle",
  mailCorrectieVerzonden: "filterMailCorrectieVerzonden",
  oneDrive: "filterOneDrive",
  voorwaardelijkeOpheffing: "filterVoorwaardelijkeOpheffing",
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

export type DeskcontroleCardSortering = {
  sleutel: string;
  richting: "oplopend" | "aflopend";
};

type DatumFilter = {
  jaar: string;
  maand: string;
};

export type DeskcontroleDashboardTellingen = {
  afgerond: number;
  inOpmaak: number;
  geactualiseerd: number;
  openstaand: number;
  binnenZevenDagen: number;
  verstreken: number;
};

export const DESKCONTROLE_SERVERGEGEVENS_EVENT = "deskcontrole-servergegevens";

export type DeskcontroleServergegevens = {
  aantalTotaal: number | null;
  dashboard: DeskcontroleDashboardTellingen | null;
};

type Invoer = {
  ingeschakeld?: boolean;
  zoekterm: string;
  filters: Record<string, string>;
  datumFilters: Record<string, DatumFilter>;
  sorteringen: DeskcontroleCardSortering[];
  dashboardFilter: DeskcontroleDashboardFilter | null;
};

type Pagina = {
  rijen: DeskcontroleRij[];
  volgendeCursor: string | null;
  heeftVolgendePagina: boolean;
  aantalTotaal: number | null;
  dashboard: DeskcontroleDashboardTellingen;
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
    (typeof pagina.aantalTotaal === "number" || pagina.aantalTotaal === null) &&
    typeof pagina.dashboard === "object" &&
    pagina.dashboard !== null
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
    // Gebruik veilige algemene melding.
  }

  return "De deskcontroles konden niet worden geladen.";
}

export function useDeskcontrolesQuery({
  ingeschakeld = true,
  zoekterm,
  filters,
  datumFilters,
  sorteringen,
  dashboardFilter,
}: Invoer) {
  const [uitgesteld, setUitgesteld] = useState({
    zoekterm,
    filters,
    datumFilters,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUitgesteld({
        zoekterm,
        filters,
        datumFilters,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [zoekterm, filters, datumFilters]);

  const aanvraag = useMemo(
    () => ({
      zoekterm: uitgesteld.zoekterm.trim(),
      filters: uitgesteld.filters,
      datumFilters: uitgesteld.datumFilters,
      sorteringen,
      dashboardFilter,
    }),
    [uitgesteld, sorteringen, dashboardFilter],
  );

  const query = useInfiniteQuery({
    enabled: ingeschakeld,
    queryKey: [...DESKCONTROLES_QUERY_SLEUTEL, aanvraag],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const parameters = new URLSearchParams({
        limiet: "50",
      });

      if (aanvraag.zoekterm) {
        parameters.set("q", aanvraag.zoekterm);
      }

      if (aanvraag.dashboardFilter) {
        parameters.set("dashboardFilter", aanvraag.dashboardFilter);
      }

      for (const [sleutel, parameter] of Object.entries(
        DESKCONTROLE_TEKSTFILTERPARAMETERS,
      )) {
        const waarde = aanvraag.filters[sleutel]?.trim();

        if (waarde) {
          parameters.set(parameter, waarde);
        }
      }

      for (const [sleutel, filter] of Object.entries(aanvraag.datumFilters)) {
        const suffix = `${sleutel[0].toUpperCase()}${sleutel.slice(1)}`;

        if (filter.jaar) {
          parameters.set(`jaar${suffix}`, filter.jaar);
        }

        if (filter.maand) {
          parameters.set(`maand${suffix}`, filter.maand);
        }
      }

      if (aanvraag.sorteringen.length > 0) {
        parameters.set(
          "sorteringen",
          aanvraag.sorteringen
            .map(
              ({ sleutel, richting }) =>
                `${sleutel}:${richting === "oplopend" ? "asc" : "desc"}`,
            )
            .join(","),
        );
      }

      if (pageParam) {
        parameters.set("cursor", pageParam);
      }

      const antwoord = await fetch(
        `/api/deskcontroles/lijst?${parameters.toString()}`,
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
    const perId = new Map<number, DeskcontroleRij>();

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
    dashboard: query.data?.pages[0]?.dashboard ?? null,
    fout: query.error instanceof Error ? query.error.message : null,
    isEersteKeerLaden: ingeschakeld && query.isPending,
    isVolgendePaginaLaden: ingeschakeld && query.isFetchingNextPage,
    heeftVolgendePagina: ingeschakeld && Boolean(query.hasNextPage),
    laadVolgendePagina: query.fetchNextPage,
    opnieuwLaden: query.refetch,
  };
}

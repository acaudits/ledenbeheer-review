"use client";

import {
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type NaFinalisatieRij,
} from "@/components/NaFinalisatieTabel";

export const NA_FINALISATIE_QUERY_SLEUTEL =
  [
    "na-finalisatie",
  ] as const;

export const NA_FINALISATIE_SERVERGEGEVENS_EVENT =
  "na-finalisatie-servergegevens";

export type NaFinalisatieDashboardTellingen = {
  registraties: number;
  geregistreerd: number;
  nietGeregistreerd: number;
  spontaan: number;
  afspraakOfKlacht: number;
};

export type NaFinalisatieServergegevens = {
  dashboard:
    NaFinalisatieDashboardTellingen;
};

const TEKSTFILTERPARAMETERS = {
  auditeur:
    "filterAuditeur",
  naamAdi:
    "filterNaamAdi",
  geregistreerd:
    "filterGeregistreerd",
  linkAttest:
    "filterLinkAttest",
  attestnummer:
    "filterAttestnummer",
  datumNaFinalisatie:
    "filterDatumNaFinalisatie",
  plaatsbezoek:
    "filterPlaatsbezoek",
  typeControle:
    "filterTypeControle",
  reden:
    "filterReden",
  opmerking:
    "filterOpmerking",
  inspectielocatie:
    "filterInspectielocatie",
  naamBedrijf:
    "filterNaamBedrijf",
  persoonsId:
    "filterPersoonsId",
  attestId:
    "filterAttestId",
} as const;

type Sortering = {
  sleutel: string;
  richting:
    | "oplopend"
    | "aflopend";
} | null;

type Invoer = {
  ingeschakeld?: boolean;
  zoekterm: string;
  filters:
    Record<string, string>;
  datumJaar: string;
  datumMaand: string;
  sortering: Sortering;
};

type Pagina = {
  rijen:
    NaFinalisatieRij[];
  volgendeCursor:
    string | null;
  heeftVolgendePagina:
    boolean;
  aantalTotaal:
    number | null;
  dashboard:
    NaFinalisatieDashboardTellingen;
};

function isDashboard(
  waarde: unknown,
): waarde is NaFinalisatieDashboardTellingen {
  if (
    typeof waarde !==
      "object" ||
    waarde === null
  ) {
    return false;
  }

  const dashboard =
    waarde as Record<
      string,
      unknown
    >;

  return (
    typeof dashboard
      .registraties ===
      "number" &&
    typeof dashboard
      .geregistreerd ===
      "number" &&
    typeof dashboard
      .nietGeregistreerd ===
      "number" &&
    typeof dashboard
      .spontaan ===
      "number" &&
    typeof dashboard
      .afspraakOfKlacht ===
      "number"
  );
}

function isPagina(
  waarde: unknown,
): waarde is Pagina {
  if (
    typeof waarde !==
      "object" ||
    waarde === null
  ) {
    return false;
  }

  const pagina =
    waarde as Record<
      string,
      unknown
    >;

  return (
    Array.isArray(
      pagina.rijen,
    ) &&
    (
      typeof pagina
        .volgendeCursor ===
        "string" ||
      pagina.volgendeCursor ===
        null
    ) &&
    typeof pagina
      .heeftVolgendePagina ===
      "boolean" &&
    (
      typeof pagina
        .aantalTotaal ===
        "number" ||
      pagina.aantalTotaal ===
        null
    ) &&
    isDashboard(
      pagina.dashboard,
    )
  );
}

async function leesFoutmelding(
  antwoord: Response,
) {
  try {
    const inhoud =
      await antwoord.json() as {
        fout?: unknown;
      };

    if (
      typeof inhoud.fout ===
        "string" &&
      inhoud.fout.trim()
    ) {
      return inhoud.fout;
    }
  } catch {
    // Gebruik een veilige algemene foutmelding.
  }

  return "De registraties van Na finalisatie konden niet worden geladen.";
}

export function useNaFinalisatieQuery({
  ingeschakeld = true,
  zoekterm,
  filters,
  datumJaar,
  datumMaand,
  sortering,
}: Invoer) {
  const [
    uitgesteldeZoekterm,
    setUitgesteldeZoekterm,
  ] = useState(
    zoekterm,
  );

  const filtersSleutel =
    JSON.stringify(
      filters,
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setUitgesteldeZoekterm(
            zoekterm,
          );
        },
        250,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [zoekterm]);

  const query =
    useInfiniteQuery({
      queryKey: [
        ...NA_FINALISATIE_QUERY_SLEUTEL,
        uitgesteldeZoekterm,
        filtersSleutel,
        datumJaar,
        datumMaand,
        sortering?.sleutel ??
          "",
        sortering?.richting ??
          "",
      ],
      enabled:
        ingeschakeld,
      initialPageParam:
        null as string | null,
      queryFn: async ({
        pageParam,
        signal,
      }) => {
        const parameters =
          new URLSearchParams();

        parameters.set(
          "limiet",
          "50",
        );

        if (
          uitgesteldeZoekterm.trim()
        ) {
          parameters.set(
            "q",
            uitgesteldeZoekterm.trim(),
          );
        }

        for (
          const [
            sleutel,
            parameter,
          ] of Object.entries(
            TEKSTFILTERPARAMETERS,
          )
        ) {
          const waarde =
            filters[
              sleutel
            ]?.trim();

          if (waarde) {
            parameters.set(
              parameter,
              waarde,
            );
          }
        }

        if (datumJaar) {
          parameters.set(
            "jaarDatumNaFinalisatie",
            datumJaar,
          );
        }

        if (datumMaand) {
          parameters.set(
            "maandDatumNaFinalisatie",
            datumMaand,
          );
        }

        if (sortering) {
          parameters.set(
            "sortering",
            sortering.sleutel,
          );

          parameters.set(
            "richting",
            sortering.richting ===
              "oplopend"
              ? "asc"
              : "desc",
          );
        }

        if (pageParam) {
          parameters.set(
            "cursor",
            pageParam,
          );
        }

        const antwoord =
          await fetch(
            `/api/na-finalisatie/lijst?${parameters.toString()}`,
            {
              method: "GET",
              credentials:
                "same-origin",
              cache: "no-store",
              signal,
            },
          );

        if (!antwoord.ok) {
          throw new Error(
            await leesFoutmelding(
              antwoord,
            ),
          );
        }

        const inhoud:
          unknown =
          await antwoord.json();

        if (!isPagina(inhoud)) {
          throw new Error(
            "De server gaf een ongeldig antwoord voor Na finalisatie.",
          );
        }

        return inhoud;
      },
      getNextPageParam: (
        laatstePagina,
      ) =>
        laatstePagina
          .heeftVolgendePagina
          ? laatstePagina
              .volgendeCursor ??
            undefined
          : undefined,
    });

  const rijen =
    useMemo(() => {
      const perId =
        new Map<
          number,
          NaFinalisatieRij
        >();

      for (
        const pagina of
        query.data?.pages ??
          []
      ) {
        for (
          const rij of
          pagina.rijen
        ) {
          perId.set(
            rij.id,
            rij,
          );
        }
      }

      return Array.from(
        perId.values(),
      );
    }, [query.data]);

  const aantalTotaal =
    query.data?.pages
      .map(
        (pagina) =>
          pagina.aantalTotaal,
      )
      .find(
        (
          aantal,
        ): aantal is number =>
          typeof aantal ===
          "number",
      ) ?? null;

  const dashboard =
    query.data?.pages[0]
      ?.dashboard ?? null;

  useEffect(() => {
    if (
      !ingeschakeld ||
      !dashboard
    ) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<NaFinalisatieServergegevens>(
        NA_FINALISATIE_SERVERGEGEVENS_EVENT,
        {
          detail: {
            dashboard,
          },
        },
      ),
    );
  }, [
    ingeschakeld,
    dashboard,
  ]);

  return {
    rijen,
    aantalTotaal,
    dashboard,
    fout:
      query.error instanceof
        Error
        ? query.error.message
        : null,
    isEersteKeerLaden:
      ingeschakeld &&
      query.isPending,
    isVolgendePaginaLaden:
      ingeschakeld &&
      query
        .isFetchingNextPage,
    heeftVolgendePagina:
      ingeschakeld &&
      Boolean(
        query.hasNextPage,
      ),
    laadVolgendePagina:
      query.fetchNextPage,
    opnieuwLaden:
      query.refetch,
  };
}

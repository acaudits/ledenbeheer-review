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
  type TerreincontroleRij as BasisTerreincontroleRij,
} from "@/components/TerreincontrolesTabel";

export type AfwezigeTerreincontroleRij =
  BasisTerreincontroleRij & {
    afwezigReden:
      string | null;
    ovamIdRood: boolean;
  };

export const AFWEZIGE_TERREINCONTROLES_QUERY_SLEUTEL =
  [
    "terreincontroles-inplannen-afwezigen",
  ] as const;

export const AFWEZIGE_TERREINCONTROLE_SERVERGEGEVENS_EVENT =
  "afwezige-terreincontrole-servergegevens";

export const AFWEZIGE_TERREINCONTROLE_DASHBOARDFILTER_EVENT =
  "afwezige-terreincontrole-dashboardfilter";

export type AfwezigeTerreincontroleDashboardfilter =
  | "alle"
  | "factuurVerzonden"
  | "rood";

export type AfwezigeTerreincontroleDashboardTellingen = {
  aantalAfwezigen: number;
  facturenVerzonden: number;
  aantalRodePersoonsIds:
    number;
};

export type AfwezigeTerreincontroleServergegevens = {
  dashboard:
    AfwezigeTerreincontroleDashboardTellingen;
};

const TEKSTFILTERPARAMETERS = {
  status: "filterStatus",
  auditeur: "filterAuditeur",
  factuurVerzonden:
    "filterFactuurVerzonden",
  inspectielocatie:
    "filterInspectielocatie",
  bouwjaar: "filterBouwjaar",
  vloeroppervlakteM2:
    "filterVloeroppervlakteM2",
  uurPlaatsbezoek:
    "filterUurPlaatsbezoek",
  ovamId: "filterOvamId",
  naamAdi: "filterNaamAdi",
  attestUrl: "filterAttestUrl",
  bedrijfsnaam:
    "filterBedrijfsnaam",
  postcode: "filterPostcode",
  gemeente: "filterGemeente",
  straat: "filterStraat",
  huisnummer: "filterHuisnummer",
  extraAdresDetails:
    "filterExtraAdresDetails",
  perceelGemeenteCode:
    "filterPerceelGemeenteCode",
  perceelAfdelingscode:
    "filterPerceelAfdelingscode",
  perceelSectieCode:
    "filterPerceelSectieCode",
  attestId: "filterAttestId",
  opmerkingen: "filterOpmerkingen",
  afwezigReden:
    "filterAfwezigReden",
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
    AfwezigeTerreincontroleRij[];
  volgendeCursor:
    string | null;
  heeftVolgendePagina:
    boolean;
  aantalTotaal:
    number | null;
  dashboard:
    AfwezigeTerreincontroleDashboardTellingen;
};

function isDashboard(
  waarde: unknown,
): waarde is AfwezigeTerreincontroleDashboardTellingen {
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
      .aantalAfwezigen ===
      "number" &&
    typeof dashboard
      .facturenVerzonden ===
      "number" &&
    typeof dashboard
      .aantalRodePersoonsIds ===
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
    // Gebruik een veilige algemene melding.
  }

  return "De afwezige terreincontroles konden niet worden geladen.";
}

export function useAfwezigeTerreincontrolesQuery({
  ingeschakeld = true,
  zoekterm,
  filters,
  datumJaar,
  datumMaand,
  sortering,
}: Invoer) {
  const [
    uitgesteld,
    setUitgesteld,
  ] = useState({
    zoekterm,
    filters,
    datumJaar,
    datumMaand,
  });

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setUitgesteld({
            zoekterm,
            filters,
            datumJaar,
            datumMaand,
          });
        },
        300,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    zoekterm,
    filters,
    datumJaar,
    datumMaand,
  ]);

  const aanvraag =
    useMemo(
      () => ({
        zoekterm:
          uitgesteld
            .zoekterm
            .trim(),
        filters:
          uitgesteld.filters,
        datumJaar:
          uitgesteld.datumJaar,
        datumMaand:
          uitgesteld.datumMaand,
        sortering,
      }),
      [
        uitgesteld,
        sortering,
      ],
    );

  const query =
    useInfiniteQuery({
      enabled: ingeschakeld,
      queryKey: [
        ...AFWEZIGE_TERREINCONTROLES_QUERY_SLEUTEL,
        aanvraag,
      ],
      initialPageParam:
        null as string | null,
      queryFn: async ({
        pageParam,
        signal,
      }) => {
        const parameters =
          new URLSearchParams({
            limiet: "50",
          });

        if (
          aanvraag.zoekterm
        ) {
          parameters.set(
            "q",
            aanvraag.zoekterm,
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
            aanvraag.filters[
              sleutel
            ]?.trim();

          if (waarde) {
            parameters.set(
              parameter,
              waarde,
            );
          }
        }

        if (
          aanvraag.filters
            .ovamIdRood ===
          "true"
        ) {
          parameters.set(
            "alleenRood",
            "true",
          );
        }

        if (
          aanvraag.datumJaar
        ) {
          parameters.set(
            "jaarDatumPlaatsbezoek",
            aanvraag.datumJaar,
          );
        }

        if (
          aanvraag.datumMaand
        ) {
          parameters.set(
            "maandDatumPlaatsbezoek",
            aanvraag.datumMaand,
          );
        }

        if (
          aanvraag.sortering
        ) {
          parameters.set(
            "sortering",
            aanvraag
              .sortering
              .sleutel,
          );

          parameters.set(
            "richting",
            aanvraag
              .sortering
              .richting ===
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
            `/api/terreincontroles-inplannen/afwezigen/lijst?${parameters.toString()}`,
            {
              credentials:
                "same-origin",
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

        if (
          !isPagina(
            inhoud,
          )
        ) {
          throw new Error(
            "De server gaf een ongeldig antwoord.",
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
              .volgendeCursor
          : undefined,
    });

  const rijen =
    useMemo(() => {
      const perId =
        new Map<
          number,
          AfwezigeTerreincontroleRij
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
      new CustomEvent<AfwezigeTerreincontroleServergegevens>(
        AFWEZIGE_TERREINCONTROLE_SERVERGEGEVENS_EVENT,
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

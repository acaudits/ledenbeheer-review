"use client";

import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type LaattijdigKaartbezoek,
} from "@/components/LaattijdigePlaatsbezoekenKaart";
import {
  type LaattijdigPlaatsbezoekRij,
} from "@/components/LaattijdigePlaatsbezoekenTabel";

export const LAATTIJDIGE_PLAATSBEZOEKEN_QUERY_SLEUTEL =
  [
    "laattijdige-plaatsbezoeken",
  ] as const;

export const LAATTIJDIGE_PLAATSBEZOEKEN_SERVERGEGEVENS_EVENT =
  "laattijdige-plaatsbezoeken-servergegevens";

export type LaattijdigePlaatsbezoekenOverzicht = {
  plaatsbezoeken: number;
  meldingen: number;
  referentieTijdIso: string;
};

export type LaattijdigePlaatsbezoekenServergegevens = {
  overzicht:
    LaattijdigePlaatsbezoekenOverzicht;
};

const TEKSTFILTERPARAMETERS = {
  referentie:
    "filterReferentie",
  timer:
    "filterTimer",
  naamAdi:
    "filterNaamAdi",
  bedrijfsnaam:
    "filterBedrijfsnaam",
  aantalAttesten:
    "filterAantalAttesten",
  laatsteTerreincontrole:
    "filterLaatsteTerreincontrole",
  aantalTerreincontroles:
    "filterAantalTerreincontroles",
  inspectielocatie:
    "filterInspectielocatie",
  datum:
    "filterDatum",
  tijdstip:
    "filterTijdstip",
  gemeenschappelijkeDelen:
    "filterGemeenschappelijkeDelen",
  extraAdresdetails:
    "filterExtraAdresdetails",
  reden:
    "filterReden",
  aangemeldOp:
    "filterAangemeldOp",
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
    LaattijdigPlaatsbezoekRij[];
  volgendeCursor:
    string | null;
  heeftVolgendePagina:
    boolean;
  aantalTotaal:
    number | null;
  overzicht:
    LaattijdigePlaatsbezoekenOverzicht;
};

type KaartAntwoord = {
  rijen:
    LaattijdigKaartbezoek[];
  overzicht:
    LaattijdigePlaatsbezoekenOverzicht;
};

function isOverzicht(
  waarde: unknown,
): waarde is LaattijdigePlaatsbezoekenOverzicht {
  if (
    typeof waarde !== "object" ||
    waarde === null
  ) {
    return false;
  }

  const overzicht =
    waarde as Record<
      string,
      unknown
    >;

  return (
    typeof overzicht
      .plaatsbezoeken ===
      "number" &&
    typeof overzicht
      .meldingen ===
      "number" &&
    typeof overzicht
      .referentieTijdIso ===
      "string"
  );
}

function isPagina(
  waarde: unknown,
): waarde is Pagina {
  if (
    typeof waarde !== "object" ||
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
    isOverzicht(
      pagina.overzicht,
    )
  );
}

function isKaartAntwoord(
  waarde: unknown,
): waarde is KaartAntwoord {
  if (
    typeof waarde !== "object" ||
    waarde === null
  ) {
    return false;
  }

  const antwoord =
    waarde as Record<
      string,
      unknown
    >;

  return (
    Array.isArray(
      antwoord.rijen,
    ) &&
    isOverzicht(
      antwoord.overzicht,
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

  return "De laattijdige plaatsbezoeken konden niet worden geladen.";
}

export function useLaattijdigePlaatsbezoekenQuery({
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

    return () => {
      window.clearTimeout(
        timer,
      );
    };
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
      enabled:
        ingeschakeld,
      queryKey: [
        ...LAATTIJDIGE_PLAATSBEZOEKEN_QUERY_SLEUTEL,
        "tabel",
        aanvraag,
      ],
      initialPageParam:
        null as string | null,
      refetchInterval:
        60_000,
      refetchOnWindowFocus:
        true,
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
            `/api/laattijdige-plaatsbezoeken/lijst?${parameters.toString()}`,
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
            "De server gaf een ongeldig tabelantwoord voor laattijdige plaatsbezoeken.",
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
          LaattijdigPlaatsbezoekRij
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

  const overzicht =
    query.data?.pages[0]
      ?.overzicht ?? null;

  useEffect(() => {
    if (
      !ingeschakeld ||
      !overzicht
    ) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<LaattijdigePlaatsbezoekenServergegevens>(
        LAATTIJDIGE_PLAATSBEZOEKEN_SERVERGEGEVENS_EVENT,
        {
          detail: {
            overzicht,
          },
        },
      ),
    );
  }, [
    ingeschakeld,
    overzicht,
  ]);

  return {
    rijen,
    aantalTotaal,
    overzicht,
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

export function useLaattijdigePlaatsbezoekenKaartQuery({
  ingeschakeld = true,
}: {
  ingeschakeld?: boolean;
} = {}) {
  const query =
    useQuery({
      enabled:
        ingeschakeld,
      queryKey: [
        ...LAATTIJDIGE_PLAATSBEZOEKEN_QUERY_SLEUTEL,
        "kaart",
      ],
      refetchInterval:
        60_000,
      refetchOnWindowFocus:
        true,
      queryFn: async ({
        signal,
      }) => {
        const antwoord =
          await fetch(
            "/api/laattijdige-plaatsbezoeken/lijst?onderdeel=kaart",
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

        if (
          !isKaartAntwoord(
            inhoud,
          )
        ) {
          throw new Error(
            "De server gaf een ongeldig kaartantwoord voor laattijdige plaatsbezoeken.",
          );
        }

        return inhoud;
      },
    });

  return {
    rijen:
      query.data?.rijen ??
      [],
    overzicht:
      query.data?.overzicht ??
      null,
    fout:
      query.error instanceof
        Error
        ? query.error.message
        : null,
    isLaden:
      ingeschakeld &&
      query.isPending,
    opnieuwLaden:
      query.refetch,
  };
}

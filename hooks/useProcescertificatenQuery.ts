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
  type CertificaatRij,
} from "@/components/CertificatenTabel";

type Sorteerrichting =
  | "oplopend"
  | "aflopend";

type Sortering = {
  sleutel: string;
  richting: Sorteerrichting;
} | null;

type DatumFilter = {
  jaar: string;
  maand: string;
};

type ProcescertificatenQueryInvoer = {
  ingeschakeld?: boolean;
  zoekterm: string;
  kolomFilters:
    Record<string, string>;
  datumFilters:
    Record<string, DatumFilter>;
  sortering: Sortering;
};

type ProcescertificatenPagina = {
  rijen: CertificaatRij[];
  volgendeCursor: string | null;
  heeftVolgendePagina: boolean;
  aantalTotaal: number | null;
};

export const PROCESCERTIFICATEN_QUERY_SLEUTEL = [
  "procescertificaten",
] as const;

const FILTERPARAMETERS:
  Record<string, string> = {
    bedrijf: "filterBedrijf",
    kboNummer:
      "filterKboNummer",
    certificaatnummer:
      "filterCertificaatnummer",
    oneDrive:
      "filterOneDrive",
    opmerking:
      "filterOpmerking",
    ondernemingstype:
      "filterOndernemingstype",
  };

function isPagina(
  waarde: unknown,
): waarde is ProcescertificatenPagina {
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
    Array.isArray(pagina.rijen) &&
    (
      typeof pagina.volgendeCursor ===
        "string" ||
      pagina.volgendeCursor === null
    ) &&
    typeof pagina.heeftVolgendePagina ===
      "boolean" &&
    (
      typeof pagina.aantalTotaal ===
        "number" ||
      pagina.aantalTotaal === null
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
    // Gebruik de veilige algemene foutmelding.
  }

  return "De procescertificaten konden niet worden geladen.";
}

export function useProcescertificatenQuery({
  ingeschakeld = true,
  zoekterm,
  kolomFilters,
  datumFilters,
  sortering,
}: ProcescertificatenQueryInvoer) {
  const [
    uitgesteldeZoekterm,
    setUitgesteldeZoekterm,
  ] = useState(
    zoekterm,
  );

  const [
    uitgesteldeKolomFilters,
    setUitgesteldeKolomFilters,
  ] = useState(
    kolomFilters,
  );

  const [
    uitgesteldeDatumFilters,
    setUitgesteldeDatumFilters,
  ] = useState(
    datumFilters,
  );

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setUitgesteldeZoekterm(
          zoekterm,
        );
        setUitgesteldeKolomFilters(
          kolomFilters,
        );
        setUitgesteldeDatumFilters(
          datumFilters,
        );
      }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    zoekterm,
    kolomFilters,
    datumFilters,
  ]);

  const aanvraagSleutel =
    useMemo(
      () => ({
        zoekterm:
          uitgesteldeZoekterm
            .trim(),
        kolomFilters:
          uitgesteldeKolomFilters,
        datumFilters:
          uitgesteldeDatumFilters,
        sortering,
      }),
      [
        uitgesteldeZoekterm,
        uitgesteldeKolomFilters,
        uitgesteldeDatumFilters,
        sortering,
      ],
    );

  const query =
    useInfiniteQuery({
      enabled:
        ingeschakeld,
      queryKey: [
        ...PROCESCERTIFICATEN_QUERY_SLEUTEL,
        aanvraagSleutel,
      ],
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
          aanvraagSleutel
            .zoekterm
        ) {
          parameters.set(
            "q",
            aanvraagSleutel
              .zoekterm,
          );
        }

        for (
          const [
            sleutel,
            parameter,
          ] of Object.entries(
            FILTERPARAMETERS,
          )
        ) {
          const waarde =
            aanvraagSleutel
              .kolomFilters[
                sleutel
              ]?.trim();

          if (waarde) {
            parameters.set(
              parameter,
              waarde,
            );
          }
        }

        const datumFilter =
          aanvraagSleutel
            .datumFilters
            .uitgereiktOp;

        if (
          datumFilter?.jaar
        ) {
          parameters.set(
            "uitgereiktJaar",
            datumFilter.jaar,
          );
        }

        if (
          datumFilter?.maand
        ) {
          parameters.set(
            "uitgereiktMaand",
            datumFilter.maand,
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
            `/api/procescertificaten/lijst?${parameters.toString()}`,
            {
              method: "GET",
              credentials:
                "include",
              cache: "no-store",
              signal,
              headers: {
                Accept:
                  "application/json",
              },
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
          ? (
              laatstePagina
                .volgendeCursor ??
              undefined
            )
          : undefined,
    });

  const rijen =
    useMemo(() => {
      const perId =
        new Map<
          number,
          CertificaatRij
        >();

      for (
        const pagina of
        query.data?.pages ?? []
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
        (aantal):
          aantal is number =>
            typeof aantal ===
            "number",
      ) ?? null;

  return {
    rijen,
    aantalTotaal,
    fout:
      query.error instanceof Error
        ? query.error.message
        : null,
    isEersteKeerLaden:
      ingeschakeld &&
      query.isPending,
    isVolgendePaginaLaden:
      ingeschakeld &&
      query.isFetchingNextPage,
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

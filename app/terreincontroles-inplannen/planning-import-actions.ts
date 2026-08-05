"use server";

import {
  bevestigTerreincontrolesUitExcel as basisBevestigTerreincontrolesUitExcel,
  leesTerreincontrolesUitExcel as basisLeesTerreincontrolesUitExcel,
  type TerreincontroleExcelRij as BasisTerreincontroleExcelRij,
  type TerreincontroleExcelState as BasisTerreincontroleExcelState,
} from "./import-actions";

import { unstable_cache } from "next/cache";

import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  controleerReserveringenVoorOpslaan,
  haalPlaatsbezoekBeschikbaarheidOp,
  voltooiPlaatsbezoekReserveringen,
} from "./reservering-actions";

export type PlanningStatus =
  | "GRIJS"
  | "ROOD"
  | "GEEL"
  | "GROEN";

export type TerreincontroleExcelRij =
  BasisTerreincontroleExcelRij & {
    aantalAttesten: number;
    terreincontroleTarget: number;
    aantalTerreincontroles: number;
    aantalTerreincontrolesNodig: number;
    laatsteTerreincontrole: string | null;
    planningStatus: PlanningStatus;
    planningStatusTekst: string;
    latitude: number | null;
    longitude: number | null;
    geocodeStatus:
      | "GEVONDEN"
      | "NIET_GEVONDEN"
      | "GEEN_ADRES";
    beschikbaarheid:
      | "BESCHIKBAAR"
      | "DOOR_MIJ"
      | "DOOR_ANDER"
      | "INGEPLAND";
    gereserveerdDoor: string | null;
    reserveringVerlooptOp: string | null;
    ingeplandDoor: string | null;
  };

export type TerreincontroleExcelState =
  Omit<BasisTerreincontroleExcelState, "rijen"> & {
    rijen?: TerreincontroleExcelRij[];
    standaardAuditeur?: string;
  };

export type TerreincontroleBevestigState = {
  succes?: boolean;
  message?: string;
  aantalOpgeslagen?: number;
  fouten?: string[];
};

const AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

function normaliseerNaam(waarde: string) {
  return waarde
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("nl-BE")
    .replace(/\s+/g, " ");
}

function bepaalAuditeur(gebruiker: {
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
  email: string;
}) {
  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const emailNaam =
    gebruiker.email.split("@")[0] ?? "";

  const herkenningswaarden = [
    gebruiker.naam ?? "",
    gebruiker.voornaam ?? "",
    volledigeNaam,
    emailNaam.replace(/[._-]+/g, " "),
  ]
    .map(normaliseerNaam)
    .filter(Boolean);

  const gevonden = AUDITEURS.find((auditeur) => {
    const normaleAuditeur =
      normaliseerNaam(auditeur);

    return herkenningswaarden.some(
      (waarde) =>
        waarde === normaleAuditeur ||
        normaleAuditeur.startsWith(
          `${waarde} `,
        ),
    );
  });

  return (
    gevonden ??
    volledigeNaam ??
    gebruiker.naam ??
    gebruiker.email
  );
}

type GeocodeResultaat = {
  latitude: number;
  longitude: number;
} | null;

const CAPAKEY_PATROON =
  /^\d{5}[A-Z]\d{4}\/\d{2}[A-Z]\d{3}$/i;

function haalCapakeyUitTekst(
  waarde: string,
): string | null {
  const gevonden =
    waarde
      .trim()
      .toUpperCase()
      .match(
        /\b(\d{5}[A-Z]\d{4}\/\d{2}[A-Z]\d{3})\b/i,
      );

  const capakey =
    gevonden?.[1]
      ?.toUpperCase() ?? "";

  return CAPAKEY_PATROON.test(
    capakey,
  )
    ? capakey
    : null;
}

const geocodeerAdresMetCache =
  unstable_cache(
    async (
      adres: string,
    ): Promise<GeocodeResultaat> => {
      const url = new URL(
        "https://geo.api.vlaanderen.be/geolocation/v4/Location",
      );

      url.searchParams.set(
        "q",
        adres,
      );

      url.searchParams.set(
        "type",
        "Housenumber",
      );

      const antwoord = await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json",
          },
          signal:
            AbortSignal.timeout(
              10000,
            ),
        },
      );

      if (!antwoord.ok) {
        throw new Error(
          `Geocodering gaf HTTP ${antwoord.status}.`,
        );
      }

      const gegevens:
        unknown =
        await antwoord.json();

      if (
        typeof gegevens !== "object" ||
        gegevens === null ||
        !(
          "LocationResult" in
          gegevens
        ) ||
        !Array.isArray(
          gegevens.LocationResult,
        )
      ) {
        return null;
      }

      const eerste =
        gegevens.LocationResult[0];

      if (
        typeof eerste !== "object" ||
        eerste === null ||
        !("Location" in eerste) ||
        typeof eerste.Location !==
          "object" ||
        eerste.Location === null
      ) {
        return null;
      }

      const locatie =
        eerste.Location as {
          Lat_WGS84?: unknown;
          Lon_WGS84?: unknown;
        };

      const latitude =
        Number(
          locatie.Lat_WGS84,
        );

      const longitude =
        Number(
          locatie.Lon_WGS84,
        );

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    },
    [
      "t11b-geocodering-digitaal-vlaanderen-v1",
    ],
    {
      revalidate:
        30 * 24 * 60 * 60,
    },
  );


const geocodeerCapakeyMetCache =
  unstable_cache(
    async (
      capakey: string,
    ): Promise<GeocodeResultaat> => {
      const genormaliseerd =
        haalCapakeyUitTekst(
          capakey,
        );

      if (!genormaliseerd) {
        return null;
      }

      const [
        eersteDeel,
        tweedeDeel,
      ] =
        genormaliseerd.split(
          "/",
        );

      if (
        !eersteDeel ||
        !tweedeDeel
      ) {
        return null;
      }

      /*
       * Probeer eerst de actuele perceeltoestand. Wanneer daar
       * geen geometrie beschikbaar is, proberen we de fiscale
       * toestand als fallback.
       */
      for (
        const status of [
          "actual",
          "fiscal",
        ] as const
      ) {
        const url = new URL(
          `https://geo.api.vlaanderen.be/capakey/v2/parcel/${encodeURIComponent(
            eersteDeel,
          )}/${encodeURIComponent(
            tweedeDeel,
          )}`,
        );

        url.searchParams.set(
          "geometry",
          "full",
        );

        url.searchParams.set(
          "srs",
          "4326",
        );

        url.searchParams.set(
          "status",
          status,
        );

        const antwoord =
          await fetch(
            url,
            {
              headers: {
                Accept:
                  "application/xml",
              },
              signal:
                AbortSignal.timeout(
                  10000,
                ),
            },
          );

        if (!antwoord.ok) {
          continue;
        }

        const xml =
          await antwoord.text();

        /*
         * De service levert het perceelcentrum als GML.
         * Bij EPSG:4326 is de volgorde latitude longitude.
         */
        const gevonden =
          xml.match(
            /<centerGml\b[\s\S]*?&lt;pos&gt;\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i,
          );

        if (!gevonden) {
          continue;
        }

        const latitude =
          Number(
            gevonden[1],
          );

        const longitude =
          Number(
            gevonden[2],
          );

        if (
          Number.isFinite(
            latitude,
          ) &&
          Number.isFinite(
            longitude,
          ) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        ) {
          return {
            latitude,
            longitude,
          };
        }
      }

      return null;
    },
    [
      "capakey-geocodering-digitaal-vlaanderen-v1",
    ],
    {
      revalidate:
        30 * 24 * 60 * 60,
    },
  );

function maakGeocodeAdres(
  rij: BasisTerreincontroleExcelRij,
) {
  const straatEnNummer = [
    rij.straat.trim(),
    rij.huisnummer.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const postcodeEnGemeente = [
    rij.postcode.trim(),
    rij.gemeente.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * Extra adresdetails zoals garagebox, verdieping of pandnummer
   * zijn nuttig voor de auditeur, maar maken een huisnummerzoekopdracht
   * bij Digitaal Vlaanderen vaak ongeldig. Geocodeer daarom uitsluitend
   * op straat, huisnummer, postcode en gemeente.
   */
  const samengesteld = [
    straatEnNummer,
    postcodeEnGemeente,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    samengesteld ||
    rij.capakey.trim() ||
    rij.inspectielocatie.trim()
  );
}

async function geocodeerInBatches(
  rijen: BasisTerreincontroleExcelRij[],
) {
  const resultaten = new Map<
    string,
    GeocodeResultaat
  >();

  const adressen = [
    ...new Set(
      rijen
        .map(maakGeocodeAdres)
        .filter(Boolean),
    ),
  ];

  const GELIJKTIJDIG = 5;

  for (
    let index = 0;
    index < adressen.length;
    index += GELIJKTIJDIG
  ) {
    const batch =
      adressen.slice(
        index,
        index + GELIJKTIJDIG,
      );

    const batchResultaten =
      await Promise.all(
        batch.map(
          async (adres) => {
            try {
              const capakey =
                haalCapakeyUitTekst(
                  adres,
                );

              const resultaat =
                capakey
                  ? await geocodeerCapakeyMetCache(
                      capakey,
                    )
                  : await geocodeerAdresMetCache(
                      adres,
                    );

              return [
                adres,
                resultaat,
              ] as const;
            } catch (fout) {
              console.error(
                `Geocodering mislukt voor "${adres}":`,
                fout,
              );

              return [
                adres,
                null,
              ] as const;
            }
          },
        ),
      );

    for (
      const [
        adres,
        resultaat,
      ] of batchResultaten
    ) {
      resultaten.set(
        adres,
        resultaat,
      );
    }
  }

  return resultaten;
}

function bepaalPlanningStatus({
  aantalAttesten,
  target,
  uitgevoerd,
  laatsteTerreincontrole,
}: {
  aantalAttesten: number;
  target: number;
  uitgevoerd: number;
  laatsteTerreincontrole: Date | null;
}): PlanningStatus {
  if (
    aantalAttesten <= 0 ||
    target <= 0
  ) {
    return "GRIJS";
  }

  if (laatsteTerreincontrole) {
    const grens = new Date();
    grens.setUTCHours(0, 0, 0, 0);
    grens.setUTCDate(
      grens.getUTCDate() - 14,
    );

    if (
      laatsteTerreincontrole.getTime() >=
      grens.getTime()
    ) {
      return "GEEL";
    }
  }

  if (uitgevoerd < target) {
    return "ROOD";
  }

  return "GROEN";
}

function planningStatusTekst({
  status,
  aantalAttesten,
  target,
  uitgevoerd,
  laatsteTerreincontrole,
}: {
  status: PlanningStatus;
  aantalAttesten: number;
  target: number;
  uitgevoerd: number;
  laatsteTerreincontrole: Date | null;
}) {
  const laatste = laatsteTerreincontrole
    ? new Intl.DateTimeFormat("nl-BE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(laatsteTerreincontrole)
    : "nooit";

  if (status === "GRIJS") {
    return "Geen attesten of geen gekoppeld persoonscertificaat.";
  }

  if (status === "GEEL") {
    return `Laatste terreincontrole: ${laatste}, minder dan 14 dagen geleden.`;
  }

  if (status === "ROOD") {
    return `${Math.max(
      0,
      target - uitgevoerd,
    )} terreincontrole(s) nog nodig.`;
  }

  return "Terreincontroletarget behaald.";
}

export async function leesTerreincontrolesUitExcel(
  vorigeStatus: TerreincontroleExcelState,
  formData: FormData,
): Promise<TerreincontroleExcelState> {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEHEREN",
    );

  const basisResultaat =
    await basisLeesTerreincontrolesUitExcel(
      vorigeStatus,
      formData,
    );

  const basisRijen =
    basisResultaat.rijen ?? [];

  const standaardAuditeur =
    bepaalAuditeur(gebruiker);

  if (basisRijen.length === 0) {
    return {
      ...basisResultaat,
      standaardAuditeur,
      rijen: [],
    };
  }

  const ovamIds = [
    ...new Set(
      basisRijen
        .map((rij) =>
          rij.ovamId.trim(),
        )
        .filter(Boolean),
    ),
  ];

  const [
    atteststatistieken,
    terreincontroletellingen,
  ] = await Promise.all([
    ovamIds.length === 0
      ? Promise.resolve([])
      : prisma.attestPersoonStatistiek.findMany({
          where: {
            persoonsId: {
              in: ovamIds,
            },
          },
          select: {
            persoonsId: true,
            aantalAttesten: true,
          },
        }),

    ovamIds.length === 0
      ? Promise.resolve([])
      : prisma.terreincontrole.groupBy({
          by: ["ovamId"],
          where: {
            verwijderdOp: null,
            ovamId: {
              in: ovamIds,
              mode: "insensitive",
            },
          },
          _count: {
            _all: true,
          },
          _max: {
            datumPlaatsbezoek:
              true,
          },
        }),
  ]);

  const attestenPerOvamId = new Map(
    atteststatistieken.map(
      (statistiek) => [
        normaliseerNaam(
          statistiek.persoonsId,
        ),
        statistiek.aantalAttesten,
      ],
    ),
  );

  const controlesPerOvamId =
    new Map(
      terreincontroletellingen
        .filter(
          (telling) =>
            Boolean(
              telling.ovamId,
            ),
        )
        .map(
          (telling) => [
            normaliseerNaam(
              telling.ovamId ?? "",
            ),
            {
              aantal:
                telling._count._all,
              laatste:
                telling._max
                  .datumPlaatsbezoek,
            },
          ],
        ),
    );

  const geocodeResultaten =
    await geocodeerInBatches(
      basisRijen,
    );

  const beschikbaarheden =
    await haalPlaatsbezoekBeschikbaarheidOp(
      basisRijen.map((rij) => rij.attestId),
    );

  const beschikbaarheidPerAttestId =
    new Map(
      beschikbaarheden.map(
        (beschikbaarheid) => [
          beschikbaarheid.attestId,
          beschikbaarheid,
        ],
      ),
    );

  const rijen: TerreincontroleExcelRij[] =
    basisRijen.map((basisRij) => {
      const ovamSleutel =
        normaliseerNaam(
          basisRij.ovamId,
        );

      const aantalAttesten =
        attestenPerOvamId.get(
          ovamSleutel,
        ) ?? 0;

      const terreincontroleTarget =
        aantalAttesten > 0
          ? Math.min(
              4,
              Math.ceil(
                aantalAttesten / 100,
              ),
            )
          : 0;

      const controlegegevens =
        controlesPerOvamId.get(
          ovamSleutel,
        );

      const aantalTerreincontroles =
        controlegegevens?.aantal ?? 0;

      const laatsteTerreincontrole =
        controlegegevens?.laatste ??
        null;

      const planningStatus =
        bepaalPlanningStatus({
          aantalAttesten,
          target:
            terreincontroleTarget,
          uitgevoerd:
            aantalTerreincontroles,
          laatsteTerreincontrole,
        });

      const geocodeAdres =
        maakGeocodeAdres(
          basisRij,
        );

      const geocodeResultaat =
        geocodeAdres
          ? geocodeResultaten.get(
              geocodeAdres,
            ) ?? null
          : null;

      return {
        ...basisRij,
        auditeur:
          standaardAuditeur,
        beschikbaarheid:
          beschikbaarheidPerAttestId.get(
            basisRij.attestId.trim().toLowerCase(),
          )?.beschikbaarheid ??
          "BESCHIKBAAR",
        gereserveerdDoor:
          beschikbaarheidPerAttestId.get(
            basisRij.attestId.trim().toLowerCase(),
          )?.gereserveerdDoor ??
          null,
        reserveringVerlooptOp:
          beschikbaarheidPerAttestId.get(
            basisRij.attestId.trim().toLowerCase(),
          )?.reserveringVerlooptOp ??
          null,
        ingeplandDoor:
          beschikbaarheidPerAttestId.get(
            basisRij.attestId.trim().toLowerCase(),
          )?.ingeplandDoor ??
          null,
        latitude:
          geocodeResultaat?.latitude ??
          null,
        longitude:
          geocodeResultaat?.longitude ??
          null,
        geocodeStatus:
          !geocodeAdres
            ? "GEEN_ADRES"
            : geocodeResultaat
              ? "GEVONDEN"
              : "NIET_GEVONDEN",
        aantalAttesten,
        terreincontroleTarget,
        aantalTerreincontroles,
        aantalTerreincontrolesNodig:
          Math.max(
            0,
            terreincontroleTarget -
              aantalTerreincontroles,
          ),
        laatsteTerreincontrole:
          laatsteTerreincontrole
            ?.toISOString() ?? null,
        planningStatus,
        planningStatusTekst:
          planningStatusTekst({
            status: planningStatus,
            aantalAttesten,
            target:
              terreincontroleTarget,
            uitgevoerd:
              aantalTerreincontroles,
            laatsteTerreincontrole,
          }),
      };
    });

  return {
    ...basisResultaat,
    standaardAuditeur,
    rijen,
  };
}

export async function bevestigTerreincontrolesUitExcel(
  vorigeStatus: TerreincontroleBevestigState,
  formData: FormData,
): Promise<TerreincontroleBevestigState> {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const ruweAttestIds =
    formData.get(
      "reserveringAttestIds",
    );

  if (
    typeof ruweAttestIds !==
    "string"
  ) {
    return {
      succes: false,
      message:
        "De reserveringsgegevens van de geselecteerde plaatsbezoeken ontbreken.",
    };
  }

  let attestIds: string[];

  try {
    const gelezen:
      unknown =
      JSON.parse(
        ruweAttestIds,
      );

    if (
      !Array.isArray(gelezen) ||
      !gelezen.every(
        (waarde) =>
          typeof waarde ===
          "string",
      )
    ) {
      throw new Error(
        "Ongeldige lijst met Attest-ID's.",
      );
    }

    attestIds =
      gelezen;
  } catch {
    return {
      succes: false,
      message:
        "De reserveringsgegevens konden niet worden gelezen.",
    };
  }

  if (
    attestIds.length === 0
  ) {
    return {
      succes: false,
      message:
        "Selecteer minstens één plaatsbezoek.",
    };
  }

  const reserveringscontrole =
    await controleerReserveringenVoorOpslaan(
      attestIds,
    );

  if (
    !reserveringscontrole.succes
  ) {
    return {
      succes: false,
      message:
        reserveringscontrole.message,
    };
  }

  /*
   * Alle bestaande formuliervelden blijven behouden.
   * De oorspronkelijke importactie blijft daardoor haar eigen
   * JSON-structuur en validaties gebruiken.
   */
  const resultaat =
    await basisBevestigTerreincontrolesUitExcel(
      vorigeStatus,
      formData,
    );

  if (resultaat.succes) {
    /*
     * Koppel de opgeslagen terreincontroles aan de ingelogde
     * gebruiker en verwijder daarna de tijdelijke reserveringen.
     */
    await voltooiPlaatsbezoekReserveringen(
      attestIds,
    );
  }

  return resultaat;
}

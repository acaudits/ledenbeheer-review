"use client";

import "leaflet/dist/leaflet.css";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  TerreincontroleExcelRij,
} from "../planning-import-actions";

type Props = {
  rijen: TerreincontroleExcelRij[];
  planningKleuren:
    readonly TerreincontroleExcelRij["planningStatus"][];
  onWijzigPlanningKleuren: (
    kleuren:
      TerreincontroleExcelRij["planningStatus"][],
  ) => void;
  actieveRijSleutel: string | null;
  focusVolgnummer: number;
  geselecteerdeRijSleutels:
    ReadonlySet<string>;
  selectieBezigSleutels:
    ReadonlySet<string>;
  onWijzigSelectie: (
    rij: TerreincontroleExcelRij,
  ) => void | Promise<void>;
};

type PersistenteKaartInstantie = {
  kaart: import("leaflet").Map;
  canvas: HTMLDivElement;
  markerInstanties: Map<
    string,
    import("leaflet").CircleMarker
  >;
};

let persistenteKaartInstantie:
  PersistenteKaartInstantie | null =
    null;

const KAART_PARKEERPLAATS_ID =
  "persistente-terreincontrole-kaart";

const KAART_PLANNING_KLEUREN:
  readonly TerreincontroleExcelRij["planningStatus"][] =
    [
      "ROOD",
      "GEEL",
      "GROEN",
      "GRIJS",
    ];

function haalKaartParkeerplaats() {
  const bestaande =
    document.getElementById(
      KAART_PARKEERPLAATS_ID,
    );

  if (
    bestaande instanceof
      HTMLDivElement
  ) {
    return bestaande;
  }

  const parkeerplaats =
    document.createElement("div");

  parkeerplaats.id =
    KAART_PARKEERPLAATS_ID;

  parkeerplaats.hidden = true;

  parkeerplaats.setAttribute(
    "aria-hidden",
    "true",
  );

  document.body.appendChild(
    parkeerplaats,
  );

  return parkeerplaats;
}

function pinKleur(
  status:
    TerreincontroleExcelRij["planningStatus"],
) {
  switch (status) {
    case "ROOD":
      return {
        lijn: "#b91c1c",
        vulling: "#ef4444",
      };

    case "GEEL":
      return {
        lijn: "#b45309",
        vulling: "#f59e0b",
      };

    case "GROEN":
      return {
        lijn: "#047857",
        vulling: "#10b981",
      };

    default:
      return {
        lijn: "#475569",
        vulling: "#94a3b8",
      };
  }
}

function formatteerDatum(
  waarde: string | null,
) {
  if (!waarde) {
    return "Nooit";
  }

  const datum = new Date(waarde);

  if (Number.isNaN(datum.getTime())) {
    return "Onbekend";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

function volledigAdres(
  rij: TerreincontroleExcelRij,
) {
  if (rij.inspectielocatie.trim()) {
    return rij.inspectielocatie.trim();
  }

  const straat = [
    rij.straat,
    rij.huisnummer,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const gemeente = [
    rij.postcode,
    rij.gemeente,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    straat,
    rij.extraAdresDetails,
    gemeente,
  ]
    .filter(Boolean)
    .join(", ");
}

function beschikbaarheidTekst(
  rij: TerreincontroleExcelRij,
) {
  switch (
    rij.beschikbaarheid
  ) {
    case "DOOR_MIJ":
      return "Door jou geselecteerd";

    case "DOOR_ANDER":
      return rij.gereserveerdDoor
        ? `Tijdelijk gereserveerd door ${rij.gereserveerdDoor}`
        : "Tijdelijk gereserveerd door een andere gebruiker";

    case "INGEPLAND":
      return `Reeds ingepland${rij.ingeplandDoor ? ` door ${rij.ingeplandDoor}` : ""}. Op adres ${rij.ingeplandAdres?.trim() || "onbekend"}.`;

    case "AFWEZIG":
      return `Bij afwezigen${rij.ingeplandDoor ? ` – ${rij.ingeplandDoor}` : ""}. Op adres ${rij.ingeplandAdres?.trim() || "onbekend"}.`;

    case "VERWIJDERD":
      return `Verwijderd${rij.ingeplandDoor ? ` – ${rij.ingeplandDoor}` : ""}. Op adres ${rij.ingeplandAdres?.trim() || "onbekend"}.`;

    default:
      return "Beschikbaar";
  }
}

function formatteerReserveringstijdstip(
  waarde: string | null,
) {
  if (!waarde) {
    return null;
  }

  const datum =
    new Date(waarde);

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone:
        "Europe/Brussels",
    },
  ).format(datum);
}

function googleMapsLink(
  rij: TerreincontroleExcelRij,
) {
  const adres = volledigAdres(rij);

  const isCapakey =
    /^\d{5}[A-Z]\d{4}\/\d{2}[A-Z]\d{3}$/i.test(
      adres.trim(),
    );

  const coordinaten =
    rij.latitude !== null &&
    rij.longitude !== null
      ? `${rij.latitude},${rij.longitude}`
      : "";

  if (isCapakey && coordinaten) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      coordinaten,
    )}`;
  }

  return (
    rij.googleMapsUrl.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      adres,
    )}`
  );
}


export default function PlaatsbezoekenKaart({
  rijen,
  planningKleuren,
  onWijzigPlanningKleuren,
  actieveRijSleutel,
  focusVolgnummer,
  geselecteerdeRijSleutels,
  selectieBezigSleutels,
  onWijzigSelectie,
}: Props) {
  const [
    geselecteerdeKaartRijSleutel,
    setGeselecteerdeKaartRijSleutel,
  ] = useState<string | null>(null);

  const kaartElement =
    useRef<HTMLDivElement | null>(null);

  const kaartInstantie =
    useRef<
      import("leaflet").Map | null
    >(null);

  const markerInstanties =
    useRef<
      Map<
        string,
        import("leaflet").CircleMarker
      >
    >(new Map());

  const bewaardeKaartWeergave =
    useRef<{
      latitude: number;
      longitude: number;
      zoom: number;
    } | null>(null);

  const invalidateTimer =
    useRef<number | null>(null);

  const geldigeRijen =
    useMemo(
      () =>
        rijen.filter(
          (rij) =>
            typeof rij.latitude ===
              "number" &&
            typeof rij.longitude ===
              "number" &&
            Number.isFinite(
              rij.latitude,
            ) &&
            Number.isFinite(
              rij.longitude,
            ),
        ),
      [rijen],
    );

  useEffect(() => {
    let geannuleerd = false;

    async function tekenKaart() {
      const kaartHost =
        kaartElement.current;

      if (!kaartHost) {
        return;
      }

      const L = await import("leaflet");

      if (geannuleerd) {
        return;
      }

      let kaart:
        import("leaflet").Map;

      if (
        persistenteKaartInstantie
      ) {
        kaart =
          persistenteKaartInstantie.kaart;

        const huidigCentrum =
          kaart.getCenter();

        bewaardeKaartWeergave.current = {
          latitude:
            huidigCentrum.lat,
          longitude:
            huidigCentrum.lng,
          zoom:
            kaart.getZoom(),
        };

        kaartHost.replaceChildren(
          persistenteKaartInstantie.canvas,
        );
      } else {
        const canvas =
          document.createElement(
            "div",
          );

        canvas.className =
          "h-full w-full";

        canvas.setAttribute(
          "aria-label",
          "Interactieve kaart met plaatsbezoeken",
        );

        kaartHost.replaceChildren(
          canvas,
        );

        kaart = L.map(canvas, {
          center: [50.8503, 4.3517],
          zoom: 8,
          preferCanvas: false,
          scrollWheelZoom: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-bijdragers</a>',
          },
        ).addTo(kaart);

        persistenteKaartInstantie = {
          kaart,
          canvas,
          markerInstanties:
            new Map(),
        };
      }

      kaartInstantie.current =
        kaart;

      if (
        !persistenteKaartInstantie
      ) {
        return;
      }

      markerInstanties.current =
        persistenteKaartInstantie
          .markerInstanties;

      /*
       * De kaart en tileLayer blijven bestaan. Alleen de markers
       * worden opnieuw opgebouwd omdat filters, beschikbaarheid,
       * selectie en callbackfuncties kunnen zijn gewijzigd.
       */
      for (
        const marker of
        markerInstanties.current.values()
      ) {
        marker.remove();
      }

      markerInstanties.current.clear();

      const grenzen:
        import("leaflet").LatLngExpression[] =
        [];

      for (const rij of geldigeRijen) {
        if (
          rij.latitude === null ||
          rij.longitude === null
        ) {
          continue;
        }

        const positie:
          import("leaflet").LatLngExpression =
          [
            rij.latitude,
            rij.longitude,
          ];

        grenzen.push(positie);

        const kleuren =
          pinKleur(
            rij.planningStatus,
          );

        const marker =
        L.circleMarker(positie, {
          radius: 4.5,
          color: kleuren.lijn,
          weight: 2,
          fillColor:
            kleuren.vulling,
          fillOpacity: 0.9,
        })
          .on("click", () => {
            setGeselecteerdeKaartRijSleutel(
              rij.sleutel,
            );
          })
          .addTo(kaart);

        markerInstanties.current.set(
          rij.sleutel,
          marker,
        );

        const moetRuitZijn =
          rij.sleutel ===
            actieveRijSleutel ||
          geselecteerdeRijSleutels.has(
            rij.sleutel,
          );

        if (moetRuitZijn) {
          marker.setRadius(8);
          marker.setStyle({
            weight: 3,
            fillOpacity: 1,
          });

          const markerElement =
            marker.getElement();

          if (
            markerElement instanceof
              SVGElement
          ) {
            markerElement.style.clipPath =
              "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

            markerElement.style.filter =
              "drop-shadow(0 2px 3px rgba(15, 23, 42, 0.45))";
          }
        }
      }

      if (grenzen.length === 1) {
        kaart.setView(
          grenzen[0],
          15,
        );
      } else if (
        grenzen.length > 1
      ) {
      const bewaardeWeergave =
        bewaardeKaartWeergave.current;

      if (bewaardeWeergave) {
        kaart.setView(
          [
            bewaardeWeergave.latitude,
            bewaardeWeergave.longitude,
          ],
          bewaardeWeergave.zoom,
          {
            animate: false,
          },
        );
      } else {
          kaart.fitBounds(
            L.latLngBounds(grenzen),
            {
              padding: [30, 30],
              maxZoom: 16,
            },
          );
      }
      }

      if (invalidateTimer.current !== null) {
        window.clearTimeout(
          invalidateTimer.current,
        );
      }

      invalidateTimer.current =
        window.setTimeout(() => {
          window.requestAnimationFrame(
            () => {
              if (
                !geannuleerd &&
                kaartInstantie.current ===
                  kaart
              ) {
                kaart.invalidateSize({
                  animate: false,
                });
              }
            },
          );

          invalidateTimer.current =
            null;
        }, 0);
    }

    void tekenKaart();

    return () => {
      geannuleerd = true;

      if (invalidateTimer.current !== null) {
        window.clearTimeout(
          invalidateTimer.current,
        );

        invalidateTimer.current =
          null;
      }

      const persistenteKaart =
        persistenteKaartInstantie;

      if (
        persistenteKaart &&
        kaartInstantie.current ===
          persistenteKaart.kaart
      ) {
        const huidigeCentrum =
          persistenteKaart.kaart
            .getCenter();

        bewaardeKaartWeergave.current = {
          latitude:
            huidigeCentrum.lat,
          longitude:
            huidigeCentrum.lng,
          zoom:
            persistenteKaart.kaart
              .getZoom(),
        };

        /*
         * Verplaats uitsluitend het imperatief aangemaakte canvas.
         * De Leaflet-instance, tileLayer, zoom en kaartpositie blijven
         * daardoor actief tijdens interne Next.js-navigatie.
         */
        haalKaartParkeerplaats()
          .appendChild(
            persistenteKaart.canvas,
          );

        kaartInstantie.current =
          null;
      }
    };
  }, [geldigeRijen]);

  useEffect(() => {
    const ruitSleutels =
      new Set<string>(
        geselecteerdeRijSleutels,
      );

    if (actieveRijSleutel) {
      ruitSleutels.add(
        actieveRijSleutel,
      );
    }

    if (geselecteerdeKaartRijSleutel) {
      ruitSleutels.add(
        geselecteerdeKaartRijSleutel,
      );
    }

    if (
      actieveRijSleutel &&
      focusVolgnummer > 0
    ) {
      kaartElement.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    let geannuleerd = false;
    let poging = 0;

    let focusTimer:
      number | null = null;

    const pasRuitenToe = () => {
      if (geannuleerd) {
        return;
      }

      const kaartInstantieNu =
        kaartInstantie.current;

      const ontbrekenMarkers =
        [...ruitSleutels].some(
          (sleutel) =>
            !markerInstanties.current.has(
              sleutel,
            ),
        );

      if (
        kaartInstantieNu &&
        !ontbrekenMarkers
      ) {
        for (
          const [
            sleutel,
            marker,
          ] of markerInstanties.current
        ) {
          const isRuit =
            ruitSleutels.has(
              sleutel,
            );

          marker.setRadius(
            isRuit
              ? 8
              : 4.5,
          );

          marker.setStyle({
            weight: isRuit
              ? 3
              : 2,
            fillOpacity: isRuit
              ? 1
              : 0.9,
          });

          const markerElement =
            marker.getElement();

          if (
            markerElement instanceof
              SVGElement
          ) {
            markerElement.style.clipPath =
              isRuit
                ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                : "";

            markerElement.style.filter =
              isRuit
                ? "drop-shadow(0 2px 3px rgba(15, 23, 42, 0.45))"
                : "";
          }
        }

        return;
      }

      poging += 1;

      if (poging < 30) {
        focusTimer =
          window.setTimeout(
            pasRuitenToe,
            100,
          );
      }
    };

    pasRuitenToe();

    return () => {
      geannuleerd = true;

      if (focusTimer !== null) {
        window.clearTimeout(
          focusTimer,
        );
      }
    };
  }, [
    actieveRijSleutel,
    focusVolgnummer,
    geselecteerdeKaartRijSleutel,
    geselecteerdeRijSleutels,
  ]);

  const detailRij = useMemo(() => {
    if (geselecteerdeKaartRijSleutel) {
      const geselecteerdeRij =
        rijen.find(
          (rij) =>
            rij.sleutel ===
            geselecteerdeKaartRijSleutel,
        );

      if (geselecteerdeRij) {
        return geselecteerdeRij;
      }
    }

    if (actieveRijSleutel) {
      return (
        rijen.find(
          (rij) =>
            rij.sleutel ===
            actieveRijSleutel,
        ) ?? null
      );
    }

    return null;
  }, [
    actieveRijSleutel,
    geselecteerdeKaartRijSleutel,
    rijen,
  ]);

  const nietGevonden =
    rijen.length -
    geldigeRijen.length;

  const alleKleurenGeselecteerd =
    KAART_PLANNING_KLEUREN.every(
      (kleur) =>
        planningKleuren.includes(
          kleur,
        ),
    );

  return (
    <section className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-950">
            Kaart plaatsbezoeken
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            De kaart gebruikt hetzelfde zoek- en
            kleurenfilter als de tabel.
          </p>
        </div>

        <div
          className="flex flex-wrap justify-end gap-2 text-xs font-bold"
          aria-label="Filter plaatsbezoeken op kleur"
        >
          <button
            type="button"
            aria-pressed={
              alleKleurenGeselecteerd
            }
            onClick={() =>
              onWijzigPlanningKleuren(
                alleKleurenGeselecteerd
                  ? []
                  : [
                      ...KAART_PLANNING_KLEUREN,
                    ],
              )
            }
            className={`rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-800 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              alleKleurenGeselecteerd
                ? "ring-2 ring-indigo-500 ring-offset-1"
                : "opacity-55"
            }`}
          >
            Alle kleuren
          </button>

          {[
            {
              kleur: "ROOD" as const,
              label: "Controle nodig",
              stijl:
                "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 focus:ring-red-500",
              actieveStijl:
                "ring-red-500",
            },
            {
              kleur: "GEEL" as const,
              label: "2 weken",
              stijl:
                "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 focus:ring-amber-500",
              actieveStijl:
                "ring-amber-500",
            },
            {
              kleur: "GROEN" as const,
              label: "Ok",
              stijl:
                "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:ring-emerald-500",
              actieveStijl:
                "ring-emerald-500",
            },
            {
              kleur: "GRIJS" as const,
              label: "Geen data",
              stijl:
                "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500",
              actieveStijl:
                "ring-slate-500",
            },
          ].map(
            ({
              kleur,
              label,
              stijl,
              actieveStijl,
            }) => {
              const geselecteerd =
                planningKleuren.includes(
                  kleur,
                );

              return (
                <button
                  key={kleur}
                  type="button"
                  aria-pressed={
                    geselecteerd
                  }
                  onClick={() =>
                    onWijzigPlanningKleuren(
                      geselecteerd
                        ? planningKleuren.filter(
                            (
                              huidigeKleur,
                            ) =>
                              huidigeKleur !==
                              kleur,
                          )
                        : [
                            ...planningKleuren,
                            kleur,
                          ],
                    )
                  }
                  className={`rounded-full border px-3 py-1 transition focus:outline-none focus:ring-2 ${stijl} ${
                    geselecteerd
                      ? `ring-2 ${actieveStijl} ring-offset-1`
                      : "opacity-45"
                  }`}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm">
        <div
          ref={kaartElement}
          className="h-[520px] w-full"
          aria-label="Kaart met plaatsbezoeken"
        />

        {detailRij ? (
          <aside
            aria-label="Details van het geselecteerde plaatsbezoek"
            className="absolute inset-y-0 right-0 z-[600] flex w-[320px] max-w-[90%] flex-col border-l border-slate-300 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Plaatsbezoek
                </p>

                <h4 className="truncate text-sm font-bold text-slate-950">
                  {detailRij.naamAdi.trim() ||
                    detailRij.ovamId.trim() ||
                    "Onbekende persoon"}
                </h4>

                <p className="mt-0.5 text-xs font-semibold text-slate-600">
                  {detailRij.datumPlaatsbezoek
                    ? formatteerDatum(
                        detailRij.datumPlaatsbezoek,
                      )
                    : "Datum onbekend"}{" "}
                  om{" "}
                  {detailRij.uurPlaatsbezoek.trim() ||
                    "uur onbekend"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setGeselecteerdeKaartRijSleutel(
                    null,
                  )
                }
                aria-label="Detailpaneel sluiten"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <a
                href={googleMapsLink(
                  detailRij,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
              >
                Openen in Google Maps ↗
              </a>

              <dl className="mt-3 grid grid-cols-[100px_minmax(0,1fr)] gap-x-2 gap-y-2 text-xs">
                <dt className="font-bold text-slate-500">
                  Adres
                </dt>
                <dd className="break-words font-semibold text-slate-900">
                  {volledigAdres(
                    detailRij,
                  ) || "Onbekend"}
                </dd>

                <dt className="font-bold text-slate-500">
                  OVAM-ID
                </dt>
                <dd className="break-words font-semibold text-slate-900">
                  {detailRij.ovamId ||
                    "Onbekend"}
                </dd>

                <dt className="font-bold text-slate-500">
                  Attesten
                </dt>
                <dd className="font-semibold text-slate-900">
                  {detailRij.aantalAttesten}
                </dd>

                <dt className="font-bold text-slate-500">
                  Controles
                </dt>
                <dd className="font-semibold text-slate-900">
                  {
                    detailRij.aantalTerreincontroles
                  }
                  /
                  {
                    detailRij.terreincontroleTarget
                  }
                </dd>

                <dt className="font-bold text-slate-500">
                  Nog nodig
                </dt>
                <dd className="font-semibold text-slate-900">
                  {
                    detailRij.aantalTerreincontrolesNodig
                  }
                </dd>

                <dt className="font-bold text-slate-500">
                  Laatste
                </dt>
                <dd className="font-semibold text-slate-900">
                  {formatteerDatum(
                    detailRij.laatsteTerreincontrole,
                  )}
                </dd>

                <dt className="font-bold text-slate-500">
                  Planning
                </dt>
                <dd className="font-semibold text-slate-900">
                  {
                    detailRij.planningStatusTekst
                  }
                </dd>
              </dl>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Beschikbaarheid
                </p>

                <p
                  className={`mt-1 text-xs font-bold ${
                    detailRij.beschikbaarheid ===
                    "BESCHIKBAAR"
                      ? "text-emerald-700"
                      : detailRij.beschikbaarheid ===
                          "DOOR_MIJ"
                        ? "text-blue-700"
                        : "text-amber-800"
                  }`}
                >
                  {beschikbaarheidTekst(
                    detailRij,
                  )}
                </p>

                {formatteerReserveringstijdstip(
                  detailRij.reserveringVerlooptOp,
                ) ? (
                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                    Reservering verloopt op{" "}
                    {formatteerReserveringstijdstip(
                      detailRij.reserveringVerlooptOp,
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            <footer className="border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={() => {
                  void Promise.resolve(
                    onWijzigSelectie(
                      detailRij,
                    ),
                  );
                }}
                disabled={
                  selectieBezigSleutels.has(
                    detailRij.sleutel,
                  ) ||
                  (detailRij.beschikbaarheid !==
                    "BESCHIKBAAR" &&
                    detailRij.beschikbaarheid !==
                      "DOOR_MIJ")
                }
                className={`inline-flex h-9 w-full items-center justify-center rounded-lg px-3 text-xs font-bold transition ${
                  selectieBezigSleutels.has(
                    detailRij.sleutel,
                  )
                    ? "cursor-wait bg-slate-300 text-slate-600"
                    : detailRij.beschikbaarheid ===
                        "DOOR_MIJ"
                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : detailRij.beschikbaarheid ===
                          "BESCHIKBAAR"
                        ? "bg-emerald-700 text-white hover:bg-emerald-600"
                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                }`}
              >
                {selectieBezigSleutels.has(
                  detailRij.sleutel,
                )
                  ? "Even geduld..."
                  : detailRij.beschikbaarheid ===
                      "DOOR_MIJ"
                    ? "Selectie vrijgeven"
                    : detailRij.beschikbaarheid ===
                        "BESCHIKBAAR"
                      ? "Selecteren"
                      : detailRij.beschikbaarheid ===
                          "INGEPLAND"
                        ? "Reeds ingepland"
                        : detailRij.beschikbaarheid ===
                            "AFWEZIG"
                          ? "Bij afwezigen"
                          : detailRij.beschikbaarheid ===
                              "VERWIJDERD"
                            ? "Verwijderd"
                            : "Niet beschikbaar"}
              </button>
            </footer>
          </aside>
        ) : null}

        {geldigeRijen.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-white/75 p-6 backdrop-blur-[1px]">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="font-bold text-slate-900">
                Geen adressen op de kaart
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Er zijn binnen het huidige filter geen
                plaatsbezoeken met geldige coördinaten.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-medium text-slate-500">
        <p>
          {geldigeRijen.length} van{" "}
          {rijen.length} zichtbare adressen op de kaart.
        </p>

        {nietGevonden > 0 ? (
          <p className="text-amber-700">
            {nietGevonden} adres(sen) konden niet
            automatisch worden gevonden.
          </p>
        ) : null}
      </div>
    </section>
  );
}

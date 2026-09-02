"use client";

import "leaflet/dist/leaflet.css";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type LaattijdigKaartbezoek = {
  id: number;
  status: "GROEN" | "ROOD";
  knippert: boolean;
  naamAdi: string;
  bedrijfsnaam: string;
  inspectielocatie: string;
  datum: string;
  tijdstip: string;
  latitude: number;
  longitude: number;
};

function googleMapsUrl(
  rij: LaattijdigKaartbezoek,
) {
  const zoekwaarde =
    Number.isFinite(rij.latitude) &&
    Number.isFinite(rij.longitude)
      ? `${rij.latitude},${rij.longitude}`
      : rij.inspectielocatie;

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      zoekwaarde,
    )
  );
}

function maakPopup(
  rij: LaattijdigKaartbezoek,
) {
  const container =
    document.createElement("div");

  container.className =
    "min-w-[220px] space-y-1 text-sm";

  const titel =
    document.createElement("p");

  titel.className =
    "font-bold text-slate-950";

  titel.textContent =
    rij.naamAdi ||
    "Onbekende ADI";

  container.appendChild(titel);

  if (rij.bedrijfsnaam) {
    const bedrijf =
      document.createElement("p");

    bedrijf.className =
      "text-slate-600";

    bedrijf.textContent =
      rij.bedrijfsnaam;

    container.appendChild(
      bedrijf,
    );
  }

  const afspraak =
    document.createElement("p");

  afspraak.className =
    "mt-2 font-bold text-slate-800";

  afspraak.textContent =
    `${rij.datum} om ${rij.tijdstip}`;

  container.appendChild(
    afspraak,
  );

  const adres =
    document.createElement("p");

  adres.className =
    "text-slate-700";

  adres.textContent =
    rij.inspectielocatie;

  container.appendChild(adres);

  const status =
    document.createElement("p");

  status.className =
    rij.status === "GROEN"
      ? "mt-2 font-bold text-emerald-700"
      : "mt-2 font-bold text-red-700";

  status.textContent =
    rij.status === "GROEN"
      ? "Geen dringende terreincontrole nodig"
      : "Terreincontrole nodig: laatste controle ouder dan 14 dagen of nooit uitgevoerd";

  container.appendChild(status);

  const link =
    document.createElement("a");

  link.href = googleMapsUrl(rij);
  link.target = "_blank";
  link.rel =
    "noopener noreferrer";

  link.className =
    "mt-2 inline-block font-bold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900";

  link.textContent =
    "Openen in Google Maps";

  container.appendChild(link);

  return container;
}

function tekenMarkers(
  L: typeof import("leaflet"),
  groep: import("leaflet").LayerGroup,
  rijen: LaattijdigKaartbezoek[],
) {
  groep.clearLayers();

  for (const rij of rijen) {
    const positie:
      import("leaflet").LatLngExpression =
      [
        rij.latitude,
        rij.longitude,
      ];

    const kleuren =
      rij.status === "GROEN"
        ? {
            lijn: "#047857",
            vulling: "#10b981",
          }
        : {
            lijn: "#b91c1c",
            vulling: "#ef4444",
          };

    L.circleMarker(
      positie,
      {
        radius: 5,
        color: kleuren.lijn,
        weight: 2,
        fillColor:
          kleuren.vulling,
        fillOpacity: 0.9,
        className:
          rij.knippert
            ? "plaatsbezoek-kaartmarker-knipper"
            : "",
      },
    )
      .bindPopup(
        maakPopup(rij),
        {
          maxWidth: 340,
        },
      )
      .addTo(groep);
  }
}

function maakMarkerSleutel(
  rijen: LaattijdigKaartbezoek[],
) {
  return rijen
    .map(
      (rij) =>
        [
          rij.id,
          rij.status,
          rij.knippert
            ? "1"
            : "0",
          rij.latitude,
          rij.longitude,
          rij.naamAdi,
          rij.bedrijfsnaam,
          rij.inspectielocatie,
          rij.datum,
          rij.tijdstip,
        ].join("|"),
    )
    .join(";");
}

export function LaattijdigePlaatsbezoekenKaart({
  rijen,
}: {
  rijen:
    LaattijdigKaartbezoek[];
}) {
  const kaartElement =
    useRef<HTMLDivElement | null>(
      null,
    );

  const kaartInstantie =
    useRef<
      import("leaflet").Map | null
    >(null);

  const [
    kaartKleuren,
    setKaartKleuren,
  ] = useState<
    Array<"ROOD" | "GROEN">
  >([
    "ROOD",
    "GROEN",
  ]);

  const alleGeldigeRijen =
    useMemo(
      () =>
        rijen.filter(
          (rij) =>
            Number.isFinite(
              rij.latitude,
            ) &&
            Number.isFinite(
              rij.longitude,
            ),
        ),
      [rijen],
    );

  const geldigeRijen =
    useMemo(
      () =>
        alleGeldigeRijen.filter(
          (rij) =>
            kaartKleuren.includes(
              rij.status,
            ),
        ),
      [
        alleGeldigeRijen,
        kaartKleuren,
      ],
    );

  const leafletInstantie =
    useRef<
      typeof import("leaflet") | null
    >(null);

  const markerGroep =
    useRef<
      import("leaflet").LayerGroup | null
    >(null);

  const laatsteRijen =
    useRef(geldigeRijen);

  const laatsteMarkerSleutel =
    useRef("");

  /*
   * De kaart wordt maar één keer aangemaakt.
   * fitBounds wordt uitsluitend bij de eerste
   * initialisatie uitgevoerd, zodat heel
   * Vlaanderen zichtbaar is.
   */
  useEffect(() => {
    let geannuleerd = false;

    async function initialiseerKaart() {
      const element =
        kaartElement.current;

      if (
        !element ||
        kaartInstantie.current
      ) {
        return;
      }

      const L =
        await import("leaflet");

      if (
        geannuleerd ||
        !kaartElement.current
      ) {
        return;
      }

      const kaart = L.map(
        kaartElement.current,
        {
          center: [
            50.8503,
            4.3517,
          ],
          zoom: 8,
          preferCanvas: false,
          scrollWheelZoom:
            false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation:
            false,
        },
      );

      leafletInstantie.current =
        L;

      kaartInstantie.current =
        kaart;

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-bijdragers</a>',
        },
      ).addTo(kaart);

      const groep =
        L.layerGroup().addTo(
          kaart,
        );

      markerGroep.current =
        groep;

      tekenMarkers(
        L,
        groep,
        laatsteRijen.current,
      );

      laatsteMarkerSleutel.current =
        maakMarkerSleutel(
          laatsteRijen.current,
        );

      /*
       * Grenzen van Vlaanderen. Dit wordt
       * bewust maar één keer uitgevoerd.
       */
      kaart.fitBounds(
        L.latLngBounds(
          [
            [50.67, 2.50],
            [51.51, 5.94],
          ],
        ),
        {
          padding: [20, 20],
          animate: false,
        },
      );

      window.setTimeout(() => {
        if (
          !geannuleerd &&
          kaartInstantie.current ===
            kaart
        ) {
          kaart.invalidateSize({
            animate: false,
          });
        }
      }, 0);
    }

    void initialiseerKaart();

    return () => {
      geannuleerd = true;

      markerGroep.current =
        null;

      laatsteMarkerSleutel.current =
        "";

      leafletInstantie.current =
        null;

      if (kaartInstantie.current) {
        kaartInstantie.current
          .stop();

        kaartInstantie.current
          .off();

        kaartInstantie.current
          .remove();

        kaartInstantie.current =
          null;
      }
    };
  }, []);

  /*
   * Alleen de markers worden bijgewerkt.
   * Het middelpunt en zoomniveau van de
   * kaart worden hierbij nooit gewijzigd.
   */
  useEffect(() => {
    laatsteRijen.current =
      geldigeRijen;

    const L =
      leafletInstantie.current;

    const groep =
      markerGroep.current;

    if (!L || !groep) {
      return;
    }

    const nieuweMarkerSleutel =
      maakMarkerSleutel(
        geldigeRijen,
      );

    if (
      nieuweMarkerSleutel ===
      laatsteMarkerSleutel.current
    ) {
      return;
    }

    tekenMarkers(
      L,
      groep,
      geldigeRijen,
    );

    laatsteMarkerSleutel.current =
      nieuweMarkerSleutel;
  }, [geldigeRijen]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Actieve plaatsbezoeken
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Groene en rode
            plaatsbezoeken met een
            geldige locatie.
          </p>
        </div>

        <div
          className="flex flex-wrap justify-end gap-2 text-xs font-bold"
          aria-label="Filter plaatsbezoeken op terreincontrole"
        >
          {[
            {
              kleur:
                "ROOD" as const,
              label:
                "Terreincontrole nodig",
              stijl:
                "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 focus:ring-red-500",
              actieveStijl:
                "ring-red-500",
            },
            {
              kleur:
                "GROEN" as const,
              label:
                "Geen dringende terreincontrole",
              stijl:
                "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus:ring-emerald-500",
              actieveStijl:
                "ring-emerald-500",
            },
          ].map(
            ({
              kleur,
              label,
              stijl,
              actieveStijl,
            }) => {
              const geselecteerd =
                kaartKleuren.includes(
                  kleur,
                );

              return (
                <button
                  key={kleur}
                  type="button"
                  aria-pressed={
                    geselecteerd
                  }
                  onClick={() => {
                    setKaartKleuren(
                      (huidige) =>
                        geselecteerd
                          ? huidige.filter(
                              (
                                huidigeKleur,
                              ) =>
                                huidigeKleur !==
                                kleur,
                            )
                          : [
                              ...huidige,
                              kleur,
                            ],
                    );
                  }}
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

      <div className="relative mt-4">
        <div
          ref={kaartElement}
          className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100"
          aria-label="Kaart met actieve laattijdige plaatsbezoeken"
        />

        {geldigeRijen.length ===
        0 ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-xl border border-slate-300 bg-white/95 px-4 py-2 text-center text-sm font-semibold text-slate-600 shadow">
            Er zijn momenteel geen
            rode of groene
            plaatsbezoeken met geldige
            coördinaten.
          </div>
        ) : null}
      </div>
    </section>
  );
}

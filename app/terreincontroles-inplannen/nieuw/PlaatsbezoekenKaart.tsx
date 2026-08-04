"use client";

import "leaflet/dist/leaflet.css";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  TerreincontroleExcelRij,
} from "../planning-import-actions";

type Props = {
  rijen: TerreincontroleExcelRij[];
};

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

function maakPopup(
  rij: TerreincontroleExcelRij,
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
    rij.naamAdi.trim() ||
    rij.ovamId.trim() ||
    "Onbekende persoon";

  container.appendChild(titel);

  const afspraak =
    document.createElement("p");

  afspraak.className =
    "mt-1 text-sm font-bold text-slate-800";

  const datumPlaatsbezoek =
    rij.datumPlaatsbezoek
      ? formatteerDatum(
          rij.datumPlaatsbezoek,
        )
      : "Datum onbekend";

  const uurPlaatsbezoek =
    rij.uurPlaatsbezoek.trim()
      ? rij.uurPlaatsbezoek.trim()
      : "uur onbekend";

  afspraak.textContent =
    `${datumPlaatsbezoek} om ${uurPlaatsbezoek}`;

  container.appendChild(
    afspraak,
  );

  const mapsLink =
    document.createElement("a");

  const adres =
    volledigAdres(rij);

  const isCapakey =
    /^\d{5}[A-Z]\d{4}\/\d{2}[A-Z]\d{3}$/i.test(
      adres.trim(),
    );

  const coordinaten =
    rij.latitude !== null &&
    rij.longitude !== null
      ? `${rij.latitude},${rij.longitude}`
      : "";

  mapsLink.href =
    isCapakey &&
    coordinaten
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          coordinaten,
        )}`
      : rij.googleMapsUrl.trim() ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          adres,
        )}`;

  mapsLink.target = "_blank";
  mapsLink.rel =
    "noopener noreferrer";

  mapsLink.className =
    "inline-block text-sm font-bold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900";

  mapsLink.textContent =
    "Openen in Google Maps";

  container.appendChild(
    mapsLink,
  );

  const gegevens = [
    [
      "Adres",
      volledigAdres(rij) || "Onbekend",
    ],
    [
      "OVAM-ID",
      rij.ovamId || "Onbekend",
    ],
    [
      "Attesten",
      String(rij.aantalAttesten),
    ],
    [
      "Terreincontroles",
      `${rij.aantalTerreincontroles}/${rij.terreincontroleTarget}`,
    ],
    [
      "Nog nodig",
      String(
        rij.aantalTerreincontrolesNodig,
      ),
    ],
    [
      "Laatste controle",
      formatteerDatum(
        rij.laatsteTerreincontrole,
      ),
    ],
  ];

  for (const [label, waarde] of gegevens) {
    const regel =
      document.createElement("p");

    const vet =
      document.createElement("strong");

    vet.textContent = `${label}: `;

    regel.appendChild(vet);
    regel.appendChild(
      document.createTextNode(waarde),
    );

    container.appendChild(regel);
  }

  const status =
    document.createElement("p");

  status.className =
    "mt-2 border-t border-slate-200 pt-2 text-xs font-semibold text-slate-600";

  status.textContent =
    rij.planningStatusTekst;

  container.appendChild(status);

  return container;
}

export default function PlaatsbezoekenKaart({
  rijen,
}: Props) {
  const kaartElement =
    useRef<HTMLDivElement | null>(null);

  const kaartInstantie =
    useRef<
      import("leaflet").Map | null
    >(null);

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
      const element =
        kaartElement.current;

      if (!element) {
        return;
      }

      const L = await import("leaflet");

      if (geannuleerd) {
        return;
      }

      if (kaartInstantie.current) {
        kaartInstantie.current.stop();
        kaartInstantie.current.off();
        kaartInstantie.current.remove();
        kaartInstantie.current = null;
      }

      element.replaceChildren();

      const kaart = L.map(element, {
        center: [50.8503, 4.3517],
        zoom: 8,
        preferCanvas: true,
        scrollWheelZoom: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });

      kaartInstantie.current = kaart;

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-bijdragers</a>',
        },
      ).addTo(kaart);

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

        L.circleMarker(positie, {
          radius: 9,
          color: kleuren.lijn,
          weight: 2,
          fillColor:
            kleuren.vulling,
          fillOpacity: 0.9,
        })
          .bindPopup(
            maakPopup(rij),
            {
              maxWidth: 340,
            },
          )
          .addTo(kaart);
      }

      if (grenzen.length === 1) {
        kaart.setView(
          grenzen[0],
          15,
        );
      } else if (
        grenzen.length > 1
      ) {
        kaart.fitBounds(
          L.latLngBounds(grenzen),
          {
            padding: [30, 30],
            maxZoom: 16,
          },
        );
      }

      if (invalidateTimer.current !== null) {
        window.clearTimeout(
          invalidateTimer.current,
        );
      }

      invalidateTimer.current =
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

      if (kaartInstantie.current) {
        kaartInstantie.current.stop();
        kaartInstantie.current.off();
        kaartInstantie.current.remove();
        kaartInstantie.current = null;
      }
    };
  }, [geldigeRijen]);

  const nietGevonden =
    rijen.length -
    geldigeRijen.length;

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

        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-800">
            Rood
          </span>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-900">
            Geel
          </span>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
            Groen
          </span>

          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
            Grijs
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-sm">
        <div
          ref={kaartElement}
          className="h-[520px] w-full"
          aria-label="Kaart met plaatsbezoeken"
        />

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

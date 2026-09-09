"use client";

import "leaflet/dist/leaflet.css";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PlanningStatus =
  | "GRIJS"
  | "ROOD"
  | "GEEL"
  | "PAARS"
  | "GROEN";

type FilterStatus =
  | PlanningStatus
  | "BRUIN";

export type LaattijdigKaartbezoek = {
  id: number;
  status: PlanningStatus;
  heeftOpenOpvolging?: boolean;
  aantalAttesten?: number;
  terreincontroleTarget?: number;
  aantalTerreincontroles?: number;
  aantalNaFinalisaties?: number;
  knippert: boolean;
  naamAdi: string;
  bedrijfsnaam: string;
  inspectielocatie: string;
  datum: string;
  tijdstip: string;
  latitude: number;
  longitude: number;
};

const ALLE_FILTERS:
  FilterStatus[] = [
    "ROOD",
    "GEEL",
    "PAARS",
    "GROEN",
    "GRIJS",
    "BRUIN",
  ];

const FILTERS: Array<{
  status: FilterStatus;
  label: string;
  stijl: string;
  ring: string;
}> = [
  {
    status: "ROOD",
    label: "Controle nodig",
    stijl:
      "border-red-300 bg-red-50 text-red-900 hover:bg-red-100",
    ring: "ring-red-500",
  },
  {
    status: "GEEL",
    label: "Controle < 2 weken",
    stijl:
      "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
    ring: "ring-amber-500",
  },
  {
    status: "PAARS",
    label: "Target via na finalisatie",
    stijl:
      "border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100",
    ring: "ring-purple-500",
  },
  {
    status: "GROEN",
    label: "Target bereikt",
    stijl:
      "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
    ring: "ring-emerald-500",
  },
  {
    status: "GRIJS",
    label: "Geen data",
    stijl:
      "border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100",
    ring: "ring-slate-500",
  },
  {
    status: "BRUIN",
    label: "⚑ Open opvolging/sanctie",
    stijl:
      "border-amber-900 bg-amber-50 text-amber-950 hover:bg-amber-100",
    ring: "ring-amber-900",
  },
];

function heeftCategorie(
  rij: LaattijdigKaartbezoek,
  status: FilterStatus,
) {
  if (status === "BRUIN") {
    return Boolean(
      rij.heeftOpenOpvolging,
    );
  }

  return rij.status === status;
}

function kleur(
  status: PlanningStatus,
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
    case "PAARS":
      return {
        lijn: "#6b21a8",
        vulling: "#a855f7",
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

function statusTekst(
  rij: LaattijdigKaartbezoek,
) {
  if (rij.heeftOpenOpvolging) {
    return "Open opvolging of sanctie";
  }

  switch (rij.status) {
    case "ROOD":
      return "Controle nodig";
    case "GEEL":
      return "Laatste controle minder dan 2 weken geleden";
    case "PAARS":
      return "Target bereikt via na finalisatie";
    case "GROEN":
      return "Target bereikt";
    default:
      return "Geen attestgegevens";
  }
}

function maakPopup(
  rij: LaattijdigKaartbezoek,
) {
  const element =
    document.createElement("div");

  element.className =
    "min-w-[230px] space-y-1 text-sm";

  const titel =
    document.createElement("p");
  titel.className =
    "font-bold text-slate-950";
  titel.textContent =
    rij.naamAdi || "Onbekende ADI";
  element.appendChild(titel);

  const inhoud = [
    rij.bedrijfsnaam,
    rij.inspectielocatie,
    `${rij.datum} om ${rij.tijdstip}`,
    `${rij.aantalAttesten ?? 0} attesten`,
    `Terreincontroles: ${rij.aantalTerreincontroles ?? 0}/${rij.terreincontroleTarget ?? 0}`,
    `Na finalisatie: ${rij.aantalNaFinalisaties ?? 0}`,
  ];

  for (const waarde of inhoud) {
    if (!waarde) continue;

    const regel =
      document.createElement("p");
    regel.className =
      "text-slate-700";
    regel.textContent = waarde;
    element.appendChild(regel);
  }

  const status =
    document.createElement("p");
  status.className =
    "mt-2 font-bold text-slate-900";
  status.textContent =
    statusTekst(rij);
  element.appendChild(status);

  return element;
}

function markersleutel(
  rijen:
    LaattijdigKaartbezoek[],
) {
  return rijen.map(
    (rij) => [
      rij.id,
      rij.status,
      rij.heeftOpenOpvolging
        ? "BRUIN"
        : "GEEN_BRUIN",
      rij.latitude,
      rij.longitude,
      rij.knippert,
    ].join("|"),
  ).join(";");
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
  const kaart =
    useRef<
      import("leaflet").Map | null
    >(null);
  const groep =
    useRef<
      import("leaflet").LayerGroup | null
    >(null);
  const leaflet =
    useRef<
      typeof import("leaflet") | null
    >(null);
  const laatsteSleutel =
    useRef("");

  const [
    kaartKlaar,
    setKaartKlaar,
  ] = useState(false);

  const [
    actieveFilters,
    setActieveFilters,
  ] = useState<FilterStatus[]>(
    [...ALLE_FILTERS],
  );

  const allesActief =
    ALLE_FILTERS.every(
      (status) =>
        actieveFilters.includes(
          status,
        ),
    );

  const zichtbareRijen =
    useMemo(
      () =>
        rijen.filter(
          (rij) =>
            Number.isFinite(
              rij.latitude,
            ) &&
            Number.isFinite(
              rij.longitude,
            ) &&
            actieveFilters.some(
              (status) =>
                heeftCategorie(
                  rij,
                  status,
                ),
            ),
        ),
      [
        rijen,
        actieveFilters,
      ],
    );

  function wisselFilter(
    status: FilterStatus,
  ) {
    setActieveFilters(
      (huidige) => {
        const allesWasActief =
          ALLE_FILTERS.every(
            (kleur) =>
              huidige.includes(
                kleur,
              ),
          );

        if (allesWasActief) {
          return [status];
        }

        const volgende =
          huidige.includes(status)
            ? huidige.filter(
                (kleur) =>
                  kleur !== status,
              )
            : [
                ...huidige,
                status,
              ];

        return volgende.length > 0
          ? volgende
          : [...ALLE_FILTERS];
      },
    );
  }

  useEffect(() => {
    let geannuleerd = false;

    async function starten() {
      if (
        !kaartElement.current ||
        kaart.current
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

      leaflet.current = L;
      kaart.current =
        L.map(
          kaartElement.current,
          {
            center: [
              50.8503,
              4.3517,
            ],
            zoom: 8,
            scrollWheelZoom:
              false,
          },
        );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; OpenStreetMap-bijdragers',
        },
      ).addTo(kaart.current);

      groep.current =
        L.layerGroup().addTo(
          kaart.current,
        );

      setKaartKlaar(true);

      kaart.current.fitBounds(
        L.latLngBounds([
          [50.67, 2.50],
          [51.51, 5.94],
        ]),
        {
          padding: [20, 20],
          animate: false,
        },
      );
    }

    void starten();

    return () => {
      geannuleerd = true;
      groep.current = null;
      leaflet.current = null;

      kaart.current?.remove();
      kaart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!kaartKlaar) {
      return;
    }

    const L = leaflet.current;
    const markerGroep =
      groep.current;

    if (!L || !markerGroep) {
      return;
    }

    const sleutel =
      markersleutel(
        zichtbareRijen,
      );

    if (
      sleutel ===
      laatsteSleutel.current
    ) {
      return;
    }

    markerGroep.clearLayers();

    for (
      const rij of
      zichtbareRijen
    ) {
      const positie:
        import("leaflet").LatLngExpression =
        [
          rij.latitude,
          rij.longitude,
        ];

            const kleuren =
        kleur(
          rij.status,
        );

      const marker =
        L.circleMarker(
          positie,
          {
            radius: 5,
            weight: 2,
            fillOpacity: 0.9,
            color: kleuren.lijn,
            fillColor:
              kleuren.vulling,
            className:
              rij.knippert
                ? "plaatsbezoek-kaartmarker-knipper"
                : "",
          },
        );

      marker
        .bindPopup(
          maakPopup(rij),
          {
            maxWidth: 340,
          },
        )
        .addTo(markerGroep);

      if (rij.heeftOpenOpvolging) {
        L.marker(
          positie,
          {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
              className:
                "bg-transparent border-0",
              html:
                '<span aria-hidden="true" style="display:block;color:#78350f;font-size:24px;font-weight:900;line-height:1;text-shadow:0 1px 2px white,0 2px 4px rgba(15,23,42,.35)">⚑</span>',
              iconSize: [22, 26],
              iconAnchor: [-1, 22],
            }),
          },
        ).addTo(markerGroep);
      }
    }

    laatsteSleutel.current =
      sleutel;
  }, [
    zichtbareRijen,
    kaartKlaar,
  ]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="shrink-0 text-lg font-black text-slate-950">
          Actieve plaatsbezoeken
        </h2>

        <div
          className="flex max-w-full flex-nowrap items-center justify-end gap-1.5 overflow-x-auto whitespace-nowrap px-2 py-2 scroll-px-2 [&>button]:shrink-0"
          aria-label="Filter plaatsbezoeken op status"
        >
          <button
            type="button"
            aria-pressed={
              allesActief
            }
            onClick={() =>
              setActieveFilters([
                ...ALLE_FILTERS,
              ])
            }
            className={`rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900 transition hover:bg-indigo-100 ${
              allesActief
                ? "ring-2 ring-inset ring-indigo-500"
                : "opacity-45"
            }`}
          >
            Alle kleuren
          </button>

          {FILTERS.map(
            ({
              status,
              label,
              stijl,
              ring,
            }) => {
              const actief =
                actieveFilters.includes(
                  status,
                );

              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={actief}
                  onClick={() =>
                    wisselFilter(
                      status,
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-inset ${stijl} ${
                    actief
                      ? `ring-2 ring-inset ${ring} opacity-100`
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

      <div className="relative mt-3">
        <div
          ref={kaartElement}
          className="h-[420px] w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100"
          aria-label="Kaart met actieve laattijdige plaatsbezoeken"
        />

        {zichtbareRijen.length === 0 ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-xl border border-slate-300 bg-white/95 px-4 py-2 text-center text-sm font-semibold text-slate-600 shadow">
            Geen plaatsbezoeken voor de geselecteerde filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}

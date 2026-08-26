"use client";

import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  type FilterTabelKolom,
  type FilterTabelRij,
} from "@/components/TerreincontroleFilterTabel";
import TerreincontroleMeerMenu from "@/components/TerreincontroleMeerMenu";

type Props = {
  rij: FilterTabelRij;
  kolommen: FilterTabelKolom[];
  geopend: boolean;
  magBeheren: boolean;
  renderCel: (rij: FilterTabelRij, kolom: FilterTabelKolom) => ReactNode;
  onWissel: (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    id: number,
  ) => void;
};

const ZICHTBARE_SLEUTELS = new Set([
  "auditeur",
  "naamAdi",
  "afgerond",
  "status",
  "factuurVerzonden",
  "inspectielocatie",
  "datumPlaatsbezoek",
  "uurPlaatsbezoek",
]);

const ACTIE_SLEUTELS = new Set(["googleMaps", "attestUrl", "acties"]);

function tekstWaarde(waarde: unknown) {
  if (waarde === null || waarde === undefined || waarde === "") {
    return "";
  }

  if (typeof waarde === "boolean") {
    return waarde ? "Ja" : "Nee";
  }

  return String(waarde);
}

function statusTekst(waarde: unknown) {
  switch (waarde) {
    case "IN_OPMAAK":
      return "In opmaak";
    case "GEARCHIVEERD_ATTEST":
      return "Gearchiveerd attest";
    case "ACTUEEL_ATTEST":
      return "Actueel attest";
    default:
      return tekstWaarde(waarde);
  }
}

function kopieerWaardeVoorKolom(rij: FilterTabelRij, sleutel: string) {
  const waarde = rij[sleutel];

  if (sleutel === "status") {
    return statusTekst(waarde);
  }

  if (sleutel === "factuurVerzonden") {
    return waarde === true ? "Ja" : waarde === false ? "Nee" : "NVT";
  }

  return tekstWaarde(waarde);
}

function googleMapsUrl(waarde: unknown) {
  const locatie = tekstWaarde(waarde).trim();

  if (!locatie) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(locatie)
  );
}

function KopieerKnop({ waarde, label }: { waarde: unknown; label: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const kopieerTekst = tekstWaarde(waarde).trim();

  if (!kopieerTekst) {
    return null;
  }

  async function kopieer() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(kopieerTekst);
      } else {
        const tekstvak = document.createElement("textarea");

        tekstvak.value = kopieerTekst;
        tekstvak.setAttribute("readonly", "");
        tekstvak.style.position = "fixed";
        tekstvak.style.opacity = "0";

        document.body.appendChild(tekstvak);
        tekstvak.select();
        document.execCommand("copy");
        tekstvak.remove();
      }

      setGekopieerd(true);

      window.setTimeout(() => {
        setGekopieerd(false);
      }, 1400);
    } catch {
      setGekopieerd(false);
    }
  }

  return (
    <button
      type="button"
      title={gekopieerd ? "Gekopieerd" : `${label} kopiëren`}
      aria-label={
        gekopieerd ? `${label} gekopieerd` : `Kopieer ${label.toLowerCase()}`
      }
      onClick={(event) => {
        event.stopPropagation();
        void kopieer();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded border transition focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
        gekopieerd
          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
          : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      }`}
    >
      {gekopieerd ? (
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="m4 10 4 4 8-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <rect x="6.5" y="6.5" width="9" height="9" rx="1.5" />
          <path
            d="M13.5 6.5V5A1.5 1.5 0 0 0 12 3.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

function KaartWaarde({
  label,
  kinderen,
  kopieerWaarde,
  className = "",
}: {
  label: string;
  kinderen: ReactNode;
  kopieerWaarde?: unknown;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-0.5 flex min-w-0 max-w-full items-start gap-1">
        <div className="min-w-0 max-w-full flex-1 whitespace-pre-wrap break-words text-xs font-semibold leading-4 text-slate-900">
          {kinderen ?? "—"}
        </div>

        <KopieerKnop waarde={kopieerWaarde} label={label} />
      </div>
    </div>
  );
}

export function TerreincontrolePlanningKaart({
  rij,
  kolommen,
  geopend,
  magBeheren,
  renderCel,
  onWissel,
}: Props) {
  function renderKolom(sleutel: string) {
    const kolom = kolommen.find((kandidaat) => kandidaat.sleutel === sleutel);

    if (!kolom) {
      return "—";
    }

    return renderCel(rij, kolom);
  }

  const overigeKolommen = kolommen.filter(
    (kolom) =>
      !ZICHTBARE_SLEUTELS.has(kolom.sleutel) &&
      !ACTIE_SLEUTELS.has(kolom.sleutel),
  );

  const locatieUrl = googleMapsUrl(rij.inspectielocatie);
  const attestUrl = tekstWaarde(rij.attestUrl).trim();

  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={geopend}
      aria-label={`Ingeplande terreincontrole ${
        tekstWaarde(rij.attestId) || rij.id
      }`}
      onClick={(event) => {
        onWissel(event, rij.id);
      }}
      onKeyDown={(event) => {
        onWissel(event, rij.id);
      }}
      className={`group relative z-0 cursor-pointer rounded-xl border shadow-sm outline-none transition hover:border-emerald-300 hover:shadow-md focus-within:z-40 has-[details[open]]:z-50 focus-visible:ring-4 focus-visible:ring-emerald-200 ${
        rij.afgerond === true ? "bg-emerald-50/70" : "bg-white"
      } ${
        geopend
          ? "border-emerald-400 ring-1 ring-emerald-200"
          : "border-slate-200"
      }`}
    >
      <div className="relative px-3 py-2.5 pr-10">
        <span
          aria-hidden="true"
          className={`absolute right-2.5 top-2.5 inline-flex size-6 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600 transition ${
            geopend ? "rotate-180 bg-emerald-100 text-emerald-800" : ""
          }`}
        >
          ↓
        </span>

        <div className="grid gap-x-2 gap-y-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(0,0.78fr)_minmax(0,1.32fr)_minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.90fr)] xl:items-start">
          <KaartWaarde
            label="Auditeur"
            kopieerWaarde={kopieerWaardeVoorKolom(rij, "auditeur")}
            kinderen={renderKolom("auditeur")}
          />

          <KaartWaarde
            label="Naam ADI"
            kopieerWaarde={kopieerWaardeVoorKolom(rij, "naamAdi")}
            kinderen={renderKolom("naamAdi")}
          />

          <KaartWaarde label="Afgerond" kinderen={renderKolom("afgerond")} />

          <KaartWaarde
            label="Status"
            kinderen={renderKolom("status")}
            className="min-w-0 max-w-full overflow-hidden [&_select]:block [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:truncate [&_select]:px-2"
          />

          <KaartWaarde
            label="Inspectielocatie"
            kopieerWaarde={kopieerWaardeVoorKolom(rij, "inspectielocatie")}
            kinderen={renderKolom("inspectielocatie")}
          />

          <KaartWaarde
            label="Plaatsbezoek datum"
            kinderen={renderKolom("datumPlaatsbezoek")}
          />

          <KaartWaarde
            label="Uur plaatsbezoek"
            kinderen={renderKolom("uurPlaatsbezoek")}
          />

          <KaartWaarde
            label="Factuur verzonden"
            kinderen={renderKolom("factuurVerzonden")}
            className="min-w-0 max-w-full overflow-hidden [&_select]:block [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:truncate [&_select]:px-2"
          />
        </div>
      </div>

      {geopend ? (
        <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2.5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-600">
            Overige gegevens
          </p>

          <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {overigeKolommen.map((kolom) => (
              <KaartWaarde
                key={kolom.sleutel}
                label={kolom.label}
                kopieerWaarde={kopieerWaardeVoorKolom(rij, kolom.sleutel)}
                kinderen={renderCel(rij, kolom)}
                className={
                  kolom.sleutel === "opmerkingen"
                    ? "sm:col-span-2 lg:col-span-3"
                    : ""
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`${geopend ? "flex" : "hidden"} flex-wrap items-center gap-1.5 border-t border-slate-200 px-3 py-2`}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        {locatieUrl ? (
          <a
            href={locatieUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            Google Maps
          </a>
        ) : null}

        {attestUrl ? (
          <a
            href={attestUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            Attest
          </a>
        ) : null}

        {magBeheren ? (
          <div className="ml-auto">
            <TerreincontroleMeerMenu id={rij.id} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

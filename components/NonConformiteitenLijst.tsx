"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  NonConformiteitKaartKolombalk,
  type NonConformiteitCardSortering,
} from "@/components/NonConformiteitKaartKolombalk";
import { useNonConformiteitenQuery } from "@/hooks/useNonConformiteitenQuery";

export type NonConformiteitSortering =
  | "bron"
  | "ncId"
  | "categorie"
  | "parameter"
  | "naamAdi"
  | "ovamId"
  | "datumControle"
  | "attestnummer"
  | "adres"
  | "vastgesteldDoorCi"
  | "groteImpact";

export type NonConformiteitTrendPunt = {
  periode: string;
  aantal: number;
};

export type NonConformiteitRij = {
  lijstId: number;
  vaststellingId: number;
  controleId: number;
  bron: string;
  bronSleutel: string;
  excelRij: number;
  parameter: string;
  ncId: string;
  omschrijving: string;
  vastgesteldDoorCi: string;
  verduidelijking: string;
  groteImpact: string;
  categorie: string;
  motivatieAanpassing: string;
  aangemaaktOp: string;
  auditeur: string;
  naamAdi: string;
  ovamId: string;
  datumControle: string;
  trend: NonConformiteitTrendPunt[];
  attestnummer: string;
  linkAttest: string;
  certificatiePlatform: string;
  adres: string;
  bedrijfsnaam: string;
  ondernemingsnummer: string;
  persoonscertificaat: string;
  procescertificaat: string;
};

const KOLOMMEN: Array<{
  sleutel: NonConformiteitSortering;
  label: string;
  type?: string;
}> = [
  { sleutel: "bron", label: "Bron" },
  { sleutel: "ncId", label: "NC-ID" },
  { sleutel: "categorie", label: "Categorie" },
  { sleutel: "parameter", label: "Parameter" },
  { sleutel: "naamAdi", label: "Naam ADI" },
  { sleutel: "ovamId", label: "OVAM-ID" },
  {
    sleutel: "datumControle",
    label: "Datum controle",
    type: "datum",
  },
  { sleutel: "attestnummer", label: "Attestnummer" },
  { sleutel: "adres", label: "Adres" },
  {
    sleutel: "vastgesteldDoorCi",
    label: "Vastgesteld door CI",
  },
  { sleutel: "groteImpact", label: "Grote impact" },
];

function Waarde({
  label,
  waarde,
  breed = false,
}: {
  label: string;
  waarde: unknown;
  breed?: boolean;
}) {
  const tekst = String(waarde ?? "").trim();

  return (
    <div className={breed ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
        {tekst || "—"}
      </dd>
    </div>
  );
}

function badgeStijl(waarde: string) {
  const tekst = waarde.trim().toLocaleLowerCase("nl-BE");

  if (tekst === "ja") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tekst === "nee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function isInteractiefElement(doel: EventTarget | null) {
  return (
    doel instanceof Element &&
    Boolean(doel.closest("a, button, input, select, textarea, details"))
  );
}

function vulOntbrekendeMaanden(
  trend: NonConformiteitTrendPunt[],
): NonConformiteitTrendPunt[] {
  const geldigePunten = trend
    .filter(
      (punt) =>
        /^\d{4}-\d{2}$/.test(punt.periode) &&
        Number.isFinite(punt.aantal) &&
        punt.aantal >= 0,
    )
    .sort((eerste, tweede) => eerste.periode.localeCompare(tweede.periode));

  if (geldigePunten.length === 0) {
    return [];
  }

  const aantallen = new Map(
    geldigePunten.map((punt) => [punt.periode, punt.aantal]),
  );

  const [beginJaar, beginMaand] = geldigePunten[0].periode
    .split("-")
    .map(Number);
  const [eindJaar, eindMaand] = geldigePunten[geldigePunten.length - 1].periode
    .split("-")
    .map(Number);

  const cursor = new Date(Date.UTC(beginJaar, beginMaand - 1, 1));
  const einde = new Date(Date.UTC(eindJaar, eindMaand - 1, 1));
  const resultaat: NonConformiteitTrendPunt[] = [];

  while (cursor.getTime() <= einde.getTime() && resultaat.length < 600) {
    const periode = `${cursor.getUTCFullYear()}-${String(
      cursor.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    resultaat.push({
      periode,
      aantal: aantallen.get(periode) ?? 0,
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return resultaat;
}

function periodeLabel(periode: string, volledig = false) {
  const [jaar, maand] = periode.split("-").map(Number);

  if (!jaar || !maand) {
    return periode;
  }

  return new Intl.DateTimeFormat("nl-BE", {
    month: volledig ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(jaar, maand - 1, 1)));
}

function maakGrafiekpunten({
  trend,
  breedte,
  hoogte,
  margeLinks,
  margeRechts,
  margeBoven,
  margeOnder,
}: {
  trend: NonConformiteitTrendPunt[];
  breedte: number;
  hoogte: number;
  margeLinks: number;
  margeRechts: number;
  margeBoven: number;
  margeOnder: number;
}) {
  const maximaal = Math.max(1, ...trend.map((punt) => punt.aantal));
  const grafiekBreedte = breedte - margeLinks - margeRechts;
  const grafiekHoogte = hoogte - margeBoven - margeOnder;

  return {
    maximaal,
    punten: trend.map((punt, index) => {
      const x =
        trend.length <= 1
          ? margeLinks + grafiekBreedte / 2
          : margeLinks + (index / (trend.length - 1)) * grafiekBreedte;
      const y = margeBoven + (1 - punt.aantal / maximaal) * grafiekHoogte;

      return {
        ...punt,
        x,
        y,
      };
    }),
  };
}

function NcIdSparkline({
  ncId,
  trend,
  onOpenen,
}: {
  ncId: string;
  trend: NonConformiteitTrendPunt[];
  onOpenen: () => void;
}) {
  const punten = vulOntbrekendeMaanden(trend);

  if (!ncId.trim() || punten.length === 0) {
    return (
      <p className="mt-1 text-[9px] text-slate-400">Geen trend beschikbaar</p>
    );
  }

  const breedte = 180;
  const hoogte = 34;
  const geometrie = maakGrafiekpunten({
    trend: punten,
    breedte,
    hoogte,
    margeLinks: 2,
    margeRechts: 2,
    margeBoven: 3,
    margeOnder: 3,
  });

  const lijn = geometrie.punten
    .map(
      (punt, index) =>
        `${index === 0 ? "M" : "L"} ${punt.x.toFixed(2)} ${punt.y.toFixed(2)}`,
    )
    .join(" ");

  const eerste = geometrie.punten[0];
  const laatste = geometrie.punten.at(-1);
  const oppervlakte =
    eerste && laatste
      ? `${lijn} L ${laatste.x.toFixed(2)} ${(hoogte - 2).toFixed(
          2,
        )} L ${eerste.x.toFixed(2)} ${(hoogte - 2).toFixed(2)} Z`
      : "";

  return (
    <button
      type="button"
      onClick={onOpenen}
      className="mt-1.5 block h-8 w-full max-w-44 overflow-hidden rounded-md border border-emerald-100 bg-emerald-50/70 px-1 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      aria-label={`Volledige tijdgrafiek voor NC-ID ${ncId} openen`}
      title="Klik voor de volledige grafiek"
    >
      <svg
        viewBox={`0 0 ${breedte} ${hoogte}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path d={oppervlakte} fill="#a7f3d0" opacity="0.65" />
        <path
          d={lijn}
          fill="none"
          stroke="#047857"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {laatste ? (
          <circle cx={laatste.x} cy={laatste.y} r="2.4" fill="#047857" />
        ) : null}
      </svg>
    </button>
  );
}

function NcIdTrendPopup({
  ncId,
  trend,
  onSluiten,
}: {
  ncId: string;
  trend: NonConformiteitTrendPunt[];
  onSluiten: () => void;
}) {
  useEffect(() => {
    const vorigeOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function sluitMetEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onSluiten();
      }
    }

    window.addEventListener("keydown", sluitMetEscape);

    return () => {
      document.body.style.overflow = vorigeOverflow;
      window.removeEventListener("keydown", sluitMetEscape);
    };
  }, [onSluiten]);

  const punten = vulOntbrekendeMaanden(trend);
  const breedte = 900;
  const hoogte = 420;
  const margeLinks = 58;
  const margeRechts = 24;
  const margeBoven = 24;
  const margeOnder = 58;

  const geometrie = maakGrafiekpunten({
    trend: punten,
    breedte,
    hoogte,
    margeLinks,
    margeRechts,
    margeBoven,
    margeOnder,
  });

  const lijn = geometrie.punten
    .map(
      (punt, index) =>
        `${index === 0 ? "M" : "L"} ${punt.x.toFixed(2)} ${punt.y.toFixed(2)}`,
    )
    .join(" ");

  const xLabelIndexen = new Set<number>();
  const aantalLabels = Math.min(7, punten.length);

  if (aantalLabels > 0) {
    for (let index = 0; index < aantalLabels; index += 1) {
      xLabelIndexen.add(
        aantalLabels === 1
          ? 0
          : Math.round((index / (aantalLabels - 1)) * (punten.length - 1)),
      );
    }
  }

  const totaal = punten.reduce((som, punt) => som + punt.aantal, 0);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onSluiten();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="nc-trend-titel"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              Verloop op basis van controledatum
            </p>
            <h2
              id="nc-trend-titel"
              className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
            >
              NC-ID {ncId}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {totaal} vaststelling{totaal === 1 ? "" : "en"} in totaal ·
              gegroepeerd per maand
            </p>
          </div>

          <button
            type="button"
            onClick={onSluiten}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-bold text-slate-600 hover:bg-slate-100"
            aria-label="Grafiek sluiten"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-4">
            <svg
              viewBox={`0 0 ${breedte} ${hoogte}`}
              className="h-auto min-h-72 w-full"
              role="img"
              aria-label={`Tijdgrafiek van NC-ID ${ncId}`}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((verhouding) => {
                const y =
                  margeBoven + verhouding * (hoogte - margeBoven - margeOnder);
                const waarde = Math.round(
                  geometrie.maximaal * (1 - verhouding),
                );

                return (
                  <g key={verhouding}>
                    <line
                      x1={margeLinks}
                      x2={breedte - margeRechts}
                      y1={y}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="4 5"
                    />
                    <text
                      x={margeLinks - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="#64748b"
                    >
                      {waarde}
                    </text>
                  </g>
                );
              })}

              <line
                x1={margeLinks}
                x2={margeLinks}
                y1={margeBoven}
                y2={hoogte - margeOnder}
                stroke="#94a3b8"
              />
              <line
                x1={margeLinks}
                x2={breedte - margeRechts}
                y1={hoogte - margeOnder}
                y2={hoogte - margeOnder}
                stroke="#94a3b8"
              />

              <path
                d={lijn}
                fill="none"
                stroke="#047857"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {geometrie.punten.map((punt, index) => (
                <g key={punt.periode}>
                  <circle
                    cx={punt.x}
                    cy={punt.y}
                    r="4"
                    fill="#047857"
                    stroke="#ffffff"
                    strokeWidth="2"
                  >
                    <title>
                      {periodeLabel(punt.periode, true)}: {punt.aantal}
                    </title>
                  </circle>

                  {xLabelIndexen.has(index) ? (
                    <text
                      x={punt.x}
                      y={hoogte - margeOnder + 25}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#475569"
                    >
                      {periodeLabel(punt.periode)}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
              <span>Maand</span>
              <span className="text-right">Aantal</span>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {punten
                .filter((punt) => punt.aantal > 0)
                .map((punt) => (
                  <div
                    key={punt.periode}
                    className="grid grid-cols-2 border-t border-slate-100 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">
                      {periodeLabel(punt.periode, true)}
                    </span>
                    <span className="text-right font-bold text-slate-950">
                      {punt.aantal}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function NonConformiteitenLijst() {
  const [zoekterm, setZoekterm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sorteringen, setSorteringen] = useState<
    NonConformiteitCardSortering[]
  >([
    {
      sleutel: "datumControle",
      richting: "aflopend",
    },
  ]);
  const [openKaartId, setOpenKaartId] = useState<number | null>(null);
  const [openGrafiek, setOpenGrafiek] = useState<{
    ncId: string;
    trend: NonConformiteitTrendPunt[];
  } | null>(null);
  const [excelDownloadBezig, setExcelDownloadBezig] = useState(false);
  const [excelDownloadFout, setExcelDownloadFout] = useState<string | null>(
    null,
  );

  const query = useNonConformiteitenQuery({
    zoekterm,
    filters,
    sorteringen,
  });

  const heeftFilters =
    zoekterm.trim().length > 0 ||
    Object.values(filters).some((waarde) => waarde.trim()) ||
    sorteringen.length !== 1 ||
    sorteringen[0]?.sleutel !== "datumControle" ||
    sorteringen[0]?.richting !== "aflopend";

  function wisAlles() {
    setZoekterm("");
    setFilters({});
    setSorteringen([
      {
        sleutel: "datumControle",
        richting: "aflopend",
      },
    ]);
    setOpenKaartId(null);
  }

  async function downloadExcel() {
    setExcelDownloadBezig(true);
    setExcelDownloadFout(null);

    try {
      const antwoord = await fetch("/api/non-conformiteiten/export", {
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      if (!antwoord.ok) {
        let foutmelding = "Het Excel-bestand kon niet worden aangemaakt.";

        try {
          const inhoud = (await antwoord.json()) as {
            fout?: unknown;
          };

          if (typeof inhoud.fout === "string" && inhoud.fout.trim()) {
            foutmelding = inhoud.fout;
          }
        } catch {
          // Gebruik de veilige algemene foutmelding.
        }

        throw new Error(foutmelding);
      }

      const bestand = await antwoord.blob();
      const downloadUrl = URL.createObjectURL(bestand);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `non-conformiteiten-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (fout) {
      setExcelDownloadFout(
        fout instanceof Error
          ? fout.message
          : "Het Excel-bestand kon niet worden aangemaakt.",
      );
    } finally {
      setExcelDownloadBezig(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                Desk- en terreincontroles
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">
                Non-conformiteiten
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {query.rijen.length} van {query.aantalTotaal ?? "…"}{" "}
                non-conformiteiten geladen
              </p>
            </div>

            <button
              type="button"
              disabled={excelDownloadBezig}
              onClick={() => void downloadExcel()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-4"
              >
                <path
                  d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {excelDownloadBezig ? "Excel maken..." : "Excel downloaden"}
            </button>
          </div>

          {excelDownloadFout ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
            >
              {excelDownloadFout}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Zoeken in alle non-conformiteiten</span>
              <input
                type="search"
                value={zoekterm}
                onChange={(event) => setZoekterm(event.target.value)}
                placeholder="Zoeken in alle velden..."
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {heeftFilters ? (
              <button
                type="button"
                onClick={wisAlles}
                className="h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                Alles wissen
              </button>
            ) : null}
          </div>
        </header>

        <NonConformiteitKaartKolombalk
          kolommen={KOLOMMEN}
          filters={filters}
          sorteringen={sorteringen}
          onFilterWijzigen={(sleutel, waarde) => {
            setFilters((huidig) => ({
              ...huidig,
              [sleutel]: waarde,
            }));
            setOpenKaartId(null);
          }}
          onSorteren={(sleutel, richting) => {
            setSorteringen((huidig) => {
              const index = huidig.findIndex(
                (sortering) => sortering.sleutel === sleutel,
              );

              if (index < 0) {
                return [...huidig, { sleutel, richting }];
              }

              return huidig.map((sortering, sorteringIndex) =>
                sorteringIndex === index ? { sleutel, richting } : sortering,
              );
            });
            setOpenKaartId(null);
          }}
          onSorteringVerwijderen={(sleutel) => {
            setSorteringen((huidig) =>
              huidig.filter((sortering) => sortering.sleutel !== sleutel),
            );
            setOpenKaartId(null);
          }}
          onSorteringVerplaatsen={(sleutel, verschil) => {
            setSorteringen((huidig) => {
              const index = huidig.findIndex(
                (sortering) => sortering.sleutel === sleutel,
              );
              const doel = index + verschil;

              if (index < 0 || doel < 0 || doel >= huidig.length) {
                return huidig;
              }

              const volgend = [...huidig];
              [volgend[index], volgend[doel]] = [volgend[doel], volgend[index]];
              return volgend;
            });
            setOpenKaartId(null);
          }}
        />

        {query.isEersteKeerLaden && query.rijen.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm font-semibold text-slate-500">
            Non-conformiteiten laden...
          </div>
        ) : query.fout && query.rijen.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-bold text-red-800">{query.fout}</p>
            <button
              type="button"
              onClick={() => void query.opnieuwLaden()}
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
            >
              Opnieuw proberen
            </button>
          </div>
        ) : query.rijen.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="font-bold text-slate-950">
              Geen non-conformiteiten gevonden
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Pas de zoekterm of filters aan.
            </p>
          </div>
        ) : (
          <div className="space-y-2 overflow-x-hidden p-3">
            {query.rijen.map((rij) => {
              const geopend = openKaartId === rij.lijstId;
              const isDeskcontrole = rij.bronSleutel === "deskcontrole";

              return (
                <article
                  key={rij.lijstId}
                  role="button"
                  tabIndex={0}
                  aria-expanded={geopend}
                  aria-controls={`non-conformiteit-${rij.lijstId}`}
                  aria-label={`${rij.bron}, non-conformiteit ${rij.ncId}`}
                  onClick={(event) => {
                    if (isInteractiefElement(event.target)) {
                      return;
                    }

                    setOpenKaartId((huidig) =>
                      huidig === rij.lijstId ? null : rij.lijstId,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.target !== event.currentTarget ||
                      (event.key !== "Enter" && event.key !== " ")
                    ) {
                      return;
                    }

                    event.preventDefault();
                    setOpenKaartId((huidig) =>
                      huidig === rij.lijstId ? null : rij.lijstId,
                    );
                  }}
                  className={`group relative cursor-pointer rounded-xl border bg-white shadow-sm outline-none transition hover:border-emerald-300 hover:shadow-md focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                    geopend
                      ? "border-emerald-400 ring-1 ring-emerald-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="relative p-3 pr-11">
                    <span
                      aria-hidden="true"
                      className={`absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600 transition ${
                        geopend
                          ? "rotate-180 bg-emerald-100 text-emerald-800"
                          : ""
                      }`}
                    >
                      ⌄
                    </span>

                    <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 xl:grid-cols-[0.85fr_0.8fr_0.8fr_1.35fr_1.4fr_0.9fr_1fr]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Bron
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                            isDeskcontrole
                              ? "border-violet-200 bg-violet-50 text-violet-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {rij.bron}
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          NC-ID
                        </p>
                        <p className="mt-0.5 break-words text-sm font-bold text-slate-950">
                          {rij.ncId || ""}
                        </p>
                        <NcIdSparkline
                          ncId={rij.ncId}
                          trend={rij.trend}
                          onOpenen={() =>
                            setOpenGrafiek({
                              ncId: rij.ncId,
                              trend: rij.trend,
                            })
                          }
                        />
                      </div>
                      <Waarde label="Categorie" waarde={rij.categorie} />
                      <Waarde label="Parameter" waarde={rij.parameter} />

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Naam / OVAM-ID
                        </p>
                        <p className="mt-0.5 break-words text-sm font-bold text-slate-950">
                          {rij.naamAdi || "—"}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-slate-500">
                          {rij.ovamId || "—"}
                        </p>
                      </div>

                      <Waarde
                        label="Datum controle"
                        waarde={rij.datumControle}
                      />

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Attestnummer / adres
                        </p>
                        <p className="mt-0.5 break-words text-sm font-bold text-slate-950">
                          {rij.attestnummer || ""}
                        </p>
                        <p className="mt-0.5 break-words text-xs text-slate-500">
                          {rij.adres || ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {geopend ? (
                    <div
                      id={`non-conformiteit-${rij.lijstId}`}
                      className="border-t border-slate-200 bg-slate-50/70 p-3"
                    >
                      <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-600">
                        Overige gegevens
                      </p>

                      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Waarde
                          label="Omschrijving"
                          waarde={rij.omschrijving}
                          breed
                        />
                        <Waarde
                          label="Verduidelijking"
                          waarde={rij.verduidelijking}
                          breed
                        />

                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Vastgesteld door CI
                          </dt>
                          <dd className="mt-1">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeStijl(
                                rij.vastgesteldDoorCi,
                              )}`}
                            >
                              {rij.vastgesteldDoorCi || "—"}
                            </span>
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Grote impact
                          </dt>
                          <dd className="mt-1">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeStijl(
                                rij.groteImpact,
                              )}`}
                            >
                              {rij.groteImpact || "—"}
                            </span>
                          </dd>
                        </div>

                        <Waarde label="Auditeur" waarde={rij.auditeur} />
                        <Waarde label="Excelrij" waarde={rij.excelRij} />
                        <Waarde
                          label="Motivatie aanpassing"
                          waarde={rij.motivatieAanpassing}
                          breed
                        />
                        <Waarde
                          label="Bedrijfsnaam"
                          waarde={rij.bedrijfsnaam}
                        />
                        <Waarde
                          label="Ondernemingsnummer"
                          waarde={rij.ondernemingsnummer}
                        />
                        <Waarde
                          label="Persoonscertificaat"
                          waarde={rij.persoonscertificaat}
                        />
                        <Waarde
                          label="Procescertificaat"
                          waarde={rij.procescertificaat}
                        />
                        <Waarde
                          label="Toegevoegd op"
                          waarde={rij.aangemaaktOp}
                        />
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {/^https?:\/\//i.test(rij.linkAttest) ? (
                          <a
                            href={rij.linkAttest}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                          >
                            Attest openen
                          </a>
                        ) : null}

                        {/^https?:\/\//i.test(rij.certificatiePlatform) ? (
                          <a
                            href={rij.certificatiePlatform}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Certificatieplatform
                          </a>
                        ) : null}

                        <Link
                          href={
                            isDeskcontrole
                              ? "/deskcontroles"
                              : "/terreincontroles"
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Naar {rij.bron.toLocaleLowerCase("nl-BE")}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <footer className="border-t border-slate-200 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {query.rijen.length} van {query.aantalTotaal ?? "…"} resultaten
            </p>

            {query.heeftVolgendePagina ? (
              <button
                type="button"
                disabled={query.isVolgendePaginaLaden}
                onClick={() => void query.laadVolgendePagina()}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
              >
                {query.isVolgendePaginaLaden
                  ? "Resultaten laden..."
                  : "Meer resultaten laden"}
              </button>
            ) : (
              <p className="text-xs text-slate-500">
                Alle beschikbare resultaten zijn geladen.
              </p>
            )}
          </div>

          {query.fout && query.rijen.length > 0 ? (
            <p className="mt-2 text-xs font-semibold text-red-700">
              {query.fout}
            </p>
          ) : null}
        </footer>
      </section>

      {openGrafiek && typeof document !== "undefined"
        ? createPortal(
            <NcIdTrendPopup
              ncId={openGrafiek.ncId}
              trend={openGrafiek.trend}
              onSluiten={() => setOpenGrafiek(null)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

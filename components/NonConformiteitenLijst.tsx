"use client";

import Link from "next/link";
import { useState } from "react";
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
  | "vastgesteldDoorCi"
  | "groteImpact";

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

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-5 sm:px-6">
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

                    <Waarde label="NC-ID" waarde={rij.ncId} />
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

                    <Waarde label="Datum controle" waarde={rij.datumControle} />
                    <Waarde label="Attestnummer" waarde={rij.attestnummer} />
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
                      <Waarde label="Bedrijfsnaam" waarde={rij.bedrijfsnaam} />
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
                      <Waarde label="Adres" waarde={rij.adres} breed />
                      <Waarde label="Toegevoegd op" waarde={rij.aangemaaktOp} />
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
  );
}

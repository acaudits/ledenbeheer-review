"use client";

import { useMemo, useState } from "react";

import {
  FormuliergebruikKaartKolombalk,
  type FormuliergebruikCardSortering,
} from "@/components/FormuliergebruikKaartKolombalk";
import { useFormuliergebruikQuery } from "@/hooks/useFormuliergebruikQuery";

export type FormuliergebruikRij = {
  id: number;
  gestartOp: string;
  laatsteActiviteitOp: string;
  actieveDuurSeconden: number;
  status: string;
  stap: string;
  apparaat: string;
  naamAdi: string;
  persoonsId: string;
  foutcode: string | null;
  foutmelding: string | null;
  validatiePogingen: number;
  ovamLinkGeklikt: boolean;
  ovamLinkKlikken: number;
  ovamLinkLaatstOp: string | null;
  referentie: string | null;
  aantalPlaatsbezoeken: number;
  momentopname: unknown;
};

type Props = {
  totaalSessies: number;
};

type Kolom = {
  sleutel: keyof FormuliergebruikRij;
  label: string;
  type?: "datum";
};

const kolommen: Kolom[] = [
  {
    sleutel: "gestartOp",
    label: "Gestart",
    type: "datum",
  },
  {
    sleutel: "laatsteActiviteitOp",
    label: "Laatste activiteit",
    type: "datum",
  },
  {
    sleutel: "actieveDuurSeconden",
    label: "Duur",
  },
  {
    sleutel: "status",
    label: "Status",
  },
  {
    sleutel: "stap",
    label: "Stopstap",
  },
  {
    sleutel: "apparaat",
    label: "Apparaat",
  },
  {
    sleutel: "naamAdi",
    label: "Naam ADI",
  },
  {
    sleutel: "persoonsId",
    label: "PersoonsID",
  },
  {
    sleutel: "foutcode",
    label: "Foutcode",
  },
  {
    sleutel: "foutmelding",
    label: "Foutmelding",
  },
  {
    sleutel: "ovamLinkGeklikt",
    label: "OVAM-link",
  },
  {
    sleutel: "ovamLinkKlikken",
    label: "Aantal kliks",
  },
  {
    sleutel: "ovamLinkLaatstOp",
    label: "Laatste klik",
    type: "datum",
  },
  {
    sleutel: "referentie",
    label: "Referentie",
  },
  {
    sleutel: "aantalPlaatsbezoeken",
    label: "Aantal bezoeken",
  },
  {
    sleutel: "id",
    label: "ID",
  },
];

function label(waarde: string | null) {
  if (!waarde) {
    return "—";
  }

  return waarde
    .toLocaleLowerCase("nl-BE")
    .replaceAll("_", " ")
    .replace(/^./, (teken) => teken.toLocaleUpperCase("nl-BE"));
}

function datumTijd(waarde: string | null) {
  if (!waarde) {
    return "—";
  }

  const datum = new Date(waarde);

  if (Number.isNaN(datum.getTime())) {
    return waarde;
  }

  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(datum);
}

function duur(seconden: number) {
  const veilig = Math.max(0, seconden);
  const uren = Math.floor(veilig / 3600);
  const minuten = Math.floor((veilig % 3600) / 60);
  const rest = veilig % 60;

  return [
    uren ? `${uren} u` : "",
    minuten ? `${minuten} min` : "",
    `${rest} sec`,
  ]
    .filter(Boolean)
    .join(" ");
}

function statusStijl(status: string) {
  switch (status) {
    case "GESLAAGD":
      return "bg-emerald-100 text-emerald-900";
    case "MISLUKT":
      return "bg-red-100 text-red-900";
    case "ONVOLLEDIG":
      return "bg-amber-100 text-amber-950";
    case "BEZIG":
      return "bg-blue-100 text-blue-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function isInteractief(doel: EventTarget | null) {
  return (
    doel instanceof Element &&
    Boolean(
      doel.closest("a,button,input,select,textarea,summary,details,label"),
    )
  );
}

function KopieerKnop({
  waarde,
  labelTekst,
}: {
  waarde: string | null;
  labelTekst: string;
}) {
  const [gekopieerd, setGekopieerd] = useState(false);

  if (!waarde) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async (event) => {
        event.stopPropagation();

        try {
          await navigator.clipboard.writeText(waarde);
          setGekopieerd(true);
          window.setTimeout(() => setGekopieerd(false), 1500);
        } catch {
          setGekopieerd(false);
        }
      }}
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`${labelTekst} kopiëren`}
    >
      {gekopieerd ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}

function Waarde({
  titel,
  waarde,
  kopieerbaar = false,
  mono = false,
}: {
  titel: string;
  waarde: string | null;
  kopieerbaar?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {titel}
      </dt>
      <dd className="mt-1 flex min-w-0 items-start gap-2">
        <span
          className={`min-w-0 flex-1 break-words text-sm text-slate-900 ${
            mono ? "font-mono text-xs" : "font-semibold"
          }`}
        >
          {waarde || "—"}
        </span>

        {kopieerbaar ? (
          <KopieerKnop waarde={waarde} labelTekst={titel} />
        ) : null}
      </dd>
    </div>
  );
}

export function FormuliergebruikKaarten({ totaalSessies }: Props) {
  const [zoekterm, setZoekterm] = useState("");

  const [filters, setFilters] = useState<Record<string, string>>({});

  const [sorteringen, setSorteringen] = useState<
    FormuliergebruikCardSortering[]
  >([
    {
      sleutel: "gestartOp",
      richting: "aflopend",
    },
  ]);

  const [geopendId, setGeopendId] = useState<number | null>(null);

  const query = useFormuliergebruikQuery({
    zoekterm,
    filters,
    sorteringen,
  });

  const heeftFilters =
    Boolean(zoekterm.trim()) || Object.values(filters).some(Boolean);

  const actieveFilters = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  function wisselSortering(sleutel: string, richting: "oplopend" | "aflopend") {
    setSorteringen((huidig) => {
      const bestaand = huidig.findIndex((item) => item.sleutel === sleutel);

      if (bestaand === -1) {
        return [
          ...huidig,
          {
            sleutel,
            richting,
          },
        ];
      }

      return huidig.map((item, index) =>
        index === bestaand
          ? {
              ...item,
              richting,
            }
          : item,
      );
    });
  }

  function verplaatsSortering(sleutel: string, verschil: -1 | 1) {
    setSorteringen((huidig) => {
      const index = huidig.findIndex((item) => item.sleutel === sleutel);

      const doel = index + verschil;

      if (index < 0 || doel < 0 || doel >= huidig.length) {
        return huidig;
      }

      const volgend = [...huidig];

      [volgend[index], volgend[doel]] = [volgend[doel], volgend[index]];

      return volgend;
    });
  }

  function wisAlles() {
    setZoekterm("");
    setFilters({});
    setSorteringen([
      {
        sleutel: "gestartOp",
        richting: "aflopend",
      },
    ]);
    setGeopendId(null);
  }

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Zoeken in formuliergebruik</span>
            <input
              type="search"
              value={zoekterm}
              onChange={(event) => setZoekterm(event.target.value)}
              placeholder="Zoeken op naam, PersoonsID, fout, status of referentie"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {heeftFilters ||
          sorteringen.length !== 1 ||
          sorteringen[0]?.sleutel !== "gestartOp" ||
          sorteringen[0]?.richting !== "aflopend" ? (
            <button
              type="button"
              onClick={wisAlles}
              className="h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 hover:bg-amber-100"
            >
              Alles wissen
              {actieveFilters ? ` (${actieveFilters})` : ""}
            </button>
          ) : null}
        </div>
      </div>

      <FormuliergebruikKaartKolombalk
        kolommen={kolommen}
        filters={filters}
        sorteringen={sorteringen}
        onFilterWijzigen={(sleutel, waarde) => {
          setFilters((huidig) => ({
            ...huidig,
            [sleutel]: waarde,
          }));
          setGeopendId(null);
        }}
        onSorteren={wisselSortering}
        onSorteringVerwijderen={(sleutel) =>
          setSorteringen((huidig) =>
            huidig.filter((item) => item.sleutel !== sleutel),
          )
        }
        onSorteringVerplaatsen={verplaatsSortering}
      />

      {query.isEersteKeerLaden ? (
        <div className="p-10 text-center text-sm font-semibold text-slate-500">
          Formulierlogs laden...
        </div>
      ) : query.fout && query.rijen.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-bold text-red-700">{query.fout}</p>
          <button
            type="button"
            onClick={() => {
              void query.opnieuwLaden();
            }}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : query.rijen.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">
          {totaalSessies === 0
            ? "Er zijn nog geen formulierlogs."
            : "Geen formulierlogs voldoen aan de gekozen zoekopdracht en filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 p-2.5 md:grid-cols-2 xl:grid-cols-3">
          {query.rijen.map((rij) => {
            const geopend = geopendId === rij.id;

            const inhoudId = `formuliergebruik-${rij.id}`;

            return (
              <article
                key={rij.id}
                role="button"
                tabIndex={0}
                aria-expanded={geopend}
                aria-controls={inhoudId}
                onClick={(event) => {
                  if (isInteractief(event.target)) {
                    return;
                  }

                  setGeopendId(geopend ? null : rij.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }

                  if (isInteractief(event.target)) {
                    return;
                  }

                  event.preventDefault();
                  setGeopendId(geopend ? null : rij.id);
                }}
                className="min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Gestart
                    </p>
                    <p className="mt-1 break-words text-sm font-black text-slate-950">
                      {datumTijd(rij.gestartOp)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusStijl(
                      rij.status,
                    )}`}
                  >
                    {label(rij.status)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <Waarde titel="Naam ADI" waarde={rij.naamAdi} />
                  <Waarde titel="PersoonsID" waarde={rij.persoonsId} mono />
                  <Waarde titel="Stopstap" waarde={label(rij.stap)} />
                  <Waarde titel="Duur" waarde={duur(rij.actieveDuurSeconden)} />
                </dl>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {rij.aantalPlaatsbezoeken}{" "}
                    {rij.aantalPlaatsbezoeken === 1
                      ? "plaatsbezoek"
                      : "plaatsbezoeken"}
                  </span>
                  <span className="text-xs font-black text-emerald-800">
                    {geopend ? "Sluiten ↑" : "Overige gegevens ↓"}
                  </span>
                </div>

                {geopend ? (
                  <div
                    id={inhoudId}
                    className="mt-3 border-t border-slate-200 pt-3"
                  >
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Waarde
                        titel="Laatste activiteit"
                        waarde={datumTijd(rij.laatsteActiviteitOp)}
                      />
                      <Waarde titel="Apparaat" waarde={label(rij.apparaat)} />
                      <Waarde
                        titel="Referentie"
                        waarde={rij.referentie}
                        kopieerbaar
                        mono
                      />
                      <Waarde
                        titel="PersoonsID"
                        waarde={rij.persoonsId}
                        kopieerbaar
                        mono
                      />
                      <Waarde titel="Foutcode" waarde={rij.foutcode} mono />
                      <Waarde
                        titel="Validatiepogingen"
                        waarde={String(rij.validatiePogingen)}
                      />
                      <Waarde
                        titel="OVAM-link geklikt"
                        waarde={rij.ovamLinkGeklikt ? "Ja" : "Nee"}
                      />
                      <Waarde
                        titel="Aantal OVAM-klikken"
                        waarde={String(rij.ovamLinkKlikken)}
                      />
                      <Waarde
                        titel="Laatste OVAM-klik"
                        waarde={datumTijd(rij.ovamLinkLaatstOp)}
                      />
                      <Waarde
                        titel="Sessie-ID"
                        waarde={String(rij.id)}
                        kopieerbaar
                        mono
                      />
                    </dl>

                    {rij.foutmelding ? (
                      <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-red-700">
                          Foutmelding
                        </p>
                        <p className="mt-1 break-words text-sm text-red-900">
                          {rij.foutmelding}
                        </p>
                      </div>
                    ) : null}

                    {rij.momentopname ? (
                      <details
                        className="mt-3 rounded-xl border border-slate-200 bg-slate-50"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <summary className="cursor-pointer px-3 py-2 text-xs font-black text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          Momentopname bekijken
                        </summary>
                        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 bg-slate-950 p-3 text-[11px] text-slate-100">
                          {JSON.stringify(rij.momentopname, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {query.rijen.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">
            {query.aantalTotaal === null
              ? `${query.rijen.length} resultaten geladen`
              : `${query.rijen.length} van ${query.aantalTotaal} resultaten geladen`}
          </p>

          {query.fout ? (
            <button
              type="button"
              onClick={() => {
                void query.opnieuwLaden();
              }}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-800"
            >
              Opnieuw proberen
            </button>
          ) : query.heeftVolgendePagina ? (
            <button
              type="button"
              disabled={query.isVolgendePaginaLaden}
              onClick={() => {
                void query.laadVolgendePagina();
              }}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              {query.isVolgendePaginaLaden
                ? "Resultaten laden..."
                : "Meer resultaten laden"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

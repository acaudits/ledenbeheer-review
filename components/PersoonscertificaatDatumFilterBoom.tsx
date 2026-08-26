"use client";

import { useEffect, useRef, useState } from "react";

type Filterwaarde = {
  waarde: string;
  aantal: number;
};

type Props = {
  waarden: Filterwaarde[];
  zoekwaarde: string;
  isGeselecteerd: (waarde: string) => boolean;
  onWisselen: (waarde: string) => void;
  onMeerdereSelecteren: (waarden: string[], geselecteerd: boolean) => void;
};

type Dag = {
  waarde: string;
  dag: string;
  aantal: number;
};

type Maand = {
  sleutel: string;
  label: string;
  nummer: string;
  dagen: Dag[];
};

type Jaar = {
  jaar: string;
  maanden: Maand[];
};

const MAANDEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

function Selectievak({
  gecontroleerd,
  gedeeltelijk = false,
  label,
  onWijzigen,
}: {
  gecontroleerd: boolean;
  gedeeltelijk?: boolean;
  label: string;
  onWijzigen: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = gedeeltelijk;
    }
  }, [gedeeltelijk]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={gecontroleerd}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      onChange={onWijzigen}
      className="size-3.5 shrink-0 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
    />
  );
}

function groepeerDatums(waarden: Filterwaarde[], zoekwaarde: string) {
  const jaren = new Map<string, Map<string, Dag[]>>();

  for (const item of waarden) {
    const overeenkomst = item.waarde.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!overeenkomst) {
      continue;
    }

    const [, jaar, maand, dag] = overeenkomst;

    const maandIndex = Number(maand) - 1;

    if (maandIndex < 0 || maandIndex >= MAANDEN.length) {
      continue;
    }

    const jaarMaanden = jaren.get(jaar) ?? new Map<string, Dag[]>();

    const dagen = jaarMaanden.get(maand) ?? [];

    dagen.push({
      waarde: item.waarde,
      dag,
      aantal: item.aantal,
    });

    jaarMaanden.set(maand, dagen);
    jaren.set(jaar, jaarMaanden);
  }

  const zoekterm = zoekwaarde.trim().toLocaleLowerCase("nl-BE");

  return Array.from(jaren.entries())
    .sort(([eerste], [tweede]) => tweede.localeCompare(eerste))
    .map(([jaar, maanden]) => {
      const maandRijen = Array.from(maanden.entries())
        .sort(([eerste], [tweede]) => eerste.localeCompare(tweede))
        .map(([maandnummer, dagen]): Maand => {
          const label = MAANDEN[Number(maandnummer) - 1];

          const maandKomtOvereen =
            !zoekterm ||
            jaar.toLocaleLowerCase("nl-BE").includes(zoekterm) ||
            label.includes(zoekterm) ||
            `${jaar}-${maandnummer}`.includes(zoekterm);

          const zichtbareDagen = maandKomtOvereen
            ? dagen
            : dagen.filter((item) => {
                const leesbaar = `${item.dag}/${maandnummer}/${jaar}`;

                return (
                  item.dag.includes(zoekterm) ||
                  item.waarde.includes(zoekterm) ||
                  leesbaar.includes(zoekterm)
                );
              });

          return {
            sleutel: `${jaar}-${maandnummer}`,
            label,
            nummer: maandnummer,
            dagen: zichtbareDagen.sort((eerste, tweede) =>
              eerste.waarde.localeCompare(tweede.waarde),
            ),
          };
        })
        .filter((maand) => maand.dagen.length > 0);

      return {
        jaar,
        maanden: maandRijen,
      };
    })
    .filter((jaar) => jaar.maanden.length > 0);
}

function MaandRij({
  jaar,
  maand,
  zoekActief,
  isGeselecteerd,
  onWisselen,
  onMeerdereSelecteren,
}: {
  jaar: string;
  maand: Maand;
  zoekActief: boolean;
  isGeselecteerd: (waarde: string) => boolean;
  onWisselen: (waarde: string) => void;
  onMeerdereSelecteren: (waarden: string[], geselecteerd: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  const datumwaarden = maand.dagen.map((dag) => dag.waarde);

  const geselecteerdAantal = datumwaarden.filter(isGeselecteerd).length;

  const volledig =
    datumwaarden.length > 0 && geselecteerdAantal === datumwaarden.length;

  const gedeeltelijk = geselecteerdAantal > 0 && !volledig;

  const zichtbaar = open || zoekActief;

  return (
    <div>
      <div className="flex items-center gap-1 px-1 py-1 hover:bg-slate-50">
        <button
          type="button"
          onClick={() => setOpen((huidig) => !huidig)}
          className="flex size-5 shrink-0 items-center justify-center rounded text-xs font-black text-slate-500 hover:bg-slate-200"
          aria-label={
            zichtbaar ? `${maand.label} sluiten` : `${maand.label} openen`
          }
        >
          {zichtbaar ? "−" : "+"}
        </button>

        <Selectievak
          gecontroleerd={volledig}
          gedeeltelijk={gedeeltelijk}
          label={`${maand.label} ${jaar} selecteren`}
          onWijzigen={() => onMeerdereSelecteren(datumwaarden, !volledig)}
        />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-w-0 flex-1 text-left text-[11px] font-semibold text-slate-700"
        >
          {maand.label}
        </button>
      </div>

      {zichtbaar ? (
        <div className="ml-3 border-l border-slate-200 pl-5">
          {maand.dagen.map((dag) => (
            <label
              key={dag.waarde}
              className="flex cursor-pointer items-center gap-2 px-1.5 py-1 text-[11px] text-slate-700 hover:bg-emerald-50"
            >
              <Selectievak
                gecontroleerd={isGeselecteerd(dag.waarde)}
                label={`${dag.dag} ${maand.label} ${jaar}`}
                onWijzigen={() => onWisselen(dag.waarde)}
              />

              <span className="min-w-0 flex-1">{dag.dag}</span>

              <span className="shrink-0 text-[9px] font-semibold text-slate-400">
                {dag.aantal}
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function JaarRij({
  rij,
  standaardOpen,
  zoekActief,
  isGeselecteerd,
  onWisselen,
  onMeerdereSelecteren,
}: {
  rij: Jaar;
  standaardOpen: boolean;
  zoekActief: boolean;
  isGeselecteerd: (waarde: string) => boolean;
  onWisselen: (waarde: string) => void;
  onMeerdereSelecteren: (waarden: string[], geselecteerd: boolean) => void;
}) {
  const [open, setOpen] = useState(standaardOpen);

  const datumwaarden = rij.maanden.flatMap((maand) =>
    maand.dagen.map((dag) => dag.waarde),
  );

  const geselecteerdAantal = datumwaarden.filter(isGeselecteerd).length;

  const volledig =
    datumwaarden.length > 0 && geselecteerdAantal === datumwaarden.length;

  const gedeeltelijk = geselecteerdAantal > 0 && !volledig;

  const zichtbaar = open || zoekActief;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-1 px-1 py-1 hover:bg-slate-50">
        <button
          type="button"
          onClick={() => setOpen((huidig) => !huidig)}
          className="flex size-5 shrink-0 items-center justify-center rounded text-xs font-black text-slate-500 hover:bg-slate-200"
          aria-label={zichtbaar ? `${rij.jaar} sluiten` : `${rij.jaar} openen`}
        >
          {zichtbaar ? "−" : "+"}
        </button>

        <Selectievak
          gecontroleerd={volledig}
          gedeeltelijk={gedeeltelijk}
          label={`${rij.jaar} selecteren`}
          onWijzigen={() => onMeerdereSelecteren(datumwaarden, !volledig)}
        />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-w-0 flex-1 text-left text-[11px] font-bold text-slate-800"
        >
          {rij.jaar}
        </button>
      </div>

      {zichtbaar ? (
        <div className="ml-3 border-l border-slate-200 pl-2">
          {rij.maanden.map((maand) => (
            <MaandRij
              key={maand.sleutel}
              jaar={rij.jaar}
              maand={maand}
              zoekActief={zoekActief}
              isGeselecteerd={isGeselecteerd}
              onWisselen={onWisselen}
              onMeerdereSelecteren={onMeerdereSelecteren}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PersoonscertificaatDatumFilterBoom({
  waarden,
  zoekwaarde,
  isGeselecteerd,
  onWisselen,
  onMeerdereSelecteren,
}: Props) {
  const boom = groepeerDatums(waarden, zoekwaarde);

  const legeWaarde = waarden.find((item) => item.waarde === "");

  const zoekActief = zoekwaarde.trim().length > 0;

  return (
    <div>
      {legeWaarde ? (
        <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-emerald-50">
          <Selectievak
            gecontroleerd={isGeselecteerd("")}
            label="Lege cellen"
            onWijzigen={() => onWisselen("")}
          />

          <span className="min-w-0 flex-1">(Lege cellen)</span>

          <span className="shrink-0 text-[9px] font-semibold text-slate-400">
            {legeWaarde.aantal}
          </span>
        </label>
      ) : null}

      {boom.length === 0 ? (
        <p className="px-2 py-3 text-center text-[11px] text-slate-500">
          Geen datums gevonden.
        </p>
      ) : (
        boom.map((rij, index) => (
          <JaarRij
            key={rij.jaar}
            rij={rij}
            standaardOpen={index === 0}
            zoekActief={zoekActief}
            isGeselecteerd={isGeselecteerd}
            onWisselen={onWisselen}
            onMeerdereSelecteren={onMeerdereSelecteren}
          />
        ))
      )}
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { vereisMachtiging } from "@/lib/auth";
import {
  laadTotaalOverzicht,
  type DeskcontroleTargetRij,
  type TerreincontroleTargetRij,
} from "@/lib/totaal-overzicht";

export const dynamic = "force-dynamic";

const getalFormatter = new Intl.NumberFormat("nl-BE");

function formatteerGetal(waarde: number) {
  return getalFormatter.format(waarde);
}

function formatteerGemiddelde(waarde: number) {
  return waarde.toLocaleString("nl-BE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type OverzichtKaartProps = {
  label: string;
  waarde: string;
  toelichting?: string;
  benadrukt?: boolean;
};

function OverzichtKaart({
  label,
  waarde,
  toelichting,
  benadrukt = false,
}: OverzichtKaartProps) {
  return (
    <article
      className={
        benadrukt
          ? "rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <p
        className={
          benadrukt
            ? "text-xs font-bold uppercase tracking-wide text-emerald-800"
            : "text-xs font-bold uppercase tracking-wide text-slate-500"
        }
      >
        {label}
      </p>

      <p
        className={
          benadrukt
            ? "mt-1 text-3xl font-black tabular-nums text-emerald-950"
            : "mt-1 text-3xl font-black tabular-nums text-slate-950"
        }
      >
        {waarde}
      </p>

      {toelichting ? (
        <p
          className={
            benadrukt
              ? "mt-1 text-xs text-emerald-800"
              : "mt-1 text-xs text-slate-500"
          }
        >
          {toelichting}
        </p>
      ) : null}
    </article>
  );
}

function LegeLijst({ type }: { type: "desk" | "terrein" }) {
  return (
    <div className="p-6 text-center text-sm text-slate-500">
      Alle persoonscertificaten hebben het target voor {type}controles bereikt.
    </div>
  );
}

type KaartVeldProps = {
  label: string;
  waarde: string;
  benadrukt?: boolean;
};

function KaartVeld({ label, waarde, benadrukt = false }: KaartVeldProps) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={
          benadrukt
            ? "mt-0.5 text-sm font-black tabular-nums text-red-700"
            : "mt-0.5 text-sm font-bold tabular-nums text-slate-900"
        }
      >
        {waarde}
      </dd>
    </div>
  );
}

function TerreincontroleTabel({
  rijen,
}: {
  rijen: TerreincontroleTargetRij[];
}) {
  return (
    <section
      aria-labelledby="terreincontrolelijst-titel"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-3 py-2.5">
        <h2
          id="terreincontrolelijst-titel"
          className="text-sm font-bold text-slate-950"
        >
          Top 20 terreincontroles
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Grootste resterende tekorten.
        </p>
      </div>

      {rijen.length === 0 ? (
        <LegeLijst type="terrein" />
      ) : (
        <ol className="space-y-1.5 p-2">
          {rijen.map((rij) => (
            <li
              key={rij.ovamId}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,0.7fr))] sm:items-center">
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <dt className="sr-only">Naam persoonscertificaat</dt>
                  <dd className="break-words text-sm font-bold leading-tight text-slate-950">
                    {rij.naamPersoonscertificaat}
                  </dd>
                  <dt className="sr-only">OVAM-ID</dt>
                  <dd className="mt-0.5 break-all text-[11px] font-medium text-slate-500">
                    {rij.ovamId}
                  </dd>
                </div>

                <KaartVeld
                  label="Attesten"
                  waarde={formatteerGetal(rij.aantalAttesten)}
                />

                <KaartVeld
                  label="Ingepland"
                  waarde={formatteerGetal(rij.aantalIngeplandeTerreincontroles)}
                />

                <KaartVeld
                  label="Na-finalisaties"
                  waarde={formatteerGetal(rij.aantalNaFinalisaties)}
                />

                <KaartVeld
                  label="Nog nodig"
                  waarde={formatteerGetal(rij.aantalNogNodig)}
                  benadrukt
                />
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DeskcontroleTabel({ rijen }: { rijen: DeskcontroleTargetRij[] }) {
  return (
    <section
      aria-labelledby="deskcontrolelijst-titel"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-3 py-2.5">
        <h2
          id="deskcontrolelijst-titel"
          className="text-sm font-bold text-slate-950"
        >
          Top 20 deskcontroles
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Grootste resterende tekorten.
        </p>
      </div>

      {rijen.length === 0 ? (
        <LegeLijst type="desk" />
      ) : (
        <ol className="space-y-1.5 p-2">
          {rijen.map((rij) => (
            <li
              key={rij.ovamId}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,0.7fr))] sm:items-center">
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <dt className="sr-only">Naam persoonscertificaat</dt>
                  <dd className="break-words text-sm font-bold leading-tight text-slate-950">
                    {rij.naamPersoonscertificaat}
                  </dd>
                  <dt className="sr-only">OVAM-ID</dt>
                  <dd className="mt-0.5 break-all text-[11px] font-medium text-slate-500">
                    {rij.ovamId}
                  </dd>
                </div>

                <KaartVeld
                  label="Attesten"
                  waarde={formatteerGetal(rij.aantalAttesten)}
                />

                <KaartVeld
                  label="Deskcontroles"
                  waarde={formatteerGetal(rij.aantalDeskcontroles)}
                />

                <KaartVeld
                  label="Nog nodig"
                  waarde={formatteerGetal(rij.aantalNogNodig)}
                  benadrukt
                />
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function TotaalOverzichtPage() {
  await vereisMachtiging("CERTIFICATEN_BEKIJKEN");

  const overzicht = await laadTotaalOverzicht();

  return (
    <div className="space-y-5">
      <PageHeader
        titel="Totaal overzicht"
        beschrijving="Actuele planning van desk- en terreincontroles."
      />

      <section
        aria-label="Totalen"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <OverzichtKaart
          label="Nog uit te voeren deskcontroles"
          waarde={formatteerGetal(overzicht.totaalDeskcontrolesNogNodig)}
          toelichting="Target: 5% van het aantal attesten"
        />

        <OverzichtKaart
          label="Nog uit te voeren terreincontroles"
          waarde={formatteerGetal(overzicht.totaalTerreincontrolesNogNodig)}
          toelichting="Ingepland en na-finalisaties meegerekend"
        />

        <OverzichtKaart
          label="Totaal aantal attesten"
          waarde={formatteerGetal(overzicht.totaalAantalAttesten)}
        />

        <OverzichtKaart
          label="Resterende werkdagen"
          waarde={formatteerGetal(overzicht.resterendeWerkdagen)}
          toelichting="Tot en met 31 december"
        />
      </section>

      <section
        aria-label="Benodigde controles per werkdag"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <OverzichtKaart
          label="Deskcontroles per werkdag"
          waarde={formatteerGemiddelde(overzicht.deskcontrolesPerWerkdag)}
          toelichting="Gemiddeld benodigd om het target tegen het jaareinde te behalen"
          benadrukt
        />

        <OverzichtKaart
          label="Terreincontroles per werkdag"
          waarde={formatteerGemiddelde(overzicht.terreincontrolesPerWerkdag)}
          toelichting="Gemiddeld benodigd om het target tegen het jaareinde te behalen"
          benadrukt
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <TerreincontroleTabel rijen={overzicht.topTerreincontroles} />
        <DeskcontroleTabel rijen={overzicht.topDeskcontroles} />
      </div>
    </div>
  );
}

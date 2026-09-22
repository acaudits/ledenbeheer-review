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

function TerreincontroleTabel({
  rijen,
}: {
  rijen: TerreincontroleTargetRij[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-bold text-slate-950">Top 20 terreincontroles</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Persoonscertificaten met het grootste resterende tekort.
        </p>
      </div>

      {rijen.length === 0 ? (
        <LegeLijst type="terrein" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <caption className="sr-only">
              Top 20 persoonscertificaten die nog terreincontroles nodig hebben
            </caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-3 text-left">
                  Naam persoonscertificaat
                </th>
                <th scope="col" className="px-3 py-3 text-left">
                  OVAM-ID
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Aantal attesten
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Ingeplande terreincontroles
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Na-finalisaties
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Nog nodig
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rijen.map((rij) => (
                <tr key={rij.ovamId} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {rij.naamPersoonscertificaat}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {rij.ovamId}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatteerGetal(rij.aantalAttesten)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatteerGetal(rij.aantalIngeplandeTerreincontroles)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatteerGetal(rij.aantalNaFinalisaties)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-red-700">
                    {formatteerGetal(rij.aantalNogNodig)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DeskcontroleTabel({ rijen }: { rijen: DeskcontroleTargetRij[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-bold text-slate-950">Top 20 deskcontroles</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Persoonscertificaten met het grootste resterende tekort.
        </p>
      </div>

      {rijen.length === 0 ? (
        <LegeLijst type="desk" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[650px] w-full text-sm">
            <caption className="sr-only">
              Top 20 persoonscertificaten die nog deskcontroles nodig hebben
            </caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-3 text-left">
                  Naam persoonscertificaat
                </th>
                <th scope="col" className="px-3 py-3 text-left">
                  OVAM-ID
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Aantal attesten
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Deskcontroles
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Nog nodig
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rijen.map((rij) => (
                <tr key={rij.ovamId} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {rij.naamPersoonscertificaat}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {rij.ovamId}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatteerGetal(rij.aantalAttesten)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatteerGetal(rij.aantalDeskcontroles)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-red-700">
                    {formatteerGetal(rij.aantalNogNodig)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      <OverzichtKaart
        label="Terreincontroles per werkdag"
        waarde={formatteerGemiddelde(overzicht.terreincontrolesPerWerkdag)}
        toelichting="Gemiddeld benodigd om het target tegen het jaareinde te behalen"
        benadrukt
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <TerreincontroleTabel rijen={overzicht.topTerreincontroles} />
        <DeskcontroleTabel rijen={overzicht.topDeskcontroles} />
      </div>
    </div>
  );
}

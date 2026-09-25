import { DashboardControlelijst } from "@/components/DashboardControlelijst";
import {
  ControleMaandkalender,
  type KalenderDagTelling,
} from "@/components/ControleMaandkalender";
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

type DagplanningKaartProps = {
  label: string;
  waarde: string;
  toelichting: string;
  soort: "deskcontroles" | "terreincontroles";
  tellingen: readonly KalenderDagTelling[];
  naFinalisatieTellingen?: readonly KalenderDagTelling[];
  vandaag: string;
};

function DagplanningKaart({
  label,
  waarde,
  toelichting,
  soort,
  tellingen,
  naFinalisatieTellingen,
  vandaag,
}: DagplanningKaartProps) {
  return (
    <article className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 shadow-sm">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(140px,0.42fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
            {label}
          </p>

          <p className="mt-1 text-3xl font-black tabular-nums text-emerald-950">
            {waarde}
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {toelichting}
          </p>
        </div>

        <ControleMaandkalender
          soort={soort}
          tellingen={tellingen}
          naFinalisatieTellingen={naFinalisatieTellingen}
          vandaag={vandaag}
        />
      </div>
    </article>
  );
}

function TerreincontroleTabel({
  rijen,
}: {
  rijen: TerreincontroleTargetRij[];
}) {
  return (
    <DashboardControlelijst
      soort="terrein"
      rijen={rijen}
    />
  );
}

function DeskcontroleTabel({
  rijen,
}: {
  rijen: DeskcontroleTargetRij[];
}) {
  return (
    <DashboardControlelijst
      soort="desk"
      rijen={rijen}
    />
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
        secundaireActieTekst="Export naar Excel"
        secundaireActieHref="/atteststatistieken/export"
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
          toelichting="Weekends, feestdagen en kerstvakantie 19–31 december uitgesloten"
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <DagplanningKaart
            label="Terreincontroles per werkdag"
            waarde={formatteerGemiddelde(overzicht.terreincontrolesPerWerkdag)}
            toelichting="Gemiddeld benodigd om het target tegen het jaareinde te behalen"
            soort="terreincontroles"
            tellingen={overzicht.terreincontrolesPerDatum}
            naFinalisatieTellingen={overzicht.naFinalisatiesPerDatum}
            vandaag={overzicht.vandaag}
          />

          <TerreincontroleTabel rijen={overzicht.topTerreincontroles} />
        </div>

        <div className="space-y-3">
          <DagplanningKaart
            label="Deskcontroles per werkdag"
            waarde={formatteerGemiddelde(overzicht.deskcontrolesPerWerkdag)}
            toelichting="Gemiddeld benodigd om het target tegen het jaareinde te behalen"
            soort="deskcontroles"
            tellingen={overzicht.deskcontrolesPerDatum}
            vandaag={overzicht.vandaag}
          />

          <DeskcontroleTabel rijen={overzicht.topDeskcontroles} />
        </div>
      </div>
    </div>
  );
}

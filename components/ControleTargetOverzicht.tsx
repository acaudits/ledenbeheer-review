type TargetStatus =
  | "GRIJS"
  | "FEL_ROOD"
  | "ROOD"
  | "ORANJE"
  | "GEEL"
  | "GROEN"
  | "PAARS";

type Props = {
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalTerreincontroles: number;
  aantalNaFinalisaties: number;
  inOpvolging: boolean;
};

type StatusStijl = {
  kaart: string;
  label: string;
  cijfer: string;
  badge: string;
  balk: string;
};

function statusStijlen(
  status: TargetStatus,
): StatusStijl {
  switch (status) {
    case "FEL_ROOD":
      return {
        kaart: "border-[#92400e] bg-[#fff7ed]",
        label: "text-[#78350f]",
        cijfer: "text-[#451a03]",
        badge: "border-[#92400e] bg-[#f5e6d3] text-[#78350f]",
        balk: "bg-[#92400e]",
      };

    case "ROOD":
      return {
        kaart: "border-red-200 bg-red-50",
        label: "text-red-700",
        cijfer: "text-red-950",
        badge: "border-red-200 bg-red-100 text-red-800",
        balk: "bg-red-500",
      };

    case "ORANJE":
      return {
        kaart: "border-orange-200 bg-orange-50",
        label: "text-orange-700",
        cijfer: "text-orange-950",
        badge: "border-orange-200 bg-orange-100 text-orange-900",
        balk: "bg-orange-500",
      };

    case "GEEL":
      return {
        kaart: "border-amber-200 bg-amber-50",
        label: "text-amber-700",
        cijfer: "text-amber-950",
        badge: "border-amber-200 bg-amber-100 text-amber-900",
        balk: "bg-amber-500",
      };

    case "GROEN":
      return {
        kaart: "border-emerald-200 bg-emerald-50",
        label: "text-emerald-700",
        cijfer: "text-emerald-950",
        badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
        balk: "bg-emerald-600",
      };

    case "PAARS":
      return {
        kaart: "border-purple-200 bg-purple-50",
        label: "text-purple-700",
        cijfer: "text-purple-950",
        badge: "border-purple-200 bg-purple-100 text-purple-900",
        balk: "bg-purple-600",
      };

    default:
      return {
        kaart: "border-slate-200 bg-slate-50",
        label: "text-slate-500",
        cijfer: "text-slate-800",
        badge: "border-slate-200 bg-slate-100 text-slate-600",
        balk: "bg-slate-400",
      };
  }
}

function bepaalOverzichtStatus({
  aantalAttesten,
  aantalDeskcontroles,
  aantalTerreincontroles,
  aantalNaFinalisaties,
  deskcontroleTarget,
  terreincontroleTarget,
  inOpvolging,
}: {
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalTerreincontroles: number;
  aantalNaFinalisaties: number;
  deskcontroleTarget: number;
  terreincontroleTarget: number;
  inOpvolging: boolean;
}): TargetStatus {
  if (aantalAttesten === 0) {
    return "GRIJS";
  }

  if (inOpvolging) {
    return "FEL_ROOD";
  }

  if (
    aantalTerreincontroles === 0 &&
    aantalNaFinalisaties === 0
  ) {
    return "ROOD";
  }

  if (aantalDeskcontroles === 0) {
    return "ORANJE";
  }

  const deskcontroleBehaald =
    aantalDeskcontroles >= deskcontroleTarget;

  if (
    deskcontroleBehaald &&
    aantalTerreincontroles >= terreincontroleTarget
  ) {
    return "GROEN";
  }

  if (
    deskcontroleBehaald &&
    aantalNaFinalisaties > 0 &&
    aantalTerreincontroles + aantalNaFinalisaties >=
      terreincontroleTarget
  ) {
    return "PAARS";
  }

  return "GEEL";
}

function statusTitel(status: TargetStatus) {
  switch (status) {
    case "FEL_ROOD":
      return "Open sanctie-opvolging";

    case "ROOD":
      return "Geen terreincontrole of na-finalisatie";

    case "ORANJE":
      return "Geen deskcontrole";

    case "GROEN":
      return "Alle controletargets behaald";

    case "PAARS":
      return "Target behaald dankzij na-finalisatie";

    case "GEEL":
      return "Controletargets nog niet volledig behaald";

    default:
      return "Geen attesten";
  }
}

function statusUitleg(status: TargetStatus) {
  switch (status) {
    case "FEL_ROOD":
      return "Voor dit OVAM-ID bestaat minstens één open sanctie-opvolging.";

    case "ROOD":
      return "Er is nog geen terreincontrole en geen registratie na finalisatie.";

    case "ORANJE":
      return "Er is nog geen deskcontrole voor dit persoonscertificaat.";

    case "GROEN":
      return "Het deskcontroletarget en het terreincontroletarget zijn met echte terreincontroles behaald.";

    case "PAARS":
      return "Het terreincontroletarget is behaald doordat minstens één registratie na finalisatie meetelt.";

    case "GEEL":
      return "Er zijn controles aanwezig, maar nog niet alle targets zijn behaald.";

    default:
      return "Atteststatistieken bevat voor dit persoonscertificaat geen attesten.";
  }
}

function TargetKaart({
  titel,
  uitleg,
  uitgevoerd,
  target,
  status,
  details,
}: {
  titel: string;
  uitleg: string;
  uitgevoerd: number;
  target: number;
  status: TargetStatus;
  details?: {
    label: string;
    waarde: number | string;
  }[];
}) {
  const stijlen = statusStijlen(status);
  const ontbrekend = Math.max(0, target - uitgevoerd);

  const voortgang =
    target > 0
      ? Math.min(
          100,
          Math.round((uitgevoerd / target) * 100),
        )
      : 0;

  const badgeTekst =
    status === "GRIJS"
      ? "Geen target"
      : uitgevoerd >= target
        ? "Target behaald"
        : `${ontbrekend} nog nodig`;

  return (
    <article
      className={`rounded-2xl border p-5 ${stijlen.kaart}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-[0.14em] ${stijlen.label}`}
          >
            {titel}
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${stijlen.cijfer}`}
          >
            {uitgevoerd}
            <span className="ml-1 text-base font-semibold opacity-60">
              / {target}
            </span>
          </p>
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${stijlen.badge}`}
        >
          {badgeTekst}
        </span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full transition-all ${stijlen.balk}`}
          style={{
            width: `${voortgang}%`,
          }}
        />
      </div>

      {details && details.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="rounded-lg border border-white/80 bg-white/60 px-3 py-2"
            >
              <dt className="font-medium text-slate-500">
                {detail.label}
              </dt>

              <dd className="mt-0.5 font-bold text-slate-900">
                {detail.waarde}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-medium text-slate-600">
          <span>Uitgevoerd: {uitgevoerd}</span>
          <span>Target: {target}</span>
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-slate-600">
        {uitleg}
      </p>
    </article>
  );
}

export function ControleTargetOverzicht({
  aantalAttesten,
  aantalDeskcontroles,
  aantalTerreincontroles,
  aantalNaFinalisaties,
  inOpvolging,
}: Props) {
  const deskcontroleTarget =
    aantalAttesten > 0
      ? Math.ceil(aantalAttesten * 0.05)
      : 0;

  const terreincontroleTarget =
    aantalAttesten > 0
      ? Math.min(4, Math.ceil(aantalAttesten / 100))
      : 0;

  const gecombineerdeTerreincontroles =
    aantalTerreincontroles + aantalNaFinalisaties;

  const overzichtStatus =
    bepaalOverzichtStatus({
      aantalAttesten,
      aantalDeskcontroles,
      aantalTerreincontroles,
      aantalNaFinalisaties,
      deskcontroleTarget,
      terreincontroleTarget,
      inOpvolging,
    });

  const deskcontroleStatus: TargetStatus =
    aantalAttesten === 0
      ? "GRIJS"
      : aantalDeskcontroles === 0
        ? "ORANJE"
        : aantalDeskcontroles >= deskcontroleTarget
          ? "GROEN"
          : "GEEL";

  const terreincontroleStatus: TargetStatus =
    aantalAttesten === 0
      ? "GRIJS"
      : gecombineerdeTerreincontroles === 0
        ? "ROOD"
        : aantalTerreincontroles >= terreincontroleTarget
          ? "GROEN"
          : aantalNaFinalisaties > 0 &&
              gecombineerdeTerreincontroles >= terreincontroleTarget
            ? "PAARS"
            : "GEEL";

  const overzichtStijlen =
    statusStijlen(overzichtStatus);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Controleplanning
        </p>

        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Attesten en controletargets
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Het deskcontroletarget is 5% van het aantal
              attesten, naar boven afgerond. Het
              terreincontroletarget is één per begonnen reeks
              van 100 attesten, met een maximum van vier.
              Geregistreerde na-finalisaties tellen mee voor
              het terreincontroletarget.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:min-w-48">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Attesten
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">
              {aantalAttesten}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Volgens Atteststatistieken
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-6 py-6 sm:px-8">
        <div
          className={`rounded-2xl border px-5 py-4 ${overzichtStijlen.kaart}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`font-bold ${overzichtStijlen.cijfer}`}>
                {statusTitel(overzichtStatus)}
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {statusUitleg(overzichtStatus)}
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${overzichtStijlen.badge}`}
            >
              {overzichtStatus === "FEL_ROOD"
                ? "In opvolging"
                : overzichtStatus.charAt(0) +
                  overzichtStatus.slice(1).toLowerCase()}
            </span>
          </div>

          <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Attesten", aantalAttesten],
              [
                "Deskcontrole",
                `${aantalDeskcontroles}/${deskcontroleTarget}`,
              ],
              [
                "Terreincontrole",
                `${aantalTerreincontroles}/${terreincontroleTarget}`,
              ],
              ["Na finalisatie", aantalNaFinalisaties],
              ["In opvolging", inOpvolging ? "Ja" : "Nee"],
            ].map(([label, waarde]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-white/80 bg-white/60 px-3 py-2"
              >
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </dt>

                <dd className="mt-1 text-sm font-bold text-slate-900">
                  {waarde}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TargetKaart
            titel="Deskcontroles"
            uitleg="Vijf procent van het aantal attesten, altijd naar boven afgerond."
            uitgevoerd={aantalDeskcontroles}
            target={deskcontroleTarget}
            status={deskcontroleStatus}
          />

          <TargetKaart
            titel="Terreincontroles"
            uitleg="Eén terreincontrole per begonnen reeks van 100 attesten, met een maximum van vier. Na-finalisaties tellen mee voor dit target."
            uitgevoerd={gecombineerdeTerreincontroles}
            target={terreincontroleTarget}
            status={terreincontroleStatus}
            details={[
              {
                label: "Echte terreincontroles",
                waarde: aantalTerreincontroles,
              },
              {
                label: "Na finalisatie",
                waarde: aantalNaFinalisaties,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

type TargetStatus =
  | "GRIJS"
  | "ROOD"
  | "GEEL"
  | "GROEN";

type Props = {
  aantalAttesten: number;
  aantalDeskcontroles: number;
  aantalTerreincontroles: number;
};

function bepaalTargetStatus(
  aantalAttesten: number,
  uitgevoerd: number,
  target: number,
): TargetStatus {
  if (
    aantalAttesten === 0 ||
    target === 0
  ) {
    return "GRIJS";
  }

  if (uitgevoerd === 0) {
    return "ROOD";
  }

  if (uitgevoerd >= target) {
    return "GROEN";
  }

  return "GEEL";
}

function statusStijlen(
  status: TargetStatus,
) {
  switch (status) {
    case "ROOD":
      return {
        kaart:
          "border-red-200 bg-red-50",
        label:
          "text-red-700",
        cijfer:
          "text-red-950",
        badge:
          "border-red-200 bg-red-100 text-red-800",
        balk:
          "bg-red-500",
      };

    case "GEEL":
      return {
        kaart:
          "border-amber-200 bg-amber-50",
        label:
          "text-amber-700",
        cijfer:
          "text-amber-950",
        badge:
          "border-amber-200 bg-amber-100 text-amber-900",
        balk:
          "bg-amber-500",
      };

    case "GROEN":
      return {
        kaart:
          "border-emerald-200 bg-emerald-50",
        label:
          "text-emerald-700",
        cijfer:
          "text-emerald-950",
        badge:
          "border-emerald-200 bg-emerald-100 text-emerald-800",
        balk:
          "bg-emerald-600",
      };

    default:
      return {
        kaart:
          "border-slate-200 bg-slate-50",
        label:
          "text-slate-500",
        cijfer:
          "text-slate-800",
        badge:
          "border-slate-200 bg-slate-100 text-slate-600",
        balk:
          "bg-slate-400",
      };
  }
}

function statusTekst(
  status: TargetStatus,
  ontbrekend: number,
) {
  switch (status) {
    case "ROOD":
      return `${ontbrekend} nog nodig`;

    case "GEEL":
      return `${ontbrekend} nog nodig`;

    case "GROEN":
      return "Target behaald";

    default:
      return "Geen target";
  }
}

function TargetKaart({
  titel,
  uitleg,
  aantalAttesten,
  uitgevoerd,
  target,
}: {
  titel: string;
  uitleg: string;
  aantalAttesten: number;
  uitgevoerd: number;
  target: number;
}) {
  const status =
    bepaalTargetStatus(
      aantalAttesten,
      uitgevoerd,
      target,
    );

  const stijlen =
    statusStijlen(status);

  const ontbrekend =
    Math.max(
      0,
      target - uitgevoerd,
    );

  const voortgang =
    target > 0
      ? Math.min(
          100,
          Math.round(
            (uitgevoerd /
              target) *
              100,
          ),
        )
      : 0;

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
          {statusTekst(
            status,
            ontbrekend,
          )}
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

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-medium text-slate-600">
        <span>
          Uitgevoerd: {uitgevoerd}
        </span>

        <span>
          Target: {target}
        </span>
      </div>

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
}: Props) {
  const deskcontroleTarget =
    aantalAttesten > 0
      ? Math.ceil(
          aantalAttesten * 0.05,
        )
      : 0;

  const terreincontroleTarget =
    aantalAttesten > 0
      ? Math.min(
          4,
          Math.ceil(
            aantalAttesten / 100,
          ),
        )
      : 0;

  const deskcontroleStatus =
    bepaalTargetStatus(
      aantalAttesten,
      aantalDeskcontroles,
      deskcontroleTarget,
    );

  const terreincontroleStatus =
    bepaalTargetStatus(
      aantalAttesten,
      aantalTerreincontroles,
      terreincontroleTarget,
    );

  const beideBehaald =
    aantalAttesten > 0 &&
    deskcontroleStatus ===
      "GROEN" &&
    terreincontroleStatus ===
      "GROEN";

  const nietsUitgevoerd =
    aantalAttesten > 0 &&
    (
      aantalDeskcontroles ===
        0 ||
      aantalTerreincontroles ===
        0
    );

  const overzichtStijl =
    aantalAttesten === 0
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : beideBehaald
        ? "border-emerald-200 bg-emerald-100 text-emerald-900"
        : nietsUitgevoerd
          ? "border-red-200 bg-red-100 text-red-900"
          : "border-amber-200 bg-amber-100 text-amber-950";

  const overzichtTitel =
    aantalAttesten === 0
      ? "Geen attestactiviteit"
      : beideBehaald
        ? "Alle controletargets behaald"
        : nietsUitgevoerd
          ? "Controles ontbreken"
          : "Controletargets nog niet volledig behaald";

  const overzichtTekst =
    aantalAttesten === 0
      ? "Lijst 1 van Atteststatistieken bevat voor dit persoonscertificaat geen opgemaakte attesten."
      : beideBehaald
        ? "Zowel het vereiste aantal deskcontroles als terreincontroles is uitgevoerd."
        : "Bekijk hieronder hoeveel deskcontroles en terreincontroles nog nodig zijn.";

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
              Het aantal attesten komt uit
              Atteststatistieken, Lijst 1.
              Het deskcontroletarget is 5%,
              naar boven afgerond. Het
              terreincontroletarget is één
              per begonnen reeks van 100
              attesten, met een maximum van
              vier.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:min-w-48">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Opgemaakte attesten
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">
              {aantalAttesten}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Volgens Lijst 1
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-6 py-6 sm:px-8">
        <div
          className={`rounded-2xl border px-5 py-4 ${overzichtStijl}`}
        >
          <p className="font-bold">
            {overzichtTitel}
          </p>

          <p className="mt-1 text-sm">
            {overzichtTekst}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TargetKaart
            titel="Deskcontroles"
            uitleg="Vijf procent van het aantal opgemaakte attesten, altijd naar boven afgerond."
            aantalAttesten={
              aantalAttesten
            }
            uitgevoerd={
              aantalDeskcontroles
            }
            target={
              deskcontroleTarget
            }
          />

          <TargetKaart
            titel="Terreincontroles"
            uitleg="Eén terreincontrole per begonnen reeks van 100 attesten, met een maximum van vier."
            aantalAttesten={
              aantalAttesten
            }
            uitgevoerd={
              aantalTerreincontroles
            }
            target={
              terreincontroleTarget
            }
          />
        </div>
      </div>
    </section>
  );
}

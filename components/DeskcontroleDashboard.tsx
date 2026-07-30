"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type DashboardRij = {
  id: number;
  status?: string | number | null;
  deadlineSanctie?:
    | string
    | number
    | null;
  deadlineCorrectie?:
    | string
    | number
    | null;
};

type DeskcontroleDashboardProps = {
  rijen: DashboardRij[];
};

type DashboardFilter = {
  sleutel: string;
  label: string;
  ids: number[];
};

const DASHBOARD_FILTER_EVENT =
  "deskcontrole-dashboard-filter";

function normaliseerStatus(
  waarde: unknown,
) {
  return String(waarde ?? "")
    .trim()
    .toLocaleLowerCase(
      "nl-BE",
    );
}

function ontleedDatum(
  waarde: unknown,
) {
  const tekst = String(
    waarde ?? "",
  ).trim();

  const gevonden = tekst.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );

  if (!gevonden) {
    return null;
  }

  const dag =
    Number(gevonden[1]);

  const maand =
    Number(gevonden[2]);

  const jaar =
    Number(gevonden[3]);

  const tijdstip = Date.UTC(
    jaar,
    maand - 1,
    dag,
  );

  const datum =
    new Date(tijdstip);

  if (
    datum.getUTCFullYear() !==
      jaar ||
    datum.getUTCMonth() !==
      maand - 1 ||
    datum.getUTCDate() !== dag
  ) {
    return null;
  }

  return tijdstip;
}

function vandaagUtc() {
  const vandaag =
    new Date();

  return Date.UTC(
    vandaag.getFullYear(),
    vandaag.getMonth(),
    vandaag.getDate(),
  );
}

function verschilInDagen(
  tijdstip: number,
) {
  return Math.ceil(
    (tijdstip - vandaagUtc()) /
      (1000 * 60 * 60 * 24),
  );
}

function isAfgehandeldeStatus(
  status: string,
) {
  return (
    status === "afgerond" ||
    status === "geactualiseerd"
  );
}

function heeftVerstrekenDeadline(
  rij: DashboardRij,
) {
  const status =
    normaliseerStatus(
      rij.status,
    );

  if (
    isAfgehandeldeStatus(
      status,
    )
  ) {
    return false;
  }

  const deadlines = [
    ontleedDatum(
      rij.deadlineSanctie,
    ),
    ontleedDatum(
      rij.deadlineCorrectie,
    ),
  ].filter(
    (
      tijdstip,
    ): tijdstip is number =>
      tijdstip !== null,
  );

  return deadlines.some(
    (tijdstip) =>
      verschilInDagen(
        tijdstip,
      ) < 0,
  );
}

function heeftDeadlineBinnenZevenDagen(
  rij: DashboardRij,
) {
  const status =
    normaliseerStatus(
      rij.status,
    );

  if (
    isAfgehandeldeStatus(
      status,
    )
  ) {
    return false;
  }

  /*
   * Een record met een verstreken
   * deadline telt alleen mee bij
   * Verstreken.
   */
  if (
    heeftVerstrekenDeadline(
      rij,
    )
  ) {
    return false;
  }

  const deadlines = [
    ontleedDatum(
      rij.deadlineSanctie,
    ),
    ontleedDatum(
      rij.deadlineCorrectie,
    ),
  ].filter(
    (
      tijdstip,
    ): tijdstip is number =>
      tijdstip !== null,
  );

  return deadlines.some(
    (tijdstip) => {
      const verschil =
        verschilInDagen(
          tijdstip,
        );

      return (
        verschil >= 0 &&
        verschil <= 7
      );
    },
  );
}

function DashboardKaart({
  titel,
  aantal,
  actief,
  kleur,
  onClick,
}: {
  titel: string;
  aantal: number;
  actief: boolean;
  kleur:
    | "emerald"
    | "amber"
    | "sky"
    | "slate"
    | "orange"
    | "red";
  onClick: () => void;
}) {
  const stijlen = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100",
    amber:
      "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100",
    sky:
      "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-400 hover:bg-sky-100",
    slate:
      "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-400 hover:bg-slate-100",
    orange:
      "border-orange-200 bg-orange-50 text-orange-950 hover:border-orange-400 hover:bg-orange-100",
    red:
      "border-red-200 bg-red-50 text-red-950 hover:border-red-400 hover:bg-red-100",
  }[kleur];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${stijlen} ${
        actief
          ? "ring-2 ring-emerald-700 ring-offset-2"
          : ""
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {titel}
      </p>

      <p className="mt-2 text-3xl font-black">
        {aantal}
      </p>

      <p className="mt-2 text-[11px] font-semibold opacity-70">
        {actief
          ? "Klik om filter te wissen"
          : "Klik om de lijst te filteren"}
      </p>
    </button>
  );
}

export function DeskcontroleDashboard({
  rijen,
}: DeskcontroleDashboardProps) {
  const [
    actieveFilter,
    setActieveFilter,
  ] = useState<
    string | null
  >(null);

  const filters =
    useMemo(() => {
      const afgerond =
        rijen.filter(
          (rij) =>
            normaliseerStatus(
              rij.status,
            ) === "afgerond",
        );

      const inOpmaak =
        rijen.filter(
          (rij) =>
            normaliseerStatus(
              rij.status,
            ) === "in opmaak",
        );

      const geactualiseerd =
        rijen.filter(
          (rij) =>
            normaliseerStatus(
              rij.status,
            ) ===
            "geactualiseerd",
        );

      const openstaand =
        rijen.filter(
          (rij) =>
            normaliseerStatus(
              rij.status,
            ) === "geen",
        );

      const binnenZevenDagen =
        rijen.filter(
          heeftDeadlineBinnenZevenDagen,
        );

      const verstreken =
        rijen.filter(
          heeftVerstrekenDeadline,
        );

      return [
        {
          sleutel: "afgerond",
          label:
            "Totaal afgerond",
          kleur:
            "emerald" as const,
          rijen: afgerond,
        },
        {
          sleutel: "in-opmaak",
          label:
            "Totaal in opmaak",
          kleur:
            "amber" as const,
          rijen: inOpmaak,
        },
        {
          sleutel:
            "geactualiseerd",
          label:
            "Totaal geactualiseerd",
          kleur:
            "sky" as const,
          rijen:
            geactualiseerd,
        },
        {
          sleutel:
            "openstaand",
          label:
            "Totaal openstaande",
          kleur:
            "slate" as const,
          rijen: openstaand,
        },
        {
          sleutel:
            "binnen-zeven-dagen",
          label:
            "Binnen 7 dagen",
          kleur:
            "orange" as const,
          rijen:
            binnenZevenDagen,
        },
        {
          sleutel:
            "verstreken",
          label: "Verstreken",
          kleur: "red" as const,
          rijen: verstreken,
        },
      ];
    }, [rijen]);

  useEffect(() => {
    function verwerkReset(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<
          DashboardFilter | null
        >;

      if (
        customEvent.detail ===
        null
      ) {
        setActieveFilter(
          null,
        );
      }
    }

    window.addEventListener(
      DASHBOARD_FILTER_EVENT,
      verwerkReset,
    );

    return () => {
      window.removeEventListener(
        DASHBOARD_FILTER_EVENT,
        verwerkReset,
      );
    };
  }, []);

  function activeerFilter(
    filter:
      (typeof filters)[number],
  ) {
    if (
      actieveFilter ===
      filter.sleutel
    ) {
      setActieveFilter(
        null,
      );

      window.dispatchEvent(
        new CustomEvent(
          DASHBOARD_FILTER_EVENT,
          {
            detail: null,
          },
        ),
      );

      return;
    }

    const detail:
      DashboardFilter = {
      sleutel:
        filter.sleutel,
      label: filter.label,
      ids: filter.rijen.map(
        (rij) => Number(rij.id),
      ),
    };

    setActieveFilter(
      filter.sleutel,
    );

    window.dispatchEvent(
      new CustomEvent(
        DASHBOARD_FILTER_EVENT,
        {
          detail,
        },
      ),
    );
  }

  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {filters.map(
          (filter) => (
            <DashboardKaart
              key={
                filter.sleutel
              }
              titel={filter.label}
              aantal={
                filter.rijen.length
              }
              actief={
                actieveFilter ===
                filter.sleutel
              }
              kleur={
                filter.kleur
              }
              onClick={() =>
                activeerFilter(
                  filter,
                )
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

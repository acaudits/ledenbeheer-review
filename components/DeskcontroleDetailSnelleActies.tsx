"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  wijzigDeskcontroleSelectievak,
  wijzigDeskcontroleStatus,
  type DeskcontroleSelectievak,
} from "@/app/deskcontroles/snelle-acties";

type DeskcontroleStatus =
  | "GEEN"
  | "IN_OPMAAK"
  | "GEACTUALISEERD"
  | "AFGEROND";

type DeskcontroleDetailSnelleActiesProps = {
  id: number;
  status: DeskcontroleStatus;
  mailSanctieVerzonden: boolean;
  mailCorrectieVerzonden: boolean;
  voorwaardelijkeOpheffing: boolean;
};

type Bericht = {
  succes: boolean;
  tekst: string;
} | null;

const statussen: {
  waarde: DeskcontroleStatus;
  label: string;
}[] = [
  {
    waarde: "GEEN",
    label: "Geen",
  },
  {
    waarde: "IN_OPMAAK",
    label: "In opmaak",
  },
  {
    waarde: "GEACTUALISEERD",
    label: "Geactualiseerd",
  },
  {
    waarde: "AFGEROND",
    label: "Afgerond",
  },
];

export function DeskcontroleDetailSnelleActies({
  id,
  status,
  mailSanctieVerzonden,
  mailCorrectieVerzonden,
  voorwaardelijkeOpheffing,
}: DeskcontroleDetailSnelleActiesProps) {
  const router =
    useRouter();

  const [
    bezig,
    startTransition,
  ] =
    useTransition();

  const [
    huidigeStatus,
    setHuidigeStatus,
  ] =
    useState(status);

  const [
    selectievakken,
    setSelectievakken,
  ] = useState({
    mailSanctieVerzonden,
    mailCorrectieVerzonden,
    voorwaardelijkeOpheffing,
  });

  const [
    bericht,
    setBericht,
  ] =
    useState<Bericht>(
      null,
    );

  useEffect(() => {
    setHuidigeStatus(
      status,
    );

    setSelectievakken({
      mailSanctieVerzonden,
      mailCorrectieVerzonden,
      voorwaardelijkeOpheffing,
    });
  }, [
    status,
    mailSanctieVerzonden,
    mailCorrectieVerzonden,
    voorwaardelijkeOpheffing,
  ]);

  function vernieuwNaWijziging() {
    router.refresh();

    window.dispatchEvent(
      new Event(
        "meldingen-gewijzigd",
      ),
    );
  }

  function pasStatusAan(
    nieuweStatus:
      DeskcontroleStatus,
  ) {
    const vorigeStatus =
      huidigeStatus;

    setHuidigeStatus(
      nieuweStatus,
    );

    setBericht(null);

    startTransition(
      async () => {
        const resultaat =
          await wijzigDeskcontroleStatus(
            id,
            nieuweStatus,
          );

        if (!resultaat.succes) {
          setHuidigeStatus(
            vorigeStatus,
          );

          setBericht({
            succes: false,
            tekst:
              resultaat.melding ??
              "De status kon niet worden aangepast.",
          });

          return;
        }

        setBericht({
          succes: true,
          tekst:
            resultaat.melding ??
            "De status is aangepast.",
        });

        vernieuwNaWijziging();
      },
    );
  }

  function pasSelectievakAan(
    veld:
      DeskcontroleSelectievak,
    waarde: boolean,
  ) {
    const vorigeWaarde =
      selectievakken[veld];

    setSelectievakken(
      (huidige) => ({
        ...huidige,
        [veld]: waarde,
      }),
    );

    setBericht(null);

    startTransition(
      async () => {
        const resultaat =
          await wijzigDeskcontroleSelectievak(
            id,
            veld,
            waarde,
          );

        if (!resultaat.succes) {
          setSelectievakken(
            (huidige) => ({
              ...huidige,
              [veld]:
                vorigeWaarde,
            }),
          );

          setBericht({
            succes: false,
            tekst:
              resultaat.melding ??
              "De wijziging kon niet worden opgeslagen.",
          });

          return;
        }

        setBericht({
          succes: true,
          tekst:
            resultaat.melding ??
            "De wijziging is opgeslagen.",
        });

        vernieuwNaWijziging();
      },
    );
  }

  return (
    <section
      id="snelle-acties"
      className="scroll-mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Snelle acties
        </p>

        <h2 className="text-lg font-bold text-slate-950">
          Deskcontrole bijwerken
        </h2>

        <p className="text-sm text-slate-600">
          Wijzig de meest gebruikte velden zonder het volledige bewerkformulier te openen.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div>
          <label
            htmlFor={`snelle-status-${id}`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Status
          </label>

          <select
            id={`snelle-status-${id}`}
            value={huidigeStatus}
            disabled={bezig}
            onChange={(event) =>
              pasStatusAan(
                event.target
                  .value as DeskcontroleStatus,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-wait disabled:opacity-60"
          >
            {statussen.map(
              (optie) => (
                <option
                  key={optie.waarde}
                  value={optie.waarde}
                >
                  {optie.label}
                </option>
              ),
            )}
          </select>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={
              selectievakken
                .mailSanctieVerzonden
            }
            disabled={bezig}
            onChange={(event) =>
              pasSelectievakAan(
                "mailSanctieVerzonden",
                event.target.checked,
              )
            }
            className="size-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />

          Mail sanctie verzonden
        </label>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={
              selectievakken
                .mailCorrectieVerzonden
            }
            disabled={bezig}
            onChange={(event) =>
              pasSelectievakAan(
                "mailCorrectieVerzonden",
                event.target.checked,
              )
            }
            className="size-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />

          Mail correctie verzonden
        </label>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={
              selectievakken
                .voorwaardelijkeOpheffing
            }
            disabled={bezig}
            onChange={(event) =>
              pasSelectievakAan(
                "voorwaardelijkeOpheffing",
                event.target.checked,
              )
            }
            className="size-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />

          Voorwaardelijke opheffing
        </label>
      </div>

      <div
        aria-live="polite"
        className="mt-4 min-h-5"
      >
        {bezig ? (
          <p className="text-sm font-medium text-slate-600">
            Wijziging opslaan...
          </p>
        ) : bericht ? (
          <p
            className={
              bericht.succes
                ? "text-sm font-semibold text-emerald-800"
                : "text-sm font-semibold text-red-700"
            }
          >
            {bericht.tekst}
          </p>
        ) : null}
      </div>
    </section>
  );
}

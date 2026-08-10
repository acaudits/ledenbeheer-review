"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DESKCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useDeskcontrolesQuery";
import {
  wijzigDeskcontroleSelectievak,
  wijzigDeskcontroleStatus,
  type DeskcontroleSelectievak,
} from "@/app/deskcontroles/snelle-acties";

type DeskcontroleStatusSelectProps = {
  id: number;
  waarde: string;
};

type DeskcontroleSelectievakProps = {
  id: number;
  veld: DeskcontroleSelectievak;
  waarde: string | boolean | null;
  label: string;
};

const statusOpties = [
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


function normaliseerStatus(
  waarde: string,
) {
  const genormaliseerd =
    waarde
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

  if (
    genormaliseerd ===
    "AFGEROND"
  ) {
    return "AFGEROND";
  }

  if (
    genormaliseerd ===
    "IN_OPMAAK"
  ) {
    return "IN_OPMAAK";
  }

  if (
    genormaliseerd ===
    "GEACTUALISEERD"
  ) {
    return "GEACTUALISEERD";
  }

  return "GEEN";
}


function normaliseerBoolean(
  waarde: string | boolean | null,
) {
  if (typeof waarde === "boolean") {
    return waarde;
  }

  const tekst = String(waarde ?? "")
    .trim()
    .toLocaleLowerCase("nl-BE");

  return (
    tekst === "ja" ||
    tekst === "true" ||
    tekst === "1"
  );
}

export function DeskcontroleStatusSelect({
  id,
  waarde,
}: DeskcontroleStatusSelectProps) {
  const router = useRouter();
  const queryClient =
    useQueryClient();

  const genormaliseerdeWaarde =
    normaliseerStatus(waarde);

  const [status, setStatus] = useState(
    genormaliseerdeWaarde,
  );

  const [foutmelding, setFoutmelding] =
    useState("");

  const [isBezig, startTransition] =
    useTransition();

  function wijzigStatus(
    nieuweStatus: string,
  ) {
    const vorigeStatus = status;

    setStatus(nieuweStatus);
    setFoutmelding("");

    startTransition(async () => {
      try {
        const resultaat =
          await wijzigDeskcontroleStatus(
            id,
            nieuweStatus,
          );

        if (!resultaat.succes) {
          setStatus(vorigeStatus);
          setFoutmelding(
            resultaat.melding ??
              "De status kon niet worden aangepast.",
          );
          return;
        }

        await queryClient.invalidateQueries({
          queryKey:
            DESKCONTROLES_QUERY_SLEUTEL,
        });

        router.refresh();
      } catch (fout) {
        setStatus(vorigeStatus);
        setFoutmelding(
          fout instanceof Error
            ? fout.message
            : "De status kon niet worden aangepast.",
        );
      }
    });
  }

  return (
    <div className="flex min-w-36 flex-col gap-1">
      <select
        value={status}
        onChange={(event) =>
          wijzigStatus(event.target.value)
        }
        disabled={isBezig}
        aria-label={`Status van deskcontrole ${id}`}
        className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-slate-100"
      >
        {statusOpties.map((optie) => (
          <option
            key={optie.waarde}
            value={optie.waarde}
          >
            {optie.label}
          </option>
        ))}
      </select>

      {isBezig ? (
        <span className="text-[10px] text-slate-500">
          Opslaan...
        </span>
      ) : null}

      {foutmelding ? (
        <span
          role="alert"
          className="max-w-48 text-[10px] text-red-700"
        >
          {foutmelding}
        </span>
      ) : null}
    </div>
  );
}

export function DeskcontroleSelectievak({
  id,
  veld,
  waarde,
  label,
}: DeskcontroleSelectievakProps) {
  const router = useRouter();
  const queryClient =
    useQueryClient();

  const [aangevinkt, setAangevinkt] =
    useState(normaliseerBoolean(waarde));

  const [foutmelding, setFoutmelding] =
    useState("");

  const [isBezig, startTransition] =
    useTransition();

  function wijzigSelectievak() {
    const vorigeWaarde = aangevinkt;
    const nieuweWaarde = !aangevinkt;

    setAangevinkt(nieuweWaarde);
    setFoutmelding("");

    startTransition(async () => {
      try {
        const resultaat =
          await wijzigDeskcontroleSelectievak(
            id,
            veld,
            nieuweWaarde,
          );

        if (!resultaat.succes) {
          setAangevinkt(vorigeWaarde);
          setFoutmelding(
            resultaat.melding ??
              "De wijziging kon niet worden opgeslagen.",
          );
          return;
        }

        await queryClient.invalidateQueries({
          queryKey:
            DESKCONTROLES_QUERY_SLEUTEL,
        });

        router.refresh();
      } catch (fout) {
        setAangevinkt(vorigeWaarde);
        setFoutmelding(
          fout instanceof Error
            ? fout.message
            : "De wijziging kon niet worden opgeslagen.",
        );
      }
    });
  }

  return (
    <div className="flex min-w-24 flex-col gap-1">
      <label
        className={[
          "inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
          isBezig
            ? "cursor-wait opacity-60"
            : "cursor-pointer",
          aangevinkt
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
        ].join(" ")}
      >
        <input
          type="checkbox"
          checked={aangevinkt}
          onChange={wijzigSelectievak}
          disabled={isBezig}
          aria-label={label}
          className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
        />

        <span>
          {isBezig
            ? "Opslaan..."
            : aangevinkt
              ? "Ja"
              : "Nee"}
        </span>
      </label>

      {foutmelding ? (
        <span
          role="alert"
          className="max-w-48 text-[10px] text-red-700"
        >
          {foutmelding}
        </span>
      ) : null}
    </div>
  );
}


"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  wijzigTerreincontroleFactuur,
  wijzigTerreincontroleStatus,
} from "@/app/terreincontroles/snelle-acties";

type TerreincontroleStatus =
  | "GEARCHIVEERD_ATTEST"
  | "ACTUEEL_ATTEST"
  | "IN_OPMAAK"
  | null;

type StatusSelectProps = {
  id: number;
  beginwaarde:
    TerreincontroleStatus;
};

type FactuurSelectProps = {
  id: number;
  beginwaarde: boolean;
};

export function TerreincontroleStatusSelect({
  id,
  beginwaarde,
}: StatusSelectProps) {
  const [
    status,
    setStatus,
  ] = useState<
    TerreincontroleStatus
  >(beginwaarde);

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  const [fout, setFout] =
    useState("");

  function wijzigStatus(
    waarde: string,
  ) {
    const vorigeStatus =
      status;

    const nieuweStatus:
      TerreincontroleStatus =
      waarde === "NULL"
        ? null
        : (waarde as Exclude<
            TerreincontroleStatus,
            null
          >);

    setStatus(
      nieuweStatus,
    );

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await wijzigTerreincontroleStatus(
            id,
            nieuweStatus,
          );

        if (
          !resultaat.succes
        ) {
          setStatus(
            vorigeStatus,
          );

          setFout(
            resultaat.message ??
              "Opslaan mislukt.",
          );
        }
      },
    );
  }

  return (
    <div className="min-w-56">
      <select
        value={
          status ?? "NULL"
        }
        onChange={(event) =>
          wijzigStatus(
            event.target.value,
          )
        }
        disabled={isBezig}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold outline-none focus:border-emerald-600 disabled:cursor-wait disabled:bg-slate-100"
        aria-label="Status terreincontrole"
      >
        <option value="GEARCHIVEERD_ATTEST">
          GEARCHIVEERD_ATTEST
        </option>

        <option value="ACTUEEL_ATTEST">
          ACTUEEL_ATTEST
        </option>

        <option value="IN_OPMAAK">
          IN_OPMAAK
        </option>

        <option value="NULL">
          NULL
        </option>
      </select>

      {isBezig ? (
        <p className="mt-1 text-[10px] text-slate-500">
          Opslaan...
        </p>
      ) : null}

      {fout ? (
        <p className="mt-1 text-[10px] font-semibold text-red-600">
          {fout}
        </p>
      ) : null}
    </div>
  );
}

export function TerreincontroleFactuurSelect({
  id,
  beginwaarde,
}: FactuurSelectProps) {
  const [
    factuurVerzonden,
    setFactuurVerzonden,
  ] = useState(
    beginwaarde,
  );

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  const [fout, setFout] =
    useState("");

  function wijzigFactuur(
    waarde: string,
  ) {
    const vorigeWaarde =
      factuurVerzonden;

    const nieuweWaarde =
      waarde === "JA";

    setFactuurVerzonden(
      nieuweWaarde,
    );

    setFout("");

    startTransition(
      async () => {
        const resultaat =
          await wijzigTerreincontroleFactuur(
            id,
            nieuweWaarde,
          );

        if (
          !resultaat.succes
        ) {
          setFactuurVerzonden(
            vorigeWaarde,
          );

          setFout(
            resultaat.message ??
              "Opslaan mislukt.",
          );
        }
      },
    );
  }

  return (
    <div className="min-w-24">
      <select
        value={
          factuurVerzonden
            ? "JA"
            : "NEE"
        }
        onChange={(event) =>
          wijzigFactuur(
            event.target.value,
          )
        }
        disabled={isBezig}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold outline-none focus:border-emerald-600 disabled:cursor-wait disabled:bg-slate-100"
        aria-label="Factuur verzonden"
      >
        <option value="JA">
          Ja
        </option>

        <option value="NEE">
          Nee
        </option>
      </select>

      {isBezig ? (
        <p className="mt-1 text-[10px] text-slate-500">
          Opslaan...
        </p>
      ) : null}

      {fout ? (
        <p className="mt-1 text-[10px] font-semibold text-red-600">
          {fout}
        </p>
      ) : null}
    </div>
  );
}


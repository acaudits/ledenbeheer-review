"use client";

import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  useState,
  useTransition,
} from "react";

import {
  wijzigTerreincontroleAfgerond,
  wijzigTerreincontroleFactuur,
  wijzigTerreincontroleStatus,
} from "@/app/terreincontroles-inplannen/snelle-acties";
import {
  INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
} from "@/hooks/useIngeplandeTerreincontrolesQuery";

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
  beginwaarde:
    boolean | null;
};

type AfgerondSelectievakProps = {
  id: number;
  beginwaarde: boolean;
};

export function TerreincontroleStatusSelect({
  id,
  beginwaarde,
}: StatusSelectProps) {
  const queryClient =
    useQueryClient();

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

          return;
        }

        await queryClient
          .invalidateQueries({
            queryKey:
              INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
          });
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
  const queryClient =
    useQueryClient();

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

    const nieuweWaarde:
      boolean | null =
      waarde === "JA"
        ? true
        : waarde === "NEE"
          ? false
          : null;

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

          return;
        }

        await queryClient
          .invalidateQueries({
            queryKey:
              INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
          });
      },
    );
  }

  return (
    <div className="min-w-24">
      <select
        value={
          factuurVerzonden ===
          null
            ? "NVT"
            : factuurVerzonden
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

        <option value="NVT">
          NVT
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

export function TerreincontroleAfgerondSelectievak({
  id,
  beginwaarde,
}: AfgerondSelectievakProps) {
  const queryClient =
    useQueryClient();

  const [
    aangevinkt,
    setAangevinkt,
  ] = useState(beginwaarde);

  const [
    fout,
    setFout,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  function wijzigSelectievak() {
    const vorigeWaarde =
      aangevinkt;

    const nieuweWaarde =
      !aangevinkt;

    setAangevinkt(
      nieuweWaarde,
    );

    setFout("");

    startTransition(
      async () => {
        try {
          const resultaat =
            await wijzigTerreincontroleAfgerond(
              id,
              nieuweWaarde,
            );

          if (!resultaat.succes) {
            setAangevinkt(
              vorigeWaarde,
            );

            setFout(
              resultaat.message ??
                "De wijziging kon niet worden opgeslagen.",
            );

            return;
          }

          await queryClient
            .invalidateQueries({
              queryKey:
                INGEPLANDE_TERREINCONTROLES_QUERY_SLEUTEL,
            });
        } catch (fout) {
          setAangevinkt(
            vorigeWaarde,
          );

          setFout(
            fout instanceof Error
              ? fout.message
              : "De wijziging kon niet worden opgeslagen.",
          );
        }
      },
    );
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
          onChange={
            wijzigSelectievak
          }
          disabled={isBezig}
          aria-label={`Afgerond terreincontrole ${id}`}
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

      {fout ? (
        <span
          role="alert"
          className="max-w-48 text-[10px] text-red-700"
        >
          {fout}
        </span>
      ) : null}
    </div>
  );
}


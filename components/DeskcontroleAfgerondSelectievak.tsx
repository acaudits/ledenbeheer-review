"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { wijzigDeskcontroleStatus } from "@/app/deskcontroles/snelle-acties";

type DeskcontroleAfgerondSelectievakProps = {
  id: number;
  afgerond: boolean;
  label: string;
};

export function DeskcontroleAfgerondSelectievak({
  id,
  afgerond,
  label,
}: DeskcontroleAfgerondSelectievakProps) {
  const router = useRouter();

  const [
    aangevinkt,
    setAangevinkt,
  ] = useState(afgerond);

  const [
    foutmelding,
    setFoutmelding,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  useEffect(() => {
    setAangevinkt(afgerond);
  }, [afgerond]);

  function wijzigAfgerond() {
    const vorigeWaarde =
      aangevinkt;

    const nieuweWaarde =
      !aangevinkt;

    setAangevinkt(
      nieuweWaarde,
    );

    setFoutmelding("");

    startTransition(async () => {
      try {
        const resultaat =
          await wijzigDeskcontroleStatus(
            id,
            nieuweWaarde
              ? "AFGEROND"
              : "GEEN",
          );

        if (!resultaat.succes) {
          setAangevinkt(
            vorigeWaarde,
          );

          setFoutmelding(
            resultaat.melding ??
              "De status kon niet worden aangepast.",
          );

          return;
        }

        router.refresh();
      } catch (fout) {
        setAangevinkt(
          vorigeWaarde,
        );

        setFoutmelding(
          fout instanceof Error
            ? fout.message
            : "De status kon niet worden aangepast.",
        );
      }
    });
  }

  return (
    <div
      className="flex min-w-28 flex-col gap-1"
      data-voorkom-rij-navigatie
    >
      <label
        className={[
          "inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
          isBezig
            ? "cursor-wait opacity-60"
            : "cursor-pointer",
          aangevinkt
            ? "border-emerald-300 bg-emerald-100 text-emerald-900"
            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
        ].join(" ")}
      >
        <input
          type="checkbox"
          checked={aangevinkt}
          onChange={
            wijzigAfgerond
          }
          disabled={isBezig}
          aria-label={label}
          className="size-4 rounded border-slate-300 accent-emerald-700 focus:ring-emerald-600"
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

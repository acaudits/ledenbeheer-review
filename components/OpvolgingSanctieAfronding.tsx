"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  wijzigOpvolgingSanctieAfronding,
} from "@/app/opvolging-sancties/actions";

type Auditeur = {
  id: number;
  email: string;
  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
};

type Props = {
  id: number;
  afgerond: boolean;
  datumAfgerond: string;
  afgerondDoorGebruikerId:
    number | null;
  auditeurs: Auditeur[];
  magBeheren: boolean;
};

function auditeurLabel(
  auditeur: Auditeur,
) {
  return (
    [
      auditeur.voornaam,
      auditeur.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    auditeur.naam?.trim() ||
    auditeur.email
  );
}

export function OpvolgingSanctieAfronding({
  id,
  afgerond,
  datumAfgerond,
  afgerondDoorGebruikerId,
  auditeurs,
  magBeheren,
}: Props) {
  const router = useRouter();

  const formulierRef =
    useRef<HTMLFormElement>(null);

  const [isAfgerond, setIsAfgerond] =
    useState(afgerond);

  const [
    toonAfrondingsvelden,
    setToonAfrondingsvelden,
  ] = useState(false);

  const [datum, setDatum] =
    useState(datumAfgerond);

  const [
    verantwoordelijkeId,
    setVerantwoordelijkeId,
  ] = useState(
    afgerondDoorGebruikerId ===
      null
      ? ""
      : String(
          afgerondDoorGebruikerId,
        ),
  );

  const actie =
    wijzigOpvolgingSanctieAfronding.bind(
      null,
      id,
    );

  const [
    status,
    formulierActie,
    isBezig,
  ] = useActionState(actie, {});

  useEffect(() => {
    if (status.succes) {
      router.refresh();
    }
  }, [router, status.succes]);

  function automatischOpslaan({
    volgendeAfgerond =
      isAfgerond,
    volgendeDatum = datum,
    volgendeVerantwoordelijkeId =
      verantwoordelijkeId,
  }: {
    volgendeAfgerond?: boolean;
    volgendeDatum?: string;
    volgendeVerantwoordelijkeId?: string;
  }) {
    const magOpslaan =
      !volgendeAfgerond ||
      (
        volgendeDatum !== "" &&
        volgendeVerantwoordelijkeId !==
          ""
      );

    if (!magOpslaan) {
      return;
    }

    window.setTimeout(() => {
      formulierRef.current
        ?.requestSubmit();
    }, 0);
  }

  if (!magBeheren) {
    return (
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Opvolging afgerond
        </dt>

        <dd className="mt-1">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={afgerond}
              disabled
              readOnly
              className="size-4 rounded border-slate-300 accent-emerald-700"
            />
            <span>
              {afgerond
                ? "Ja"
                : "Nee"}
            </span>
          </label>
        </dd>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Opvolging afgerond
      </dt>

      <dd className="mt-1">
        <form
          ref={formulierRef}
          action={formulierActie}
          className="space-y-1.5"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          <label
            className={`inline-flex min-h-7 cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-xs font-bold transition ${
              isAfgerond
                ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300"
            }`}
          >
            <input
              type="checkbox"
              name="opvolgingAfgerond"
              value="ja"
              checked={isAfgerond}
              disabled={isBezig}
              onChange={(event) => {
                const volgendeAfgerond =
                  event.target.checked;

                setIsAfgerond(
                  volgendeAfgerond,
                );

                setToonAfrondingsvelden(
                  volgendeAfgerond,
                );

                automatischOpslaan({
                  volgendeAfgerond,
                });
              }}
              className="size-4 rounded border-slate-300 accent-emerald-700"
            />

            <span>
              {isAfgerond
                ? "Ja"
                : "Nee"}
            </span>
          </label>

          {isAfgerond &&
          toonAfrondingsvelden &&
          !status.succes ? (
            <div className="grid gap-1.5 rounded-lg border border-emerald-200 bg-white/90 p-1.5">
              <label className="block">
                <span className="sr-only">
                  Datum afgerond
                </span>

                <input
                  type="date"
                  name="datumAfgerond"
                  value={datum}
                  required
                  disabled={isBezig}
                  aria-label="Datum afgerond"
                  onChange={(event) => {
                    const volgendeDatum =
                      event.target.value;

                    setDatum(
                      volgendeDatum,
                    );

                    automatischOpslaan({
                      volgendeDatum,
                    });
                  }}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="sr-only">
                  Afgerond door
                </span>

                <select
                  name="afgerondDoorGebruikerId"
                  value={
                    verantwoordelijkeId
                  }
                  required
                  disabled={isBezig}
                  aria-label="Afgerond door"
                  onChange={(event) => {
                    const volgendeId =
                      event.target.value;

                    setVerantwoordelijkeId(
                      volgendeId,
                    );

                    automatischOpslaan({
                      volgendeVerantwoordelijkeId:
                        volgendeId,
                    });
                  }}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="">
                    Afgerond door...
                  </option>

                  {auditeurs.map(
                    (auditeur) => (
                      <option
                        key={
                          auditeur.id
                        }
                        value={
                          auditeur.id
                        }
                      >
                        {auditeurLabel(
                          auditeur,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
          ) : null}

          {isBezig ? (
            <p
              aria-live="polite"
              className="text-[10px] font-semibold text-slate-500"
            >
              Opslaan...
            </p>
          ) : status.fout ? (
            <p
              role="alert"
              className="text-[10px] font-semibold text-red-700"
            >
              {status.fout}
            </p>
          ) : status.succes ? (
            <p
              aria-live="polite"
              className="text-[10px] font-semibold text-emerald-700"
            >
              Opgeslagen
            </p>
          ) : null}
        </form>
      </dd>
    </div>
  );
}

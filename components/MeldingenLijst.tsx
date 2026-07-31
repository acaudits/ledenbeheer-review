"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Melding = {
  id: number;
  type: string;
  titel: string;
  bericht: string;
  href: string | null;
  gelezenOp: string | null;
  aangemaaktOp: string;
};

type MeldingenAntwoord = {
  meldingen: Melding[];
  aantalOngelezen: number;
};

function formatteerDatumTijd(
  waarde: string,
) {
  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(waarde),
  );
}

export function MeldingenLijst() {
  const router =
    useRouter();

  const [
    gegevens,
    setGegevens,
  ] =
    useState<MeldingenAntwoord | null>(
      null,
    );

  const [
    fout,
    setFout,
  ] =
    useState<string | null>(
      null,
    );

  const [
    bezigId,
    setBezigId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    allesBezig,
    setAllesBezig,
  ] =
    useState(false);

  const laadMeldingen =
    useCallback(
      async () => {
        setFout(null);

        try {
          const antwoord =
            await fetch(
              "/api/meldingen",
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              },
            );

          const resultaat =
            await antwoord
              .json()
              .catch(
                () => null,
              );

          if (
            !antwoord.ok
          ) {
            throw new Error(
              resultaat?.melding ??
                "De meldingen konden niet worden geladen.",
            );
          }

          setGegevens(
            resultaat,
          );
        } catch (fout) {
          setFout(
            fout instanceof
              Error
              ? fout.message
              : "De meldingen konden niet worden geladen.",
          );
        }
      },
      [],
    );

  useEffect(() => {
    void laadMeldingen();
  }, [laadMeldingen]);

  async function pasStatusAan(
    melding: Melding,
    gelezen: boolean,
  ) {
    setBezigId(
      melding.id,
    );

    setFout(null);

    try {
      const antwoord =
        await fetch(
          "/api/meldingen",
          {
            method:
              "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id:
                  melding.id,
                gelezen,
              }),
          },
        );

      const resultaat =
        await antwoord
          .json()
          .catch(
            () => null,
          );

      if (!antwoord.ok) {
        throw new Error(
          resultaat?.melding ??
            "De meldingstatus kon niet worden aangepast.",
        );
      }

      await laadMeldingen();

      window.dispatchEvent(
        new Event(
          "meldingen-gewijzigd",
        ),
      );
    } catch (fout) {
      setFout(
        fout instanceof Error
          ? fout.message
          : "De meldingstatus kon niet worden aangepast.",
      );
    } finally {
      setBezigId(null);
    }
  }

  async function openMelding(
    melding: Melding,
  ) {
    if (
      !melding.gelezenOp
    ) {
      await pasStatusAan(
        melding,
        true,
      );
    }

    if (melding.href) {
      router.push(
        melding.href,
      );
    }
  }

  async function markeerAllesGelezen() {
    setAllesBezig(true);
    setFout(null);

    try {
      const antwoord =
        await fetch(
          "/api/meldingen",
          {
            method:
              "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                alles: true,
              }),
          },
        );

      const resultaat =
        await antwoord
          .json()
          .catch(
            () => null,
          );

      if (!antwoord.ok) {
        throw new Error(
          resultaat?.melding ??
            "De meldingen konden niet worden aangepast.",
        );
      }

      await laadMeldingen();

      window.dispatchEvent(
        new Event(
          "meldingen-gewijzigd",
        ),
      );
    } catch (fout) {
      setFout(
        fout instanceof Error
          ? fout.message
          : "De meldingen konden niet worden aangepast.",
      );
    } finally {
      setAllesBezig(false);
    }
  }

  if (
    !gegevens &&
    !fout
  ) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm font-medium text-slate-500 shadow-sm">
        Meldingen laden...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fout ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {fout}

          <button
            type="button"
            onClick={() =>
              void laadMeldingen()
            }
            className="ml-2 font-bold underline"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600">
          {gegevens?.aantalOngelezen ??
            0}{" "}
          ongelezen
        </p>

        <button
          type="button"
          disabled={
            allesBezig ||
            !gegevens ||
            gegevens.aantalOngelezen ===
              0
          }
          onClick={() =>
            void markeerAllesGelezen()
          }
          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allesBezig
            ? "Bezig..."
            : "Alles als gelezen markeren"}
        </button>
      </div>

      {!gegevens ||
      gegevens.meldingen
        .length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-semibold text-slate-900">
            Geen meldingen
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Er zijn momenteel geen persoonlijke meldingen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gegevens.meldingen.map(
            (melding) => {
              const ongelezen =
                !melding.gelezenOp;

              return (
                <article
                  key={melding.id}
                  className={
                    ongelezen
                      ? "rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm"
                      : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  }
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-slate-950">
                          {melding.titel}
                        </h2>

                        {ongelezen ? (
                          <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
                            Nieuw
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {melding.bericht}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        {formatteerDatumTijd(
                          melding.aangemaaktOp,
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          bezigId ===
                          melding.id
                        }
                        onClick={() =>
                          void pasStatusAan(
                            melding,
                            ongelezen,
                          )
                        }
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {ongelezen
                          ? "Markeer gelezen"
                          : "Markeer ongelezen"}
                      </button>

                      {melding.href ? (
                        <button
                          type="button"
                          disabled={
                            bezigId ===
                            melding.id
                          }
                          onClick={() =>
                            void openMelding(
                              melding,
                            )
                          }
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                        >
                          Open controle
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  useActionState,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
  isGeldigOndernemingsnummer,
  normaliseerOndernemingsnummer,
  ondernemingsnummerFoutmelding,
} from "@/lib/ondernemingsnummer";
import {
  maakProcescertificaatAan,
  type ProcescertificaatFormState,
} from "../actions";

const beginstatus: ProcescertificaatFormState =
  {};

const invoerStijl =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

const labelStijl =
  "block text-sm font-semibold text-slate-700";

function Foutmelding({
  bericht,
}: {
  bericht?: string;
}) {
  if (!bericht) {
    return null;
  }

  return (
    <p className="mt-1.5 text-sm font-medium text-red-600">
      {bericht}
    </p>
  );
}

function OpslaanKnop({
  geblokkeerd,
}: {
  geblokkeerd: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending || geblokkeerd
      }
      className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Bezig met opslaan..."
        : "Procescertificaat opslaan"}
    </button>
  );
}

export default function ProcescertificaatFormulier() {
  const [state, formAction] =
    useActionState(
      maakProcescertificaatAan,
      beginstatus,
    );

  const [
    ondernemingsnummer,
    setOndernemingsnummer,
  ] = useState("");

  const [
    uniekeFouten,
    setUniekeFouten,
  ] = useState<{
    kboNummer?: string;
    certificaatnummer?: string;
  }>({});

  const [
    controleBezig,
    setControleBezig,
  ] = useState<{
    kboNummer?: boolean;
    certificaatnummer?: boolean;
  }>({});

  async function controleerUniek(
    veld:
      | "kboNummer"
      | "certificaatnummer",
    waarde: string,
  ) {
    let opgeschoond = waarde.trim();

    if (!opgeschoond) {
      return;
    }

    if (veld === "kboNummer") {
      opgeschoond =
        normaliseerOndernemingsnummer(
          opgeschoond,
        );

      setOndernemingsnummer(
        opgeschoond,
      );

      if (
        !isGeldigOndernemingsnummer(
          opgeschoond,
        )
      ) {
        setUniekeFouten(
          (vorige) => ({
            ...vorige,
            kboNummer:
              ondernemingsnummerFoutmelding(),
          }),
        );

        return;
      }
    } else {
      opgeschoond =
        opgeschoond.toUpperCase();
    }

    setControleBezig((vorige) => ({
      ...vorige,
      [veld]: true,
    }));

    try {
      const parameters =
        new URLSearchParams({
          veld,
          waarde: opgeschoond,
        });

      const response = await fetch(
        `/api/procescertificaten/controle?${parameters.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Controle mislukt",
        );
      }

      const resultaat =
        (await response.json()) as {
          bestaat: boolean;
          geldig?: boolean;
        };

      setUniekeFouten(
        (vorige) => ({
          ...vorige,
          [veld]:
            resultaat.geldig ===
              false
              ? veld ===
                "kboNummer"
                ? ondernemingsnummerFoutmelding()
                : "Ongeldige waarde."
              : resultaat.bestaat
                ? veld ===
                  "kboNummer"
                  ? "Dit ondernemingsnummer bestaat al."
                  : "Dit certificaatnummer bestaat al."
                : undefined,
        }),
      );
    } catch {
      /*
       * De serveraction controleert
       * opnieuw bij het opslaan.
       */
    } finally {
      setControleBezig(
        (vorige) => ({
          ...vorige,
          [veld]: false,
        }),
      );
    }
  }

  const dubbeleWaarde = Boolean(
    uniekeFouten.kboNummer ||
      uniekeFouten.certificaatnummer,
  );

  const controleLoopt = Boolean(
    controleBezig.kboNummer ||
      controleBezig.certificaatnummer,
  );

  return (
    <form
      action={formAction}
      className="space-y-8"
    >
      {state.message ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.message}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-bold text-slate-900">
          Onderneming
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Vul de gegevens van de
          onderneming in.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="naamBedrijf"
              className={labelStijl}
            >
              Bedrijf *
            </label>

            <input
              id="naamBedrijf"
              name="naamBedrijf"
              required
              autoComplete="organization"
              placeholder="Naam van het bedrijf"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.naamBedrijf
              }
            />
          </div>

          <div>
            <label
              htmlFor="kboNummer"
              className={labelStijl}
            >
              Ondernemingsnummer /
              EU-btw-nummer *
            </label>

            <input
              id="kboNummer"
              name="kboNummer"
              type="text"
              required
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={20}
              value={
                ondernemingsnummer
              }
              placeholder="0803487622 of NL004737565B84"
              className={invoerStijl}
              onChange={(event) => {
                setOndernemingsnummer(
                  event.target.value,
                );

                setUniekeFouten(
                  (vorige) => ({
                    ...vorige,
                    kboNummer:
                      undefined,
                  }),
                );
              }}
              onBlur={(event) => {
                void controleerUniek(
                  "kboNummer",
                  event.currentTarget
                    .value,
                );
              }}
            />

            {controleBezig.kboNummer ? (
              <p className="mt-1.5 text-sm text-emerald-700">
                Ondernemingsnummer
                controleren...
              </p>
            ) : null}

            <Foutmelding
              bericht={
                uniekeFouten.kboNummer ||
                state.errors
                  ?.kboNummer
              }
            />
          </div>

          <div>
            <label
              htmlFor="certificaatnummer"
              className={labelStijl}
            >
              Certificaatnummer *
            </label>

            <input
              id="certificaatnummer"
              name="certificaatnummer"
              required
              autoCapitalize="characters"
              placeholder="Certificaatnummer"
              className={invoerStijl}
              onChange={() => {
                setUniekeFouten(
                  (vorige) => ({
                    ...vorige,
                    certificaatnummer:
                      undefined,
                  }),
                );
              }}
              onBlur={(event) => {
                event.currentTarget.value =
                  event.currentTarget.value
                    .trim()
                    .toUpperCase();

                void controleerUniek(
                  "certificaatnummer",
                  event.currentTarget
                    .value,
                );
              }}
            />

            {controleBezig
              .certificaatnummer ? (
              <p className="mt-1.5 text-sm text-emerald-700">
                Certificaatnummer
                controleren...
              </p>
            ) : null}

            <Foutmelding
              bericht={
                uniekeFouten
                  .certificaatnummer ||
                state.errors
                  ?.certificaatnummer
              }
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold text-slate-900">
          Type onderneming
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Kies één van de twee
          mogelijkheden.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="ondernemingstype"
                value="EENMANSZAAK"
                required
                className="mt-1 h-4 w-4 accent-emerald-700"
              />

              <div>
                <p className="font-semibold text-slate-900">
                  Eenmanszaak
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Zelfstandige zonder
                  aparte rechtspersoon.
                </p>
              </div>
            </div>
          </label>

          <label className="cursor-pointer rounded-2xl border border-slate-300 bg-white p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="ondernemingstype"
                value="BEDRIJF"
                required
                className="mt-1 h-4 w-4 accent-emerald-700"
              />

              <div>
                <p className="font-semibold text-slate-900">
                  Bedrijf
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Vennootschap of andere
                  rechtspersoon.
                </p>
              </div>
            </div>
          </label>
        </div>

        <Foutmelding
          bericht={
            state.errors
              ?.ondernemingstype
          }
        />
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold text-slate-900">
          Certificaatgegevens
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="uitgereiktOp"
              className={labelStijl}
            >
              Uitgereikt op
            </label>

            <input
              id="uitgereiktOp"
              name="uitgereiktOp"
              type="date"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.uitgereiktOp
              }
            />
          </div>

          <div>
            <label
              htmlFor="oneDrive"
              className={labelStijl}
            >
              OneDrive-URL
            </label>

            <input
              id="oneDrive"
              name="oneDrive"
              type="url"
              placeholder="https://..."
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors?.oneDrive
              }
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="opmerking"
              className={labelStijl}
            >
              Opmerking
            </label>

            <textarea
              id="opmerking"
              name="opmerking"
              rows={5}
              maxLength={5000}
              placeholder="Aanvullende informatie..."
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.opmerking
              }
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <a
          href="/procescertificaten"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Annuleren
        </a>

        <OpslaanKnop
          geblokkeerd={
            dubbeleWaarde ||
            controleLoopt
          }
        />
      </div>
    </form>
  );
}

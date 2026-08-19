"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  maakLidAan,
  type LidFormState,
} from "../actions";

const beginstatus: LidFormState = {};

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
      disabled={pending || geblokkeerd}
      className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending ? "Bezig met opslaan..." : "Lid opslaan"}
    </button>
  );
}

export default function LidFormulier({
  bedrijven,
}: {
  bedrijven: string[];
}) {

  const [state, formAction] = useActionState(
    maakLidAan,
    beginstatus,
  );

  const [uniekeFouten, setUniekeFouten] = useState<{
    ovamId?: string;
    certificaatnummer?: string;
  }>({});

  const [controleBezig, setControleBezig] = useState<{
    ovamId?: boolean;
    certificaatnummer?: boolean;
  }>({});

  async function controleerUniek(
    veld: "ovamId" | "certificaatnummer",
    waarde: string,
  ) {
    const opgeschoond = waarde.trim().toUpperCase();

    if (!opgeschoond) {
      return;
    }

    setControleBezig((vorige) => ({
      ...vorige,
      [veld]: true,
    }));

    try {
      const parameters = new URLSearchParams({
        veld,
        waarde: opgeschoond,
      });

      const response = await fetch(
        `/api/persoonscertificaten/controle?${parameters.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Controle mislukt");
      }

      const resultaat = (await response.json()) as {
        bestaat: boolean;
      };

      setUniekeFouten((vorige) => ({
        ...vorige,
        [veld]: resultaat.bestaat
          ? veld === "ovamId"
            ? "Dit OVAM-ID bestaat al."
            : "Dit certificaatnummer bestaat al."
          : undefined,
      }));
    } catch {
      setUniekeFouten((vorige) => ({
        ...vorige,
        [veld]:
          "De controle kon niet worden uitgevoerd. Bij het opslaan wordt opnieuw gecontroleerd.",
      }));
    } finally {
      setControleBezig((vorige) => ({
        ...vorige,
        [veld]: false,
      }));
    }
  }

  const dubbeleWaarde = Boolean(
    uniekeFouten.ovamId ||
      uniekeFouten.certificaatnummer,
  );

  const controleLoopt = Boolean(
    controleBezig.ovamId ||
      controleBezig.certificaatnummer,
  );

  return (
    <form action={formAction} className="space-y-8">
      {state.message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.message}
        </div>
      )}

      <section>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Persoonsgegevens
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Algemene contactgegevens van het lid.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="naamPersoon"
              className={labelStijl}
            >
              Naam persoon *
            </label>

            <input
              id="naamPersoon"
              name="naamPersoon"
              required
              autoComplete="name"
              placeholder="Voornaam en achternaam"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={state.errors?.naamPersoon}
            />
          </div>

          <div>
            <label
              htmlFor="telefoonnummer"
              className={labelStijl}
            >
              Telefoonnummer
            </label>

            <input
              id="telefoonnummer"
              name="telefoonnummer"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+32488907867"
              aria-describedby="telefoonnummer-uitleg"
              className={invoerStijl}
            />

            <p
              id="telefoonnummer-uitleg"
              className="mt-1 text-xs text-slate-500"
            >
              Internationaal formaat, bijvoorbeeld +32488907867.
            </p>

            <Foutmelding
              bericht={
                state.errors
                  ?.telefoonnummer
              }
            />
          </div>

          <div>
            <label
              htmlFor="mailadres"
              className={labelStijl}
            >
              Mailadres
            </label>

            <input
              id="mailadres"
              name="mailadres"
              type="email"
              autoComplete="email"
              placeholder="naam@bedrijf.be"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={state.errors?.mailadres}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Certificatiegegevens
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            OVAM-ID en certificaatnummer moeten uniek zijn.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="ovamId" className={labelStijl}>
              OVAM-ID *
            </label>

            <input
              id="ovamId"
              name="ovamId"
              required
              autoCapitalize="characters"
              placeholder="Bijvoorbeeld OVAM-12345"
              className={invoerStijl}
              onChange={() => {
                setUniekeFouten((vorige) => ({
                  ...vorige,
                  ovamId: undefined,
                }));
              }}
              onBlur={(event) => {
                void controleerUniek(
                  "ovamId",
                  event.currentTarget.value,
                );
              }}
            />

            {controleBezig.ovamId && (
              <p className="mt-1.5 text-sm text-emerald-700">
                OVAM-ID controleren...
              </p>
            )}

            <Foutmelding
              bericht={
                uniekeFouten.ovamId ||
                state.errors?.ovamId
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
                setUniekeFouten((vorige) => ({
                  ...vorige,
                  certificaatnummer: undefined,
                }));
              }}
              onBlur={(event) => {
                void controleerUniek(
                  "certificaatnummer",
                  event.currentTarget.value,
                );
              }}
            />

            {controleBezig.certificaatnummer && (
              <p className="mt-1.5 text-sm text-emerald-700">
                Certificaatnummer controleren...
              </p>
            )}

            <Foutmelding
              bericht={
                uniekeFouten.certificaatnummer ||
                state.errors?.certificaatnummer
              }
            />
          </div>

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
              bericht={state.errors?.uitgereiktOp}
            />
          </div>

          <div>
            <label
              htmlFor="certificatiePlatform"
              className={labelStijl}
            >
              Certificatieplatform
            </label>

            <input
              id="certificatiePlatform"
              name="certificatiePlatform"
              type="url"
              placeholder="https://platform.be/certificaat"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors?.certificatiePlatform
              }
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Bedrijfsgegevens
          </h2>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="bedrijf" className={labelStijl}>
              Bedrijf
            </label>

            <input
  id="bedrijf"
  name="bedrijf"
  list="bedrijven-lijst"
  autoComplete="off"
  placeholder="Begin de bedrijfsnaam te typen..."
  className={invoerStijl}
/>

<datalist id="bedrijven-lijst">
  {bedrijven.map((bedrijf) => (
    <option key={bedrijf} value={bedrijf} />
  ))}
</datalist>

<p className="mt-1.5 text-xs text-slate-500">
  Suggesties komen uit de procescertificaten. Een nieuwe naam invoeren
  blijft mogelijk.
</p>

          </div>

          <div>
            <label
              htmlFor="aansluiting"
              className={labelStijl}
            >
              Aansluiting
            </label>

            <input
              id="aansluiting"
              name="aansluiting"
              placeholder="Aansluiting"
              className={invoerStijl}
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
              placeholder="Aanvullende informatie..."
              className={invoerStijl}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <a
          href="/persoonscertificaten"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Annuleren
        </a>

        <OpslaanKnop
          geblokkeerd={dubbeleWaarde || controleLoopt}
        />
      </div>
    </form>
  );
}

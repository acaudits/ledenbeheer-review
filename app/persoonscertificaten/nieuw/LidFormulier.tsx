"use client";

import Link from "next/link";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { maakLidAan, type LidFormState } from "../actions";

const beginstatus: LidFormState = {};

const invoerStijl =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

const labelStijl = "block text-sm font-semibold text-slate-700";

function Foutmelding({ bericht }: { bericht?: string }) {
  return bericht ? (
    <p className="mt-1.5 text-sm font-medium text-red-600">{bericht}</p>
  ) : null;
}

function OpslaanKnop({ geblokkeerd }: { geblokkeerd: boolean }) {
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

function JaNeeSelect({
  naam,
  label,
  fout,
  onChange,
}: {
  naam: string;
  label: string;
  fout?: string;
  onChange?: (waarde: string) => void;
}) {
  return (
    <div>
      <label htmlFor={naam} className={labelStijl}>
        {label} *
      </label>
      <select
        id={naam}
        name={naam}
        required
        defaultValue=""
        onChange={(event) => onChange?.(event.target.value)}
        className={invoerStijl}
      >
        <option value="">Selecteer</option>
        <option value="JA">Ja</option>
        <option value="NEE">Nee</option>
      </select>
      <Foutmelding bericht={fout} />
    </div>
  );
}

export default function LidFormulier({ bedrijven }: { bedrijven: string[] }) {
  const [state, formAction] = useActionState(maakLidAan, beginstatus);

  const [lidSoort, setLidSoort] = useState<"" | "NIEUW_LID" | "OVERNAME">("");

  const [officieleKlachten, setOfficieleKlachten] = useState("");

  const [uniekeFouten, setUniekeFouten] = useState<{
    ovamId?: string;
    certificaatnummer?: string;
  }>({});

  const [controleBezig, setControleBezig] = useState(false);

  async function controleerUniek(
    veld: "ovamId" | "certificaatnummer",
    waarde: string,
  ) {
    const opgeschoond = waarde.trim().toUpperCase();

    if (!opgeschoond) {
      return;
    }

    setControleBezig(true);

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
          "De controle kon niet worden uitgevoerd. Bij opslaan wordt opnieuw gecontroleerd.",
      }));
    } finally {
      setControleBezig(false);
    }
  }

  const fout = (veld: string) => state.errors?.[veld];

  return (
    <form action={formAction} className="space-y-8">
      {state.message ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.message}
        </div>
      ) : null}

      <fieldset>
        <legend className="text-lg font-bold text-slate-900">
          Type inschrijving *
        </legend>
        <p className="mt-1 text-sm text-slate-500">
          Kies Nieuw lid of Overname.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              waarde: "NIEUW_LID" as const,
              label: "Nieuw lid",
            },
            {
              waarde: "OVERNAME" as const,
              label: "Overname",
            },
          ].map((keuze) => (
            <label
              key={keuze.waarde}
              className={`cursor-pointer rounded-2xl border p-4 ${
                lidSoort === keuze.waarde
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                  : "border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="lidSoort"
                value={keuze.waarde}
                required
                onChange={() => {
                  setLidSoort(keuze.waarde);

                  if (keuze.waarde === "NIEUW_LID") {
                    setOfficieleKlachten("");
                  }
                }}
                className="mr-3 accent-emerald-700"
              />
              <span className="font-bold text-slate-900">{keuze.label}</span>
            </label>
          ))}
        </div>

        <Foutmelding bericht={fout("lidSoort")} />
      </fieldset>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Persoonsgegevens</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="naamPersoon" className={labelStijl}>
              Naam persoon *
            </label>
            <input
              id="naamPersoon"
              name="naamPersoon"
              required
              autoComplete="name"
              className={invoerStijl}
            />
            <Foutmelding bericht={fout("naamPersoon")} />
          </div>

          <div>
            <label htmlFor="telefoonnummer" className={labelStijl}>
              Telefoonnummer
            </label>
            <input
              id="telefoonnummer"
              name="telefoonnummer"
              type="tel"
              autoComplete="tel"
              placeholder="+32488907867"
              className={invoerStijl}
            />
            <Foutmelding bericht={fout("telefoonnummer")} />
          </div>

          <div>
            <label htmlFor="mailadres" className={labelStijl}>
              E-mailadres
            </label>
            <input
              id="mailadres"
              name="mailadres"
              type="email"
              autoComplete="email"
              className={invoerStijl}
            />
            <Foutmelding bericht={fout("mailadres")} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">
          Certificatiegegevens
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="ovamId" className={labelStijl}>
              OVAM-ID *
            </label>
            <input
              id="ovamId"
              name="ovamId"
              required
              onBlur={(event) =>
                controleerUniek("ovamId", event.currentTarget.value)
              }
              onChange={() =>
                setUniekeFouten((vorige) => ({
                  ...vorige,
                  ovamId: undefined,
                }))
              }
              className={invoerStijl}
            />
            <Foutmelding bericht={uniekeFouten.ovamId ?? fout("ovamId")} />
          </div>

          <div>
            <label htmlFor="certificaatnummer" className={labelStijl}>
              Certificaatnummer *
            </label>
            <input
              id="certificaatnummer"
              name="certificaatnummer"
              required
              onBlur={(event) =>
                controleerUniek("certificaatnummer", event.currentTarget.value)
              }
              onChange={() =>
                setUniekeFouten((vorige) => ({
                  ...vorige,
                  certificaatnummer: undefined,
                }))
              }
              className={invoerStijl}
            />
            <Foutmelding
              bericht={
                uniekeFouten.certificaatnummer ?? fout("certificaatnummer")
              }
            />
          </div>

          <div>
            <label htmlFor="uitgereiktOp" className={labelStijl}>
              Uitgereikt op
            </label>
            <input
              id="uitgereiktOp"
              name="uitgereiktOp"
              type="date"
              className={invoerStijl}
            />
            <Foutmelding bericht={fout("uitgereiktOp")} />
          </div>

          <div>
            <label htmlFor="verzekeringVerlooptOp" className={labelStijl}>
              Verzekering verloopt op
            </label>
            <input
              id="verzekeringVerlooptOp"
              name="verzekeringVerlooptOp"
              type="date"
              className={invoerStijl}
            />
            <Foutmelding bericht={fout("verzekeringVerlooptOp")} />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="certificatiePlatform" className={labelStijl}>
              Certificatieplatform
            </label>
            <input
              id="certificatiePlatform"
              name="certificatiePlatform"
              type="url"
              placeholder="https://..."
              className={invoerStijl}
            />
            <Foutmelding bericht={fout("certificatiePlatform")} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">
          Bedrijf en opvolging
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="bedrijf" className={labelStijl}>
              Bedrijf
            </label>
            <input
              id="bedrijf"
              name="bedrijf"
              list="bedrijven"
              className={invoerStijl}
            />
            <datalist id="bedrijven">
              {bedrijven.map((bedrijf) => (
                <option key={bedrijf} value={bedrijf} />
              ))}
            </datalist>
          </div>

          <JaNeeSelect
            naam="aansluiting"
            label="Aansluiting"
            fout={fout("aansluiting")}
          />

          <JaNeeSelect
            naam="praktijkBijscholingGevolgd"
            label="Praktijkbijscholing gevolgd?"
            fout={fout("praktijkBijscholingGevolgd")}
          />

          <JaNeeSelect
            naam="bijscholing2026Gevolgd"
            label="Bijscholing 2026 gevolgd?"
            fout={fout("bijscholing2026Gevolgd")}
          />

          <JaNeeSelect
            naam="begeleidingstraject"
            label="Begeleidingstraject?"
            fout={fout("begeleidingstraject")}
          />
        </div>
      </section>

      {lidSoort === "OVERNAME" ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-950">
            Gegevens overname
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="overgekomenVan" className={labelStijl}>
                Overgekomen van *
              </label>
              <select
                id="overgekomenVan"
                name="overgekomenVan"
                required
                defaultValue=""
                className={invoerStijl}
              >
                <option value="">Selecteer</option>
                <option value="COPRO">Copro</option>
                <option value="DNV">DNV</option>
              </select>
              <Foutmelding bericht={fout("overgekomenVan")} />
            </div>

            <div>
              <label
                htmlFor="aantalAttestenAndereCi2026"
                className={labelStijl}
              >
                Aantal attesten opgesteld bij andere CI in 2026 *
              </label>
              <input
                id="aantalAttestenAndereCi2026"
                name="aantalAttestenAndereCi2026"
                type="number"
                min={0}
                step={1}
                required
                className={invoerStijl}
              />
              <Foutmelding bericht={fout("aantalAttestenAndereCi2026")} />
            </div>

            <div>
              <label
                htmlFor="controleverslagenOvergenomen"
                className={labelStijl}
              >
                Controleverslagen overgenomen?
              </label>
              <select
                id="controleverslagenOvergenomen"
                name="controleverslagenOvergenomen"
                defaultValue=""
                className={invoerStijl}
              >
                <option value="">Niet ingevuld</option>
                <option value="JA">Ja</option>
                <option value="NEE">Nee</option>
              </select>
            </div>

            <JaNeeSelect
              naam="officieleKlachten"
              label="Zijn er officiële klachten?"
              fout={fout("officieleKlachten")}
              onChange={setOfficieleKlachten}
            />

            {officieleKlachten === "JA" ? (
              <div className="md:col-span-2">
                <label
                  htmlFor="officieleKlachtenToelichting"
                  className={labelStijl}
                >
                  Welke officiële klachten? *
                </label>
                <textarea
                  id="officieleKlachtenToelichting"
                  name="officieleKlachtenToelichting"
                  rows={4}
                  required
                  className={invoerStijl}
                />
                <Foutmelding bericht={fout("officieleKlachtenToelichting")} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <label htmlFor="opmerking" className={labelStijl}>
          Opmerking
        </label>
        <textarea
          id="opmerking"
          name="opmerking"
          rows={5}
          placeholder="Aanvullende informatie..."
          className={invoerStijl}
        />
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/persoonscertificaten"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Annuleren
        </Link>

        <OpslaanKnop
          geblokkeerd={
            controleBezig ||
            Boolean(uniekeFouten.ovamId || uniekeFouten.certificaatnummer)
          }
        />
      </div>
    </form>
  );
}

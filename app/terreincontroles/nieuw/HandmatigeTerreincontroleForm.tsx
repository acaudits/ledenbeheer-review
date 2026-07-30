"use client";

import {
  useActionState,
} from "react";

import {
  maakHandmatigeTerreincontrole,
} from "./handmatige-acties";

const AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

const invoerStijl =
  "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const tekstvakStijl =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

type VeldProps = {
  label: string;
  naam: string;
  type?: string;
  verplicht?: boolean;
  placeholder?: string;
  stap?: string;
};

function Veld({
  label,
  naam,
  type = "text",
  verplicht = false,
  placeholder,
  stap,
}: VeldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {verplicht ? " *" : ""}
      </span>

      <input
        type={type}
        name={naam}
        required={verplicht}
        placeholder={placeholder}
        step={stap}
        className={invoerStijl}
      />
    </label>
  );
}

export default function HandmatigeTerreincontroleForm() {
  const [
    status,
    formulierActie,
    isBezig,
  ] = useActionState(
    maakHandmatigeTerreincontrole,
    {
      fout: "",
    },
  );

  return (
    <form
      action={formulierActie}
      className="space-y-8"
    >
      {status.fout ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {status.fout}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-bold text-slate-950">
          Controle
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-sm font-semibold text-slate-700">
              Auditeur *
            </span>

            <select
              name="auditeur"
              required
              defaultValue=""
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Selecteer een auditeur
              </option>

              {AUDITEURS.map(
                (auditeur) => (
                  <option
                    key={auditeur}
                    value={auditeur}
                  >
                    {auditeur}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Status
            </span>

            <select
              name="status"
              defaultValue="NULL"
              className={invoerStijl}
            >
              <option value="NULL">
                NULL
              </option>

              <option value="GEARCHIVEERD_ATTEST">
                GEARCHIVEERD_ATTEST
              </option>

              <option value="ACTUEEL_ATTEST">
                ACTUEEL_ATTEST
              </option>

              <option value="IN_OPMAAK">
                IN_OPMAAK
              </option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Factuur verzonden
            </span>

            <select
              name="factuurVerzonden"
              defaultValue="NEE"
              className={invoerStijl}
            >
              <option value="JA">
                Ja
              </option>

              <option value="NEE">
                Nee
              </option>
            </select>
          </label>

          <Veld
            label="Datum plaatsbezoek"
            naam="datumPlaatsbezoek"
            type="date"
          />

          <Veld
            label="Uur plaatsbezoek"
            naam="uurPlaatsbezoek"
            type="time"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-950">
          Inspectielocatie
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Veld
              label="Inspectielocatie"
              naam="inspectielocatie"
              verplicht
            />
          </div>

          <Veld
            label="Bouwjaar"
            naam="bouwjaar"
            type="number"
          />

          <Veld
            label="Vloeroppervlakte (m²)"
            naam="vloeroppervlakteM2"
            type="number"
            stap="0.01"
          />

          <Veld
            label="Straat"
            naam="straat"
          />

          <Veld
            label="Huisnummer"
            naam="huisnummer"
          />

          <Veld
            label="Postcode"
            naam="postcode"
          />

          <Veld
            label="Gemeente"
            naam="gemeente"
          />

          <div className="md:col-span-2">
            <Veld
              label="Extra adresdetails"
              naam="extraAdresDetails"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-950">
          Asbestdeskundige
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Veld
            label="Deskundige persoons-ID"
            naam="ovamId"
          />

          <Veld
            label="Deskundige naam"
            naam="naamAdi"
          />

          <Veld
            label="Naam asbestdeskundig bedrijf"
            naam="bedrijfsnaam"
          />

          <Veld
            label="Attest-ID"
            naam="attestId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />

          <div className="md:col-span-2">
            <Veld
              label="Deskundige kwaliteitspagina"
              naam="attestUrl"
              type="url"
              placeholder="https://asbestinventaris.ovam.be/..."
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Als de Attest-ID leeg is, wordt deze automatisch uit de OVAM-kwaliteitspagina gehaald.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-950">
          Perceelgegevens
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Veld
            label="Perceel gemeente code"
            naam="perceelGemeenteCode"
          />

          <Veld
            label="Perceel afdelingscode"
            naam="perceelAfdelingscode"
          />

          <Veld
            label="Perceel sectie code"
            naam="perceelSectieCode"
          />
        </div>
      </section>

      <section>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Opmerkingen
          </span>

          <textarea
            name="opmerkingen"
            rows={5}
            maxLength={5000}
            className={tekstvakStijl}
          />
        </label>
      </section>

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <button
          type="submit"
          disabled={isBezig}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isBezig
            ? "Opslaan..."
            : "Terreincontrole opslaan"}
        </button>
      </div>
    </form>
  );
}


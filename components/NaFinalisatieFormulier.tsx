"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  bewerkNaFinalisatie,
  maakNaFinalisatie,
} from "@/app/na-finalisatie/actions";

export type NaFinalisatieFormulierWaarden = {
  auditeur?: string;
  naamAdi?: string | null;
  geregistreerd?: boolean;
  linkAttest?: string;
  attestnummer?: string;
  attestId?: string;
  datumNaFinalisatie?: string;
  plaatsbezoek?: string;
  typeControle?: string;
  reden?: string | null;
  opmerking?: string;
  inspectielocatie?: string | null;
  naamBedrijf?: string | null;
  persoonsId?: string | null;
};

type Props = {
  auditeurs: string[];
  modus?: "nieuw" | "bewerken";
  id?: number;
  waarden?: NaFinalisatieFormulierWaarden;
};

const invoerStijl =
  "mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const tekstvakStijl =
  "mt-1 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function geregistreerdWaarde(
  waarde: boolean | undefined,
) {
  if (waarde === true) {
    return "JA";
  }

  if (waarde === false) {
    return "NEE";
  }

  return "";
}

export function NaFinalisatieFormulier({
  auditeurs,
  modus = "nieuw",
  id,
  waarden,
}: Props) {
  const actie =
    modus === "bewerken" &&
    id
      ? bewerkNaFinalisatie.bind(
          null,
          id,
        )
      : maakNaFinalisatie;

  const [
    status,
    formulierActie,
    isBezig,
  ] = useActionState(
    actie,
    {},
  );

  const [
    typeControle,
    setTypeControle,
  ] = useState(
    waarden?.typeControle ??
      "",
  );

  const redenVerplicht =
    typeControle === "DEELS" ||
    typeControle ===
      "ENKEL_OPENBARE_WEG";

  return (
    <form
      action={formulierActie}
      className="space-y-7"
    >
      {status.fout ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {status.fout}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-black text-slate-950">
          Registratie
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Auditeur *
            <select
              name="auditeur"
              required
              defaultValue={
                waarden?.auditeur ??
                ""
              }
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies een auditeur
              </option>

              {auditeurs.map(
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

          <label className="text-sm font-semibold text-slate-700">
            Geregistreerd? *
            <select
              name="geregistreerd"
              required
              defaultValue={geregistreerdWaarde(
                waarden?.geregistreerd,
              )}
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies Ja of Nee
              </option>

              <option value="JA">
                Ja
              </option>

              <option value="NEE">
                Nee
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Datum na finalisatie *
            <input
              name="datumNaFinalisatie"
              type="date"
              required
              defaultValue={
                waarden?.datumNaFinalisatie ??
                ""
              }
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Plaatsbezoek *
            <select
              name="plaatsbezoek"
              required
              defaultValue={
                waarden?.plaatsbezoek ??
                ""
              }
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies een plaatsbezoek
              </option>

              <option value="SPONTAAN">
                Spontaan
              </option>

              <option value="TELEFONISCHE_AFSPRAAK">
                Telefonische afspraak
              </option>

              <option value="EMAILAFSPRAAK">
                E-mailafspraak
              </option>

              <option value="KLACHT">
                Klacht
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Type controle *
            <select
              name="typeControle"
              required
              value={typeControle}
              onChange={(event) =>
                setTypeControle(
                  event.target.value,
                )
              }
              className={invoerStijl}
            >
              <option
                value=""
                disabled
              >
                Kies een type
              </option>

              <option value="GEHEEL">
                Geheel
              </option>

              <option value="DEELS">
                Deels
              </option>

              <option value="ENKEL_OPENBARE_WEG">
                Enkel van openbare weg
              </option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Naam ADI
            <input
              name="naamAdi"
              maxLength={255}
              defaultValue={
                waarden?.naamAdi ??
                ""
              }
              className={invoerStijl}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-950">
          Attest
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Attestnummer *
            <input
              name="attestnummer"
              required
              maxLength={255}
              defaultValue={
                waarden?.attestnummer ??
                ""
              }
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            ID
            <input
              name="attestId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              defaultValue={
                waarden?.attestId ??
                ""
              }
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Link Attest *
            <input
              name="linkAttest"
              type="url"
              required
              maxLength={2000}
              defaultValue={
                waarden?.linkAttest ??
                ""
              }
              className={invoerStijl}
            />

            <span className="mt-1 block text-xs font-normal text-slate-500">
              Wanneer ID leeg is, wordt de UUID uit deze link gehaald.
            </span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-950">
          Controle-informatie
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            PersoonsID
            <input
              name="persoonsId"
              maxLength={100}
              defaultValue={
                waarden?.persoonsId ??
                ""
              }
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Naam bedrijf
            <input
              name="naamBedrijf"
              maxLength={500}
              defaultValue={
                waarden?.naamBedrijf ??
                ""
              }
              className={invoerStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Inspectielocatie
            <textarea
              name="inspectielocatie"
              rows={3}
              defaultValue={
                waarden?.inspectielocatie ??
                ""
              }
              className={tekstvakStijl}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Reden
            {redenVerplicht
              ? " *"
              : ""}
            <textarea
              name="reden"
              rows={4}
              required={
                redenVerplicht
              }
              maxLength={5000}
              defaultValue={
                waarden?.reden ??
                ""
              }
              className={tekstvakStijl}
            />

            <span className="mt-1 block text-xs font-normal text-slate-500">
              Verplicht bij Deels en Enkel van openbare weg.
            </span>
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Opmerking
            <textarea
              name="opmerking"
              rows={5}
              maxLength={5000}
              defaultValue={
                waarden?.opmerking ??
                ""
              }
              className={tekstvakStijl}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end border-t border-slate-200 pt-5">
        <button
          type="submit"
          disabled={isBezig}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isBezig
            ? "Opslaan..."
            : modus ===
                "bewerken"
              ? "Wijzigingen opslaan"
              : "Registratie opslaan"}
        </button>
      </div>
    </form>
  );
}

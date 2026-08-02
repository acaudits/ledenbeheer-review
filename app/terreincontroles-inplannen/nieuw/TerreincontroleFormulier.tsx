"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  maakTerreincontroleAan,
  type TerreincontroleFormState,
} from "../actions";

import { haalAttestIdUitUrl } from "@/lib/terreincontrole";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";

type LidOptie = {
  id: number;
  naamPersoon: string;
  ovamId: string;
  certificaatnummer: string;
};

type ProcescertificaatOptie = {
  id: number;
  naamBedrijf: string;
  kboNummer: string;
  certificaatnummer: string;
};

type TerreincontroleFormulierProps = {
  leden: LidOptie[];
  procescertificaten:
    ProcescertificaatOptie[];
};

const beginstatus:
  TerreincontroleFormState = {};

const invoerStijl =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

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

function Leesveld({
  label,
  waarde,
  placeholder =
    "Wordt automatisch ingevuld",
}: {
  label: string;
  waarde?: string | null;
  placeholder?: string;
}) {
  return (
    <div>
      <p className={labelStijl}>
        {label}
      </p>

      <div
        className={`mt-1.5 min-h-10 rounded-xl border px-3.5 py-2.5 text-sm ${
          waarde
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-slate-200 bg-slate-50 text-slate-400"
        }`}
      >
        {waarde || placeholder}
      </div>
    </div>
  );
}

function OpslaanKnop() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? "Terreincontrole opslaan..."
        : "Terreincontrole opslaan"}
    </button>
  );
}

export default function TerreincontroleFormulier({
  leden,
  procescertificaten,
}: TerreincontroleFormulierProps) {
  const [
    state,
    formAction,
  ] = useActionState(
    maakTerreincontroleAan,
    beginstatus,
  );

  const [
    geselecteerdeOvamId,
    setGeselecteerdeOvamId,
  ] = useState("");

  const [
    procescertificaatId,
    setProcescertificaatId,
  ] = useState("");

  const [
    attestUrl,
    setAttestUrl,
  ] = useState("");

  const geselecteerdLid =
    useMemo(
      () =>
        leden.find(
          (lid) =>
            lid.ovamId ===
            geselecteerdeOvamId,
        ) ?? null,
      [
        leden,
        geselecteerdeOvamId,
      ],
    );

  const geselecteerdProcescertificaat =
    useMemo(
      () =>
        procescertificaten.find(
          (procescertificaat) =>
            procescertificaat.id ===
            Number(
              procescertificaatId,
            ),
        ) ?? null,
      [
        procescertificaten,
        procescertificaatId,
      ],
    );

  const attestId =
    haalAttestIdUitUrl(
      attestUrl.trim(),
    );

  return (
    <form
      action={formAction}
      className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-bold text-slate-950">
          Algemene gegevens
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Vul de auditeur,
          factuurstatus en attestgegevens
          in.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="auditeur"
              className={labelStijl}
            >
              Auditeur *
            </label>

            <input
              id="auditeur"
              name="auditeur"
              required
              placeholder="Naam van de auditeur"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.auditeur
              }
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className={labelStijl}
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue=""
              className={invoerStijl}
            >
              <option value="">
                Geen status
              </option>

              <option value="IN_OPMAAK">
                In opmaak
              </option>

              <option value="ACTUEEL_ATTEST">
                Actueel attest
              </option>

              <option value="GEARCHIVEERD_ATTEST">
                Gearchiveerd attest
              </option>
            </select>

            <Foutmelding
              bericht={
                state.errors?.status
              }
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="attestUrl"
              className={labelStijl}
            >
              AttestURL *
            </label>

            <input
              id="attestUrl"
              name="attestUrl"
              type="url"
              required
              value={attestUrl}
              onChange={(event) =>
                setAttestUrl(
                  event.target.value,
                )
              }
              placeholder="https://asbestinventaris.ovam.be/asbestinventaris/a0295bbc-6cd3-4c02-b39e-590658978f3c"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.attestUrl
              }
            />
          </div>

          <div className="md:col-span-2">
            <Leesveld
              label="Attest-ID"
              waarde={attestId}
              placeholder={
                attestUrl
                  ? "Geen geldig Attest-ID gevonden"
                  : "Wordt automatisch uit de AttestURL gehaald"
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-white p-4 transition hover:border-emerald-400 hover:bg-emerald-50">
              <input
                type="checkbox"
                name="factuurVerzonden"
                className="mt-0.5 size-4 accent-emerald-700"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Factuur verzonden
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Vink aan wanneer de
                  factuur verzonden is.
                </span>
              </span>
            </label>

            <Foutmelding
              bericht={
                state.errors
                  ?.factuurVerzonden
              }
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold text-slate-950">
          Plaatsbezoek
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="adres"
              className={labelStijl}
            >
              Adres *
            </label>

            <input
              id="adres"
              name="adres"
              required
              placeholder="Straat, nummer, postcode en gemeente"
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors?.adres
              }
            />
          </div>

          <div>
            <label
              htmlFor="datumPlaatsbezoek"
              className={labelStijl}
            >
              Datum plaatsbezoek *
            </label>

            <input
              id="datumPlaatsbezoek"
              name="datumPlaatsbezoek"
              type="date"
              required
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.datumPlaatsbezoek
              }
            />
          </div>

          <div>
            <label
              htmlFor="uurPlaatsbezoek"
              className={labelStijl}
            >
              Uur plaatsbezoek *
            </label>

            <input
              id="uurPlaatsbezoek"
              name="uurPlaatsbezoek"
              type="time"
              required
              className={invoerStijl}
            />

            <Foutmelding
              bericht={
                state.errors
                  ?.uurPlaatsbezoek
              }
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold text-slate-950">
          Persoonscertificaat
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Selecteer de persoon via de
          unieke OVAM-ID.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="ovamId"
              className={labelStijl}
            >
              OVAM-ID *
            </label>

            <select
              id="ovamId"
              name="ovamId"
              required
              value={
                geselecteerdeOvamId
              }
              onChange={(event) =>
                setGeselecteerdeOvamId(
                  event.target.value,
                )
              }
              className={invoerStijl}
            >
              <option value="">
                Selecteer een OVAM-ID
              </option>

              {leden.map((lid) => (
                <option
                  key={lid.id}
                  value={lid.ovamId}
                >
                  {lid.ovamId} —{" "}
                  {lid.naamPersoon} —{" "}
                  {
                    lid.certificaatnummer
                  }
                </option>
              ))}
            </select>

            <Foutmelding
              bericht={
                state.errors?.ovamId
              }
            />
          </div>

          <Leesveld
            label="Naam ADI"
            waarde={
              geselecteerdLid
                ?.naamPersoon
            }
          />

          <Leesveld
            label="Persoonscertificaat"
            waarde={
              geselecteerdLid
                ?.certificaatnummer
            }
          />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold text-slate-950">
          Procescertificaat
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Selecteer het gekoppelde
          bedrijf.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="procescertificaatId"
              className={labelStijl}
            >
              Bedrijfsnaam *
            </label>

            <select
              id="procescertificaatId"
              name="procescertificaatId"
              required
              value={
                procescertificaatId
              }
              onChange={(event) =>
                setProcescertificaatId(
                  event.target.value,
                )
              }
              className={invoerStijl}
            >
              <option value="">
                Selecteer een bedrijf
              </option>

              {procescertificaten.map(
                (procescertificaat) => (
                  <option
                    key={
                      procescertificaat.id
                    }
                    value={
                      procescertificaat.id
                    }
                  >
                    {
                      procescertificaat
                        .naamBedrijf
                    }{" "}
                    —{" "}
                    {
                      procescertificaat
                        .certificaatnummer
                    }
                  </option>
                ),
              )}
            </select>

            <Foutmelding
              bericht={
                state.errors
                  ?.procescertificaatId
              }
            />
          </div>

          <Leesveld
            label="Bedrijfsnaam"
            waarde={
              geselecteerdProcescertificaat
                ?.naamBedrijf
            }
          />

          <Leesveld
            label="Ondernemingsnummer / EU-btw-nummer"
            waarde={
              geselecteerdProcescertificaat
                ? formatteerOndernemingsnummer(
                    geselecteerdProcescertificaat.kboNummer,
                  )
                : ""
            }
          />

          <div className="md:col-span-2">
            <Leesveld
              label="Procescertificaat"
              waarde={
                geselecteerdProcescertificaat
                  ?.certificaatnummer
              }
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold text-slate-950">
          Opmerkingen
        </h2>

        <div className="mt-5">
          <label
            htmlFor="opmerkingen"
            className={labelStijl}
          >
            Opmerkingen
          </label>

          <textarea
            id="opmerkingen"
            name="opmerkingen"
            rows={6}
            maxLength={5000}
            placeholder="Aanvullende informatie over de terreincontrole..."
            className={invoerStijl}
          />

          <Foutmelding
            bericht={
              state.errors
                ?.opmerkingen
            }
          />
        </div>
      </section>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <a
          href="/terreincontroles-inplannen"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Annuleren
        </a>

        <OpslaanKnop />
      </footer>
    </form>
  );
}


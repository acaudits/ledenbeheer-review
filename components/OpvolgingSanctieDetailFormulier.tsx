"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  bewerkOpvolgingSanctieDetail,
} from "@/app/opvolging-sancties/actions";

type Auditeur = {
  id: number;
  label: string;
};

type Waarden = {
  auditeur: string;
  auditeurGebruikerId: number | null;
  naamAdi: string;
  opvolgingAfgerond: boolean;
  datumAfgerond: string;
  afgerondDoorGebruikerId: number | null;
  linkAttest: string;
  attestnummer: string;
  reden: string;
  bedrijfsnaam: string;
  ovamId: string;
  datumVaststelling: string;
  opmerkingen: string;
  ncCategorie: string;
  sanctieBegindatum: string;
  sanctieEinddatum: string;
  sanctieDoorgezet: boolean | null;
  redenNietDoorzetten: string;
};

type Props = {
  id: number;
  auditeurs: Auditeur[];
  waarden: Waarden;
};

const invoer =
  "mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const tekstvak =
  "mt-1 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export function OpvolgingSanctieDetailFormulier({
  id,
  auditeurs,
  waarden,
}: Props) {
  const actie =
    bewerkOpvolgingSanctieDetail.bind(
      null,
      id,
    );

  const [
    status,
    formulierActie,
    isBezig,
  ] = useActionState(
    actie,
    {},
  );

  const [
    afgerond,
    setAfgerond,
  ] = useState(
    waarden.opvolgingAfgerond,
  );

  const [
    categorie,
    setCategorie,
  ] = useState(
    waarden.ncCategorie,
  );

  const [
    sanctieDoorgezet,
    setSanctieDoorgezet,
  ] = useState<
    "" | "ja" | "nee"
  >(
    waarden.sanctieDoorgezet === true ||
      (waarden.sanctieDoorgezet === null &&
        Boolean(
          waarden.sanctieBegindatum ||
            waarden.sanctieEinddatum,
        ))
      ? "ja"
      : waarden.sanctieDoorgezet === false ||
          (waarden.sanctieDoorgezet === null &&
            waarden.redenNietDoorzetten.trim() !== "")
        ? "nee"
        : "",
  );

  const [
    redenNietDoorzetten,
    setRedenNietDoorzetten,
  ] = useState(
    waarden.redenNietDoorzetten,
  );

  return (
    <form
      action={formulierActie}
      className="space-y-7"
    >
      {status.fout ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
        >
          {status.fout}
        </p>
      ) : null}

      {status.succes ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {status.succes}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-black text-slate-950">
          Algemene gegevens
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Auditeur
            <input
              name="auditeur"
              maxLength={500}
              defaultValue={
                waarden.auditeur
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Gekoppelde auditeur
            <select
              name="auditeurGebruikerId"
              defaultValue={
                waarden.auditeurGebruikerId ??
                ""
              }
              className={invoer}
            >
              <option value="">
                Geen koppeling
              </option>

              {auditeurs.map(
                (auditeur) => (
                  <option
                    key={auditeur.id}
                    value={auditeur.id}
                  >
                    {auditeur.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Naam ADI
            <input
              name="naamAdi"
              maxLength={500}
              defaultValue={
                waarden.naamAdi
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Attestnummer
            <input
              name="attestnummer"
              maxLength={255}
              defaultValue={
                waarden.attestnummer
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Bedrijfsnaam
            <input
              name="bedrijfsnaam"
              maxLength={500}
              defaultValue={
                waarden.bedrijfsnaam
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            OVAM-ID
            <input
              name="ovamId"
              maxLength={255}
              defaultValue={
                waarden.ovamId
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-3">
            Link attest
            <input
              name="linkAttest"
              type="url"
              maxLength={2048}
              defaultValue={
                waarden.linkAttest
              }
              className={invoer}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-950">
          Vaststelling en sanctie
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Datum vaststelling *
            <input
              name="datumVaststelling"
              type="date"
              required
              defaultValue={
                waarden.datumVaststelling
              }
              className={invoer}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            NC-categorie *
            <select
              name="ncCategorie"
              required
              value={categorie}
              onChange={(event) => {
                setCategorie(
                  event.target.value,
                );
                setSanctieDoorgezet(
                  "",
                );
                setRedenNietDoorzetten(
                  "",
                );
              }}
              className={invoer}
            >
              {[
                "CAT_0",
                "CAT_1",
                "CAT_2",
                "CAT_3",
                "CAT_4",
              ].map(
                (waarde) => (
                  <option
                    key={waarde}
                    value={waarde}
                  >
                    {waarde.replace(
                      "_",
                      ". ",
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          {categorie === "CAT_1" ||
          categorie === "CAT_2" ? (
            <label className="text-sm font-semibold text-slate-700">
              Wordt de sanctie doorgezet? *
              <select
                name="sanctieDoorgezet"
                required
                value={
                  sanctieDoorgezet
                }
                onChange={(event) => {
                  const waarde =
                    event.target.value as
                      | ""
                      | "ja"
                      | "nee";

                  setSanctieDoorgezet(
                    waarde,
                  );

                  if (
                    waarde !== "nee"
                  ) {
                    setRedenNietDoorzetten(
                      "",
                    );
                  }
                }}
                className={invoer}
              >
                <option value="">
                  Kies een antwoord
                </option>
                <option value="ja">
                  Ja
                </option>
                <option value="nee">
                  Nee
                </option>
              </select>
            </label>
          ) : null}

          {(
            categorie === "CAT_1" ||
            categorie === "CAT_2"
          ) &&
          sanctieDoorgezet ===
            "nee" ? (
            <label className="text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-3">
              Reden niet doorzetten *
              <textarea
                name="redenNietDoorzetten"
                required
                maxLength={10_000}
                value={
                  redenNietDoorzetten
                }
                onChange={(event) => {
                  setRedenNietDoorzetten(
                    event.target.value,
                  );
                }}
                className={tekstvak}
              />
            </label>
          ) : null}

          {(
            categorie === "CAT_1" ||
            categorie === "CAT_2"
          ) &&
          sanctieDoorgezet ===
            "ja" ? (
            <label className="text-sm font-semibold text-slate-700">
              Sanctie begindatum *
              <input
                name="sanctieBegindatum"
                type="date"
                required
                defaultValue={
                  waarden.sanctieBegindatum
                }
                className={invoer}
              />
            </label>
          ) : null}

          {categorie === "CAT_2" &&
          sanctieDoorgezet ===
            "ja" ? (
            <>
              <label className="text-sm font-semibold text-slate-700">
                Sanctie einddatum *
                <input
                  name="sanctieEinddatum"
                  type="date"
                  required
                  defaultValue={
                    waarden.sanctieEinddatum
                  }
                  className={invoer}
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                <input
                  name="ovamPeriodeBevestigd"
                  type="checkbox"
                  required
                  className="size-4 rounded border-slate-300"
                />
                Periode komt overeen met het OVAM-certificatieplatform
              </label>
            </>
          ) : null}

          <label className="text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-3">
            Reden *
            <textarea
              name="reden"
              required
              maxLength={10_000}
              defaultValue={
                waarden.reden
              }
              className={tekstvak}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-3">
            Opmerkingen
            <textarea
              name="opmerkingen"
              maxLength={10_000}
              defaultValue={
                waarden.opmerkingen
              }
              className={tekstvak}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-950">
          Afronding
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            <input
              name="opvolgingAfgerond"
              type="checkbox"
              checked={afgerond}
              onChange={(event) => {
                setAfgerond(
                  event.target.checked,
                );
              }}
              className="size-4 rounded border-slate-300"
            />
            Opvolging afgerond
          </label>

          {afgerond ? (
            <>
              <label className="text-sm font-semibold text-slate-700">
                Datum afgerond *
                <input
                  name="datumAfgerond"
                  type="date"
                  required
                  defaultValue={
                    waarden.datumAfgerond
                  }
                  className={invoer}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Afgerond door *
                <select
                  name="afgerondDoorGebruikerId"
                  required
                  defaultValue={
                    waarden.afgerondDoorGebruikerId ??
                    ""
                  }
                  className={invoer}
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
                        key={auditeur.id}
                        value={auditeur.id}
                      >
                        {auditeur.label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </>
          ) : null}
        </div>
      </section>

      <div className="flex justify-end border-t border-slate-200 pt-5">
        <button
          type="submit"
          disabled={isBezig}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {isBezig
            ? "Opslaan..."
            : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}

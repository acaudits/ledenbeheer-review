"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useState,
  useTransition,
} from "react";

import {
  maakOpvolgingSanctie,
} from "@/app/opvolging-sancties/actions";
import {
  berekenCat1Einddatum,
  formatteerDatumVoorInvoer,
  ncCategorieLabel,
  ontleedDatumInvoer,
  OPVOLGING_NC_CATEGORIEEN,
  type OpvolgingBron,
  type OpvolgingNcCategorieWaarde,
} from "@/lib/opvolging-sancties";

type Props = {
  bronType: OpvolgingBron;
  bronId: number;
  sluitMeerMenu?: () => void;
};

export function OpvolgingSanctieKnop({
  bronType,
  bronId,
  sluitMeerMenu,
}: Props) {
  const [
    dialoogOpen,
    setDialoogOpen,
  ] = useState(false);

  const [
    ncCategorie,
    setNcCategorie,
  ] =
    useState<OpvolgingNcCategorieWaarde>(
      "CAT_0",
    );

  const [
    sanctieBegindatum,
    setSanctieBegindatum,
  ] = useState("");

  const [
    sanctieDoorgezet,
    setSanctieDoorgezet,
  ] = useState<
    "" | "ja" | "nee"
  >("");

  const [
    redenNietDoorzetten,
    setRedenNietDoorzetten,
  ] = useState("");

  const [
    fout,
    setFout,
  ] = useState("");

  const [
    succes,
    setSucces,
  ] = useState("");

  const [
    isBezig,
    startTransition,
  ] = useTransition();

  const cat1Begindatum =
    ontleedDatumInvoer(
      sanctieBegindatum,
    );

  const cat1Einddatum =
    ncCategorie === "CAT_1" &&
    cat1Begindatum
      ? formatteerDatumVoorInvoer(
          berekenCat1Einddatum(
            cat1Begindatum,
          ),
        )
      : "";

  function openDialoog() {
    sluitMeerMenu?.();
    setFout("");
    setSucces("");
    setNcCategorie("CAT_0");
    setSanctieDoorgezet("");
    setSanctieBegindatum("");
    setRedenNietDoorzetten("");
    setDialoogOpen(true);
  }

  function sluitDialoog() {
    if (isBezig) {
      return;
    }

    setDialoogOpen(false);
    setFout("");
    setSucces("");
  }

  function verzend(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    setFout("");
    setSucces("");

    startTransition(async () => {
      const resultaat =
        await maakOpvolgingSanctie(
          bronType,
          bronId,
          formData,
        );

      if (!resultaat.succes) {
        setFout(
          resultaat.melding,
        );
        return;
      }

      setSucces(
        resultaat.melding,
      );
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialoog}
        className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50"
      >
        Opvolgen/sanctioneren
      </button>

      {dialoogOpen
        ? createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              sluitDialoog();
            }
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`opvolging-titel-${bronType}-${bronId}`}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={`opvolging-titel-${bronType}-${bronId}`}
                  className="text-xl font-black text-slate-950"
                >
                  Opvolgen/sanctioneren
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Maak een registratie aan in de centrale lijst Opvolging/sancties.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  sluitDialoog
                }
                disabled={isBezig}
                aria-label="Venster sluiten"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {succes ? (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">
                  {succes}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/opvolging-sancties"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Naar Opvolging/sancties
                  </Link>

                  <button
                    type="button"
                    onClick={
                      sluitDialoog
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="mt-6 space-y-5"
                onSubmit={verzend}
              >
                <div>
                  <label
                    htmlFor={`reden-${bronType}-${bronId}`}
                    className="mb-1.5 block text-sm font-bold text-slate-800"
                  >
                    Reden
                  </label>

                  <textarea
                    id={`reden-${bronType}-${bronId}`}
                    name="reden"
                    required
                    maxLength={10_000}
                    rows={5}
                    disabled={isBezig}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`datum-vaststelling-${bronType}-${bronId}`}
                    className="mb-1.5 block text-sm font-bold text-slate-800"
                  >
                    Datum vaststelling
                  </label>

                  <input
                    id={`datum-vaststelling-${bronType}-${bronId}`}
                    name="datumVaststelling"
                    type="date"
                    required
                    disabled={isBezig}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`nc-categorie-${bronType}-${bronId}`}
                    className="mb-1.5 block text-sm font-bold text-slate-800"
                  >
                    NC-categorie
                  </label>

                  <select
                    id={`nc-categorie-${bronType}-${bronId}`}
                    name="ncCategorie"
                    value={ncCategorie}
                    onChange={(event) => {
                      setNcCategorie(
                        event.target
                          .value as OpvolgingNcCategorieWaarde,
                      );
                      setSanctieDoorgezet(
                        "",
                      );
                      setSanctieBegindatum(
                        "",
                      );
                      setRedenNietDoorzetten(
                        "",
                      );
                    }}
                    disabled={isBezig}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    {OPVOLGING_NC_CATEGORIEEN.map(
                      (categorie) => (
                        <option
                          key={categorie}
                          value={categorie}
                        >
                          {ncCategorieLabel(
                            categorie,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {ncCategorie ===
                  "CAT_1" ||
                ncCategorie ===
                  "CAT_2" ? (
                  <div>
                    <label
                      htmlFor={`sanctie-doorgezet-${bronType}-${bronId}`}
                      className="mb-1.5 block text-sm font-bold text-slate-800"
                    >
                      Wordt de sanctie doorgezet?
                    </label>

                    <select
                      id={`sanctie-doorgezet-${bronType}-${bronId}`}
                      name="sanctieDoorgezet"
                      required
                      value={
                        sanctieDoorgezet
                      }
                      onChange={(event) => {
                        const waarde =
                          event.target
                            .value as
                              | ""
                              | "ja"
                              | "nee";

                        setSanctieDoorgezet(
                          waarde,
                        );

                        if (
                          waarde !== "ja"
                        ) {
                          setSanctieBegindatum(
                            "",
                          );
                        }

                        if (
                          waarde !== "nee"
                        ) {
                          setRedenNietDoorzetten(
                            "",
                          );
                        }
                      }}
                      disabled={isBezig}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
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
                  </div>
                ) : null}

                {(
                  ncCategorie ===
                    "CAT_1" ||
                  ncCategorie ===
                    "CAT_2"
                ) &&
                sanctieDoorgezet ===
                  "nee" ? (
                  <div>
                    <label
                      htmlFor={`reden-niet-doorzetten-${bronType}-${bronId}`}
                      className="mb-1.5 block text-sm font-bold text-slate-800"
                    >
                      Reden niet doorzetten
                    </label>

                    <textarea
                      id={`reden-niet-doorzetten-${bronType}-${bronId}`}
                      name="redenNietDoorzetten"
                      required
                      maxLength={10_000}
                      rows={4}
                      value={
                        redenNietDoorzetten
                      }
                      onChange={(event) => {
                        setRedenNietDoorzetten(
                          event.target.value,
                        );
                      }}
                      disabled={isBezig}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                    />
                  </div>
                ) : null}

                {ncCategorie ===
                "CAT_1" &&
                sanctieDoorgezet ===
                  "ja" ? (
                  <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                      Voor Cat. 1 wordt de einddatum automatisch berekend als zes kalendermaanden na de aanvangsdatum.
                    </p>

                    <div>
                      <label
                        htmlFor={`sanctie-begin-${bronType}-${bronId}`}
                        className="mb-1.5 block text-sm font-bold text-slate-800"
                      >
                        Aanvangsdatum
                      </label>

                      <input
                        id={`sanctie-begin-${bronType}-${bronId}`}
                        name="sanctieBegindatum"
                        type="date"
                        required
                        value={
                          sanctieBegindatum
                        }
                        onChange={(
                          event,
                        ) => {
                          setSanctieBegindatum(
                            event.target
                              .value,
                          );
                        }}
                        disabled={isBezig}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`sanctie-einde-${bronType}-${bronId}`}
                        className="mb-1.5 block text-sm font-bold text-slate-800"
                      >
                        Automatische einddatum
                      </label>

                      <input
                        id={`sanctie-einde-${bronType}-${bronId}`}
                        type="date"
                        value={
                          cat1Einddatum
                        }
                        readOnly
                        className="h-11 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700"
                      />
                    </div>
                  </div>
                ) : null}

                {ncCategorie ===
                "CAT_2" &&
                sanctieDoorgezet ===
                  "ja" ? (
                  <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-900">
                      De sanctieperiode moet overeenkomen met de gegevens op het OVAM-certificatieplatform.
                    </p>

                    <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-white p-3">
                      <input
                        name="ovamPeriodeBevestigd"
                        type="checkbox"
                        required
                        disabled={isBezig}
                        className="mt-0.5 size-5 shrink-0 accent-red-700"
                      />

                      <span className="text-sm font-semibold text-red-900">
                        Ik bevestig dat de begin- en einddatum overeenkomen met het OVAM-certificatieplatform.
                      </span>
                    </label>

                    <div>
                      <label
                        htmlFor={`sanctie-begin-${bronType}-${bronId}`}
                        className="mb-1.5 block text-sm font-bold text-slate-800"
                      >
                        Sanctie begindatum
                      </label>

                      <input
                        id={`sanctie-begin-${bronType}-${bronId}`}
                        name="sanctieBegindatum"
                        type="date"
                        required
                        disabled={isBezig}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`sanctie-einde-${bronType}-${bronId}`}
                        className="mb-1.5 block text-sm font-bold text-slate-800"
                      >
                        Sanctie einddatum
                      </label>

                      <input
                        id={`sanctie-einde-${bronType}-${bronId}`}
                        name="sanctieEinddatum"
                        type="date"
                        required
                        disabled={isBezig}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                      />
                    </div>
                  </div>
                ) : null}

                {fout ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
                  >
                    {fout}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={
                      sluitDialoog
                    }
                    disabled={isBezig}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    disabled={isBezig}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isBezig
                      ? "Opslaan..."
                      : "Toevoegen"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
          document.body,
        )
        : null}
    </>
  );
}

"use client";

import {
  BEHEER_KNOP_KLASSEN,
} from "@/components/BeheerOverzichtHeader";
import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  importeerAtteststatistieken,
  pasAttestCorrectiesToe,
  verwijderAttestCorrectie,
  voegAttestCorrectieToe,
  type CorrectieStatus,
  type ImportStatus,
} from "./actions";

export type PersoonStatistiekRij = {
  id: number;
  persoonsId: string;
  naam: string;
  aantalAttesten: number;
};

export type BedrijfStatistiekRij = {
  id: number;
  bedrijfsnaam: string;
  aantalAttesten: number;
};

export type CorrectieRij = {
  id: number;
  persoonsId: string;
  bedrijfsnaam: string;
  naam: string;
  aantalAttesten: number;
};

export type ImportInformatie = {
  bronBestandsnaam: string;
  geimporteerdOp: string;
  aantalExcelRijen: number;
  aantalPersonen: number;
  aantalBedrijven: number;
  correctiesToegepastOp: string | null;
} | null;

type Props = {
  personen: PersoonStatistiekRij[];
  bedrijven: BedrijfStatistiekRij[];
  correcties: CorrectieRij[];
  laatsteImport: ImportInformatie;
};

const invoerStijl =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

function Melding({
  status,
}: {
  status: ImportStatus | CorrectieStatus;
}) {
  if (!status.message) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
        status.succes
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {status.message}
    </div>
  );
}

function datumTijd(waarde: string | null) {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(waarde));
}

export default function AtteststatistiekenClient({
  personen,
  bedrijven,
  correcties,
  laatsteImport,
}: Props) {
  const router = useRouter();

  const [
    importStatus,
    importActie,
    importBezig,
  ] = useActionState(
    importeerAtteststatistieken,
    {},
  );

  const [
    correctieStatus,
    correctieActie,
    correctieBezig,
  ] = useActionState(
    voegAttestCorrectieToe,
    {},
  );

  const [
    achtergrondBezig,
    startAchtergrondActie,
  ] = useTransition();

  const [
    persoonZoeken,
    setPersoonZoeken,
  ] = useState("");

  const [
    bedrijfZoeken,
    setBedrijfZoeken,
  ] = useState("");

  const [
    correctieZoeken,
    setCorrectieZoeken,
  ] = useState("");

  const [
    actieMelding,
    setActieMelding,
  ] = useState<CorrectieStatus>({});

  useEffect(() => {
    if (importStatus.succes) {
      router.refresh();
    }
  }, [importStatus.succes, router]);

  useEffect(() => {
    if (correctieStatus.succes) {
      router.refresh();
    }
  }, [correctieStatus.succes, router]);

  const gefilterdePersonen = useMemo(() => {
    const zoekterm =
      persoonZoeken
        .trim()
        .toLocaleLowerCase("nl-BE");

    if (!zoekterm) {
      return personen;
    }

    return personen.filter((persoon) =>
      `${persoon.persoonsId} ${persoon.naam}`
        .toLocaleLowerCase("nl-BE")
        .includes(zoekterm),
    );
  }, [personen, persoonZoeken]);

  const gefilterdeBedrijven = useMemo(() => {
    const zoekterm =
      bedrijfZoeken
        .trim()
        .toLocaleLowerCase("nl-BE");

    if (!zoekterm) {
      return bedrijven;
    }

    return bedrijven.filter((bedrijf) =>
      bedrijf.bedrijfsnaam
        .toLocaleLowerCase("nl-BE")
        .includes(zoekterm),
    );
  }, [bedrijven, bedrijfZoeken]);

  const gefilterdeCorrecties = useMemo(() => {
    const zoekterm =
      correctieZoeken
        .trim()
        .toLocaleLowerCase("nl-BE");

    if (!zoekterm) {
      return correcties;
    }

    return correcties.filter((correctie) =>
      `${correctie.persoonsId} ${correctie.naam} ${correctie.bedrijfsnaam}`
        .toLocaleLowerCase("nl-BE")
        .includes(zoekterm),
    );
  }, [correcties, correctieZoeken]);

  function correctiesToepassen() {
    if (
      !window.confirm(
        "Wil je alle correcties uit lijst 3 bij lijst 1 en lijst 2 optellen?",
      )
    ) {
      return;
    }

    setActieMelding({});

    startAchtergrondActie(async () => {
      const resultaat =
        await pasAttestCorrectiesToe();

      setActieMelding(resultaat);

      if (resultaat.succes) {
        router.refresh();
      }
    });
  }

  function correctieVerwijderen(id: number) {
    if (
      !window.confirm(
        "Wil je deze handmatige correctie definitief verwijderen?",
      )
    ) {
      return;
    }

    setActieMelding({});

    startAchtergrondActie(async () => {
      const resultaat =
        await verwijderAttestCorrectie(id);

      setActieMelding(resultaat);

      if (resultaat.succes) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className={`${BEHEER_TABEL_STIJLEN.kader} p-5`}>
        <h2 className="text-lg font-bold text-slate-950">
          Dagelijkse Excel-import
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          De import vervangt lijst 1 en lijst 2 volledig.
          Lijst 3 blijft behouden.
        </p>

        <form
          action={importActie}
          aria-busy={
            importBezig
          }
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="block flex-1">
            <span className="text-sm font-semibold text-slate-700">
              Excelbestand
            </span>

            <input
              type="file"
              name="excelBestand"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={importBezig}
            className={`${BEHEER_KNOP_KLASSEN.primair} disabled:cursor-wait disabled:opacity-60`}
          >
            {importBezig
              ? "Excel verwerken…"
              : "Excel importeren"}
          </button>
        </form>

        {importBezig ? (
          <div
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-950">
                  Excelimport wordt uitgevoerd
                </p>

                <p className="mt-1 text-xs font-medium text-emerald-800">
                  Het bestand wordt gecontroleerd, verwerkt en veilig in de database opgeslagen.
                </p>
              </div>

              <span className="shrink-0 text-xs font-bold text-emerald-800">
                Even geduld…
              </span>
            </div>

            <p
              className="text-sm font-semibold text-emerald-800"
              role="status"
              aria-live="polite"
            >
              Het Excelbestand wordt verwerkt. Dit kan enkele minuten duren.
            </p>

            <div
              role="progressbar"
              aria-label="Voortgang van de Excelimport"
              className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100 ring-1 ring-inset ring-emerald-200"
            >
              <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-emerald-400 via-emerald-700 to-emerald-400" />
            </div>

            <p className="mt-2 text-xs text-emerald-800">
              Sluit of vernieuw deze pagina niet totdat de import voltooid is.
            </p>
          </div>
        ) : null}

        <div className="mt-4">
          <Melding status={importStatus} />
        </div>

        {laatsteImport ? (
          <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-semibold text-slate-500">
                Bestand
              </dt>
              <dd className="mt-1 text-slate-900">
                {laatsteImport.bronBestandsnaam}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">
                Geïmporteerd
              </dt>
              <dd className="mt-1 text-slate-900">
                {datumTijd(laatsteImport.geimporteerdOp)}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">
                Excelrijen
              </dt>
              <dd className="mt-1 text-slate-900">
                {laatsteImport.aantalExcelRijen}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-slate-500">
                Correcties toegepast
              </dt>
              <dd className="mt-1 text-slate-900">
                {datumTijd(
                  laatsteImport.correctiesToegepastOp,
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Er is nog geen Excelimport uitgevoerd.
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={BEHEER_TABEL_STIJLEN.kader}>
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">
              Lijst 1 — Personen
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {personen.length} unieke personen
            </p>

            <input
              type="search"
              value={persoonZoeken}
              onChange={(event) =>
                setPersoonZoeken(event.target.value)
              }
              placeholder="Zoeken op PersoonsID of naam"
              className={`${invoerStijl} mt-4`}
            />
          </div>

          <div className="max-h-[600px] overflow-auto">
            <table className={`${BEHEER_TABEL_STIJLEN.tabel} text-sm`}>
              <thead className={`${BEHEER_TABEL_STIJLEN.kop} sticky top-0`}>
                <tr>
                  <th className="px-4 py-3">
                    PersoonsID
                  </th>
                  <th className="px-4 py-3">
                    Naam
                  </th>
                  <th className="px-4 py-3 text-right">
                    Aantal attesten
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {gefilterdePersonen.map((persoon) => (
                  <tr key={persoon.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {persoon.persoonsId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {persoon.naam}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">
                      {persoon.aantalAttesten}
                    </td>
                  </tr>
                ))}

                {gefilterdePersonen.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Geen personen gevonden.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className={BEHEER_TABEL_STIJLEN.kader}>
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-950">
              Lijst 2 — Bedrijven
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {bedrijven.length} unieke bedrijven
            </p>

            <input
              type="search"
              value={bedrijfZoeken}
              onChange={(event) =>
                setBedrijfZoeken(event.target.value)
              }
              placeholder="Zoeken op bedrijfsnaam"
              className={`${invoerStijl} mt-4`}
            />
          </div>

          <div className="max-h-[600px] overflow-auto">
            <table className={`${BEHEER_TABEL_STIJLEN.tabel} text-sm`}>
              <thead className={`${BEHEER_TABEL_STIJLEN.kop} sticky top-0`}>
                <tr>
                  <th className="px-4 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="px-4 py-3 text-right">
                    Aantal attesten
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {gefilterdeBedrijven.map((bedrijf) => (
                  <tr key={bedrijf.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {bedrijf.bedrijfsnaam}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">
                      {bedrijf.aantalAttesten}
                    </td>
                  </tr>
                ))}

                {gefilterdeBedrijven.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Geen bedrijven gevonden.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className={`${BEHEER_TABEL_STIJLEN.kader} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Lijst 3 — Handmatige correcties
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Deze lijst blijft behouden bij een nieuwe Excelimport.
            </p>
          </div>

          <button
            type="button"
            onClick={correctiesToepassen}
            disabled={
              achtergrondBezig ||
              correcties.length === 0 ||
              !laatsteImport ||
              Boolean(
                laatsteImport.correctiesToegepastOp,
              )
            }
            className={`${BEHEER_KNOP_KLASSEN.secundair} disabled:cursor-wait disabled:opacity-60`}
          >
            {achtergrondBezig
              ? "Bezig..."
              : laatsteImport?.correctiesToegepastOp
                ? "Correcties al toegepast"
                : "Correcties toepassen"}
          </button>
        </div>

        <div className="mt-4">
          <Melding status={actieMelding} />
        </div>

        <form
          action={correctieActie}
          className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <label>
            <span className="text-sm font-semibold text-slate-700">
              PersoonsID
            </span>
            <input
              name="persoonsId"
              required
              maxLength={100}
              className={`${invoerStijl} mt-1`}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Naam
            </span>
            <input
              name="naam"
              required
              maxLength={255}
              className={`${invoerStijl} mt-1`}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Bedrijfsnaam
            </span>
            <input
              name="bedrijfsnaam"
              required
              maxLength={500}
              className={`${invoerStijl} mt-1`}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Aantal attesten
            </span>
            <input
              type="number"
              name="aantalAttesten"
              required
              min={1}
              step={1}
              className={`${invoerStijl} mt-1`}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={correctieBezig}
              className={`${BEHEER_KNOP_KLASSEN.primair} w-full disabled:cursor-wait disabled:opacity-60`}
            >
              {correctieBezig
                ? "Toevoegen..."
                : "Correctie toevoegen"}
            </button>
          </div>
        </form>

        <div className="mt-4">
          <Melding status={correctieStatus} />
        </div>

        <input
          type="search"
          value={correctieZoeken}
          onChange={(event) =>
            setCorrectieZoeken(event.target.value)
          }
          placeholder="Zoeken in de correcties"
          className={`${invoerStijl} mt-5 max-w-xl`}
        />

        <div className={`${BEHEER_TABEL_STIJLEN.scroll} mt-4`}>
          <table className={`${BEHEER_TABEL_STIJLEN.tabel} text-sm`}>
            <thead className={BEHEER_TABEL_STIJLEN.kop}>
              <tr>
                <th className="px-4 py-3">
                  PersoonsID
                </th>
                <th className="px-4 py-3">
                  Bedrijfsnaam
                </th>
                <th className="px-4 py-3">
                  Naam
                </th>
                <th className="px-4 py-3 text-right">
                  Aantal attesten
                </th>
                <th className="px-4 py-3 text-right">
                  Actie
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {gefilterdeCorrecties.map((correctie) => (
                <tr key={correctie.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {correctie.persoonsId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {correctie.bedrijfsnaam}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {correctie.naam}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {correctie.aantalAttesten}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={achtergrondBezig}
                      onClick={() =>
                        correctieVerwijderen(correctie.id)
                      }
                      className={`${BEHEER_KNOP_KLASSEN.gevaar} disabled:cursor-wait disabled:opacity-60`}
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}

              {gefilterdeCorrecties.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Geen correcties gevonden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

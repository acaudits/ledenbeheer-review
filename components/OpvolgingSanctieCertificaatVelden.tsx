"use client";

import {
  useMemo,
  useState,
} from "react";

export type OpvolgingLidOptie = {
  id: number;
  naamPersoon: string;
  ovamId: string;
};

export type OpvolgingProcescertificaatOptie = {
  id: number;
  naamBedrijf: string;
};

type Props = {
  leden: OpvolgingLidOptie[];
  procescertificaten: OpvolgingProcescertificaatOptie[];
  beginNaamAdi: string;
  beginOvamId: string;
  beginBedrijfsnaam: string;
  invoerClassName: string;
  selectieVerplicht: boolean;
};

function normaliseer(waarde: string) {
  return waarde
    .trim()
    .toLocaleLowerCase("nl-BE");
}

function lidOptieWaarde(
  lid: OpvolgingLidOptie,
) {
  return `${lid.naamPersoon} — ${lid.ovamId}`;
}

export function OpvolgingSanctieCertificaatVelden({
  leden,
  procescertificaten,
  beginNaamAdi,
  beginOvamId,
  beginBedrijfsnaam,
  invoerClassName,
  selectieVerplicht,
}: Props) {
  const beginLid = useMemo(
    () =>
      leden.find(
        (lid) =>
          normaliseer(lid.naamPersoon) ===
            normaliseer(beginNaamAdi) &&
          normaliseer(lid.ovamId) ===
            normaliseer(beginOvamId),
      ) ?? null,
    [
      beginNaamAdi,
      beginOvamId,
      leden,
    ],
  );

  const [
    lidId,
    setLidId,
  ] = useState(
    beginLid?.id ?? "",
  );

  const [
    naamAdi,
    setNaamAdi,
  ] = useState(beginNaamAdi);

  const [
    ovamId,
    setOvamId,
  ] = useState(beginOvamId);

  function wijzigNaamAdi(
    waarde: string,
  ) {
    const genormaliseerd =
      normaliseer(waarde);

    const volledigeTreffer =
      leden.find(
        (lid) =>
          normaliseer(
            lidOptieWaarde(lid),
          ) === genormaliseerd,
      );

    const naamTreffers =
      leden.filter(
        (lid) =>
          normaliseer(
            lid.naamPersoon,
          ) === genormaliseerd,
      );

    const geselecteerd =
      volledigeTreffer ??
      (
        naamTreffers.length === 1
          ? naamTreffers[0]
          : null
      );

    if (geselecteerd) {
      setLidId(geselecteerd.id);
      setNaamAdi(
        geselecteerd.naamPersoon,
      );
      setOvamId(
        geselecteerd.ovamId,
      );
      return;
    }

    setLidId("");
    setNaamAdi(waarde);
    setOvamId("");
  }

  const uniekeBedrijfsnamen =
    useMemo(() => {
      const namen = new Map<
        string,
        string
      >();

      for (
        const procescertificaat
        of procescertificaten
      ) {
        const naam =
          procescertificaat
            .naamBedrijf
            .trim();

        if (!naam) {
          continue;
        }

        const sleutel =
          normaliseer(naam);

        if (!namen.has(sleutel)) {
          namen.set(
            sleutel,
            naam,
          );
        }
      }

      return Array.from(
        namen.values(),
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "nl-BE",
        ),
      );
    }, [procescertificaten]);

  /*
   * Detailpagina's die nog geen keuzelijsten doorgeven, behouden
   * voorlopig de bestaande vrije invoer. Op de pagina voor nieuwe
   * handmatige registraties zijn de keuzelijsten wel beschikbaar.
   */
  if (leden.length === 0) {
    return (
      <>
        <label className="text-sm font-semibold text-slate-700">
          Naam ADI
          <input
            name="naamAdi"
            maxLength={500}
            defaultValue={
              beginNaamAdi
            }
            className={
              invoerClassName
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Bedrijfsnaam
          <input
            name="bedrijfsnaam"
            maxLength={500}
            defaultValue={
              beginBedrijfsnaam
            }
            className={
              invoerClassName
            }
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          OVAM-ID *
          <input
            name="ovamId"
            required
            maxLength={255}
            defaultValue={
              beginOvamId
            }
            className={
              invoerClassName
            }
          />
        </label>
      </>
    );
  }

  return (
    <>
      <label className="text-sm font-semibold text-slate-700">
        Naam ADI *
        <input
          name="naamAdi"
          type="text"
          required={
            selectieVerplicht
          }
          maxLength={500}
          autoComplete="off"
          list="opvolging-leden"
          value={naamAdi}
          placeholder="Kies een persoon uit Persoonscertificaten"
          onChange={(event) =>
            wijzigNaamAdi(
              event.target.value,
            )
          }
          className={
            invoerClassName
          }
        />

        <datalist id="opvolging-leden">
          {leden.map((lid) => (
            <option
              key={lid.id}
              value={
                lidOptieWaarde(lid)
              }
            >
              {lid.naamPersoon}
            </option>
          ))}
        </datalist>

        <input
          type="hidden"
          name="lidId"
          value={lidId}
        />
      </label>

      <label className="text-sm font-semibold text-slate-700">
        Bedrijfsnaam
        <input
          name="bedrijfsnaam"
          maxLength={500}
          autoComplete="off"
          list="opvolging-procescertificaten"
          defaultValue={
            beginBedrijfsnaam
          }
          placeholder="Kies of typ een bedrijfsnaam"
          className={
            invoerClassName
          }
        />

        <datalist id="opvolging-procescertificaten">
          {uniekeBedrijfsnamen.map(
            (naam) => (
              <option
                key={naam}
                value={naam}
              />
            ),
          )}
        </datalist>
      </label>

      <label className="text-sm font-semibold text-slate-700">
        OVAM-ID *
        <input
          name="ovamId"
          required
          readOnly
          maxLength={255}
          value={ovamId}
          placeholder="Wordt automatisch ingevuld"
          className={`${invoerClassName} bg-slate-50`}
        />
      </label>
    </>
  );
}

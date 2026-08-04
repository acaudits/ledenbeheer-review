"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  bevestigTerreincontrolesUitExcel,
  leesTerreincontrolesUitExcel,
  type TerreincontroleBevestigState,
  type TerreincontroleExcelRij,
  type TerreincontroleExcelState,
} from "../planning-import-actions";

import {
  geefPlaatsbezoekVrij,
  haalPlaatsbezoekBeschikbaarheidOp,
  reserveerPlaatsbezoek,
  reserveerPlaatsbezoeken,
  vernieuwPlaatsbezoekReserveringen,
} from "../reservering-actions";

import PlaatsbezoekenKaart from "./PlaatsbezoekenKaart";

const TERREINCONTROLE_AUDITEURS = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Kimberly Velders",
  "Demis Casaert",
  "Omer Ekinci",
  "Stef Dierckx",
] as const;

const beginstatus:
  TerreincontroleExcelState = {};

const bevestigBeginstatus:
  TerreincontroleBevestigState = {};

function LadenKnop() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? "Excelbestand lezen..."
        : "Excelbestand laden"}
    </button>
  );
}

function BevestigKnop({
  uitgeschakeld,
  aantal,
}: {
  uitgeschakeld: boolean;
  aantal: number;
}) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending ||
        uitgeschakeld
      }
      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Terreincontroles opslaan..."
        : `${aantal} geselecteerde rij(en) opslaan`}
    </button>
  );
}

function statusLabel(
  status:
    TerreincontroleExcelRij["status"],
): string {
  if (
    status ===
    "GEARCHIVEERD_ATTEST"
  ) {
    return "Gearchiveerd attest";
  }

  if (
    status ===
    "ACTUEEL_ATTEST"
  ) {
    return "Actueel attest";
  }

  if (
    status === "IN_OPMAAK"
  ) {
    return "In opmaak";
  }

  return "Geen status";
}

function toonTekst(
  waarde: string,
): string {
  return waarde.trim() || "—";
}

function planningRijStijl(
  status:
    TerreincontroleExcelRij["planningStatus"],
) {
  switch (status) {
    case "ROOD":
      return "bg-red-50/80 hover:bg-red-100/70";

    case "GEEL":
      return "bg-amber-50/90 hover:bg-amber-100/70";

    case "GROEN":
      return "bg-emerald-50/80 hover:bg-emerald-100/70";

    default:
      return "bg-slate-50/90 hover:bg-slate-100/80";
  }
}

function formatteerPlanningDatum(
  waarde: string | null,
) {
  if (!waarde) {
    return "Nooit";
  }

  const datum = new Date(waarde);

  if (Number.isNaN(datum.getTime())) {
    return "Onbekend";
  }

  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

export default function TerreincontroleExcelImport() {
  const [
    state,
    formAction,
  ] = useActionState(
    leesTerreincontrolesUitExcel,
    beginstatus,
  );

  const [
    bevestigState,
    bevestigFormAction,
  ] = useActionState(
    bevestigTerreincontrolesUitExcel,
    bevestigBeginstatus,
  );

  const [rijen, setRijen] =
    useState<
      TerreincontroleExcelRij[]
    >([]);

  const [
    geselecteerdeSleutels,
    setGeselecteerdeSleutels,
  ] = useState<
    Set<string>
  >(new Set());

  const [
    standaardAuditeur,
    setStandaardAuditeur,
  ] = useState("");

  const [
    planningFilter,
    setPlanningFilter,
  ] = useState("ALLE");

  const [
    planningZoekterm,
    setPlanningZoekterm,
  ] = useState("");

  const [
    actieveKaartRijSleutel,
    setActieveKaartRijSleutel,
  ] = useState<string | null>(
    null,
  );

  const [
    kaartFocusVolgnummer,
    setKaartFocusVolgnummer,
  ] = useState(0);

  const [
    reserveringMelding,
    setReserveringMelding,
  ] = useState("");

  const [
    reserveringBezig,
    setReserveringBezig,
  ] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const nieuweRijen =
      state.rijen ?? [];

    setRijen(
      nieuweRijen,
    );

    // Na het laden is bewust geen enkele rij geselecteerd.
    setGeselecteerdeSleutels(
      new Set(),
    );

    setStandaardAuditeur(
      state.standaardAuditeur ?? "",
    );
  }, [
    state.rijen,
    state.standaardAuditeur,
  ]);

  useEffect(() => {
    if (
      !bevestigState.succes
    ) {
      return;
    }

    setRijen([]);

    setGeselecteerdeSleutels(
      new Set(),
    );

    setStandaardAuditeur("");
  }, [
    bevestigState.succes,
    bevestigState.message,
  ]);

  useEffect(() => {
    if (
      rijen.length === 0
    ) {
      return;
    }

    const ververs =
      async () => {
        try {
          const beschikbaarheden =
            await haalPlaatsbezoekBeschikbaarheidOp(
              rijen.map(
                (rij) =>
                  rij.attestId,
              ),
            );

          const perAttestId =
            new Map(
              beschikbaarheden.map(
                (status) => [
                  status.attestId,
                  status,
                ],
              ),
            );

          setRijen(
            (huidigeRijen) =>
              huidigeRijen.map(
                (rij) => {
                  const status =
                    perAttestId.get(
                      rij.attestId
                        .trim()
                        .toLowerCase(),
                    );

                  return status
                    ? {
                        ...rij,
                        ...status,
                      }
                    : rij;
                },
              ),
          );

          setGeselecteerdeSleutels(
            (huidige) => {
              const volgende =
                new Set(huidige);

              for (
                const rij of rijen
              ) {
                const status =
                  perAttestId.get(
                    rij.attestId
                      .trim()
                      .toLowerCase(),
                  );

                if (
                  status &&
                  status.beschikbaarheid !==
                    "DOOR_MIJ"
                ) {
                  volgende.delete(
                    rij.sleutel,
                  );
                }
              }

              return volgende;
            },
          );
        } catch (fout) {
          console.error(
            "Beschikbaarheid verversen mislukt:",
            fout,
          );
        }
      };

    const interval =
      window.setInterval(
        () => {
          void ververs();
        },
        15_000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [rijen]);

  useEffect(() => {
    const eigenRijen =
      rijen.filter(
        (rij) =>
          geselecteerdeSleutels.has(
            rij.sleutel,
          ) &&
          rij.beschikbaarheid ===
            "DOOR_MIJ",
      );

    if (
      eigenRijen.length === 0
    ) {
      return;
    }

    const vernieuw =
      async () => {
        try {
          const resultaat =
            await vernieuwPlaatsbezoekReserveringen(
              eigenRijen.map(
                (rij) =>
                  rij.attestId,
              ),
            );

          if (
            resultaat.aantalVernieuwd !==
            eigenRijen.length
          ) {
            setReserveringMelding(
              "Minstens één reservering is verlopen. Controleer de selectie opnieuw.",
            );
          }
        } catch (fout) {
          console.error(
            "Reserveringen vernieuwen mislukt:",
            fout,
          );
        }
      };

    const interval =
      window.setInterval(
        () => {
          void vernieuw();
        },
        60_000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    geselecteerdeSleutels,
  ]);

  const geselecteerdeRijen =
    useMemo(
      () =>
        rijen.filter(
          (rij) =>
            geselecteerdeSleutels.has(
              rij.sleutel,
            ),
        ),
      [
        rijen,
        geselecteerdeSleutels,
      ],
    );

  const zichtbareRijen =
    useMemo(() => {
      const zoekterm =
        planningZoekterm
          .trim()
          .toLocaleLowerCase(
            "nl-BE",
          );

      return rijen.filter((rij) => {
        const voldoetAanStatus =
          planningFilter === "ALLE" ||
          rij.planningStatus ===
            planningFilter ||
          (
            planningFilter ===
              "NOG_NODIG" &&
            rij.aantalTerreincontrolesNodig >
              0
          );

        if (!voldoetAanStatus) {
          return false;
        }

        if (!zoekterm) {
          return true;
        }

        const zoekbareTekst = [
          rij.ovamId,
          rij.naamAdi,
          rij.inspectielocatie,
          rij.gemeente,
          rij.postcode,
          rij.bedrijfsnaam,
          rij.auditeur,
        ]
          .join(" ")
          .toLocaleLowerCase(
            "nl-BE",
          );

        return zoekbareTekst.includes(
          zoekterm,
        );
      });
    }, [
      rijen,
      planningFilter,
      planningZoekterm,
    ]);

  const reserveerbareRijen =
    zichtbareRijen.filter(
      (rij) =>
        rij.beschikbaarheid ===
          "BESCHIKBAAR" ||
        rij.beschikbaarheid ===
          "DOOR_MIJ",
    );

  const allesGeselecteerd =
    reserveerbareRijen.length >
      0 &&
    reserveerbareRijen.every(
      (rij) =>
        geselecteerdeSleutels.has(
          rij.sleutel,
        ),
    );

  const importGegevens =
    JSON.stringify({
      bestandsnaam:
        state.bestandsnaam ?? "",

      rijen:
        geselecteerdeRijen.map(
          (rij) => ({
            excelRij:
              rij.excelRij,

            auditeur:
              rij.auditeur,

            factuurVerzonden:
              rij.factuurVerzonden,

            opmerkingen:
              rij.opmerkingen,

            inspectielocatie:
              rij.inspectielocatie,

            bouwjaar:
              rij.bouwjaar,

            vloeroppervlakteM2:
              rij.vloeroppervlakteM2,

            datumPlaatsbezoek:
              rij.datumPlaatsbezoek,

            uurPlaatsbezoek:
              rij.uurPlaatsbezoek,

            ovamId:
              rij.ovamId,

            naamAdi:
              rij.naamAdi,

            attestUrl:
              rij.attestUrl,

            bedrijfsnaam:
              rij.bedrijfsnaam,

            status:
              rij.status,

            postcode:
              rij.postcode,

            gemeente:
              rij.gemeente,

            straat:
              rij.straat,

            huisnummer:
              rij.huisnummer,

            extraAdresDetails:
              rij.extraAdresDetails,

            perceelGemeenteCode:
              rij.perceelGemeenteCode,

            perceelAfdelingscode:
              rij.perceelAfdelingscode,

            perceelSectieCode:
              rij.perceelSectieCode,

            attestId:
              rij.attestId,
          }),
        ),
    });

  async function selecteerAlles() {
    if (allesGeselecteerd) {
      const eigenRijen =
        reserveerbareRijen.filter(
          (rij) =>
            geselecteerdeSleutels.has(
              rij.sleutel,
            ),
        );

      await Promise.all(
        eigenRijen.map(
          (rij) =>
            geefPlaatsbezoekVrij(
              rij.attestId,
            ),
        ),
      );

      setGeselecteerdeSleutels(
        (huidige) => {
          const volgende =
            new Set(huidige);

          for (
            const rij of eigenRijen
          ) {
            volgende.delete(
              rij.sleutel,
            );
          }

          return volgende;
        },
      );

      setRijen(
        (huidigeRijen) =>
          huidigeRijen.map(
            (rij) =>
              eigenRijen.some(
                (eigenRij) =>
                  eigenRij.sleutel ===
                  rij.sleutel,
              )
                ? {
                    ...rij,
                    beschikbaarheid:
                      "BESCHIKBAAR",
                    gereserveerdDoor:
                      null,
                    reserveringVerlooptOp:
                      null,
                  }
                : rij,
          ),
      );

      setReserveringMelding(
        "De zichtbare reserveringen werden vrijgegeven.",
      );

      return;
    }

    const teReserveren =
      reserveerbareRijen.filter(
        (rij) =>
          rij.beschikbaarheid ===
            "BESCHIKBAAR",
      );

    if (
      teReserveren.length === 0
    ) {
      return;
    }

    const resultaten =
      await reserveerPlaatsbezoeken(
        teReserveren.map(
          (rij) =>
            rij.attestId,
        ),
      );

    const resultaatPerId =
      new Map(
        resultaten.map(
          (resultaat) => [
            resultaat.attestId,
            resultaat,
          ],
        ),
      );

    setRijen(
      (huidigeRijen) =>
        huidigeRijen.map(
          (rij) => {
            const resultaat =
              resultaatPerId.get(
                rij.attestId
                  .trim()
                  .toLowerCase(),
              );

            return resultaat
              ? {
                  ...rij,
                  beschikbaarheid:
                    resultaat.beschikbaarheid,
                  gereserveerdDoor:
                    resultaat.gereserveerdDoor,
                  reserveringVerlooptOp:
                    resultaat.reserveringVerlooptOp,
                  ingeplandDoor:
                    resultaat.ingeplandDoor,
                }
              : rij;
          },
        ),
    );

    setGeselecteerdeSleutels(
      (huidige) => {
        const volgende =
          new Set(huidige);

        for (
          const rij of teReserveren
        ) {
          const resultaat =
            resultaatPerId.get(
              rij.attestId
                .trim()
                .toLowerCase(),
            );

          if (
            resultaat?.succes
          ) {
            volgende.add(
              rij.sleutel,
            );
          }
        }

        return volgende;
      },
    );

    const gelukt =
      resultaten.filter(
        (resultaat) =>
          resultaat.succes,
      ).length;

    const mislukt =
      resultaten.length -
      gelukt;

    setReserveringMelding(
      `${gelukt} plaatsbezoek(en) gereserveerd.${
        mislukt > 0
          ? ` ${mislukt} plaatsbezoek(en) waren niet meer beschikbaar.`
          : ""
      }`,
    );
  }

  async function wijzigSelectie(
    rij: TerreincontroleExcelRij,
  ) {
    if (
      reserveringBezig.has(
        rij.sleutel,
      )
    ) {
      return;
    }

    setReserveringBezig(
      (huidige) => {
        const volgende =
          new Set(huidige);

        volgende.add(
          rij.sleutel,
        );

        return volgende;
      },
    );

    try {
      const geselecteerd =
        geselecteerdeSleutels.has(
          rij.sleutel,
        );

      if (geselecteerd) {
        await geefPlaatsbezoekVrij(
          rij.attestId,
        );

        setGeselecteerdeSleutels(
          (huidige) => {
            const volgende =
              new Set(huidige);

            volgende.delete(
              rij.sleutel,
            );

            return volgende;
          },
        );

        setRijen(
          (huidigeRijen) =>
            huidigeRijen.map(
              (huidigeRij) =>
                huidigeRij.sleutel ===
                rij.sleutel
                  ? {
                      ...huidigeRij,
                      beschikbaarheid:
                        "BESCHIKBAAR",
                      gereserveerdDoor:
                        null,
                      reserveringVerlooptOp:
                        null,
                    }
                  : huidigeRij,
            ),
        );

        setReserveringMelding(
          "Reservering vrijgegeven.",
        );

        return;
      }

      const resultaat =
        await reserveerPlaatsbezoek(
          rij.attestId,
        );

      setRijen(
        (huidigeRijen) =>
          huidigeRijen.map(
            (huidigeRij) =>
              huidigeRij.sleutel ===
              rij.sleutel
                ? {
                    ...huidigeRij,
                    beschikbaarheid:
                      resultaat.beschikbaarheid,
                    gereserveerdDoor:
                      resultaat.gereserveerdDoor,
                    reserveringVerlooptOp:
                      resultaat.reserveringVerlooptOp,
                    ingeplandDoor:
                      resultaat.ingeplandDoor,
                  }
                : huidigeRij,
          ),
      );

      if (resultaat.succes) {
        setGeselecteerdeSleutels(
          (huidige) => {
            const volgende =
              new Set(huidige);

            volgende.add(
              rij.sleutel,
            );

            return volgende;
          },
        );
      }

      setReserveringMelding(
        resultaat.message,
      );
    } catch (fout) {
      console.error(
        "Selectie wijzigen mislukt:",
        fout,
      );

      setReserveringMelding(
        "De reservering kon niet worden gewijzigd.",
      );
    } finally {
      setReserveringBezig(
        (huidige) => {
          const volgende =
            new Set(huidige);

          volgende.delete(
            rij.sleutel,
          );

          return volgende;
        },
      );
    }
  }

  function wijzigRij(
    sleutel: string,
    wijzigingen:
      Partial<TerreincontroleExcelRij>,
  ) {
    setRijen(
      (huidigeRijen) =>
        huidigeRijen.map(
          (rij) =>
            rij.sleutel ===
            sleutel
              ? {
                  ...rij,
                  ...wijzigingen,
                }
              : rij,
        ),
    );
  }

  function wijzigStandaardAuditeur(
    waarde: string,
  ) {
    setStandaardAuditeur(
      waarde,
    );

    setRijen(
      (huidigeRijen) =>
        huidigeRijen.map(
          (rij) => ({
            ...rij,
            auditeur: waarde,
          }),
        ),
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">
          Plaatsbezoeken importeren
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Upload een Excelbestand met
          het werkblad
          &quot;Plaatsbezoeken&quot;.
          De gegevens worden eerst als
          voorbeeld getoond.
        </p>

        <form
          action={formAction}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="terreincontroleExcel"
              className="block text-sm font-semibold text-slate-700"
            >
              Excelbestand
            </label>

            <input
              id="terreincontroleExcel"
              name="excelBestand"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="mt-1.5 block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold"
            />

            {state.errors
              ?.excelBestand ? (
              <p className="mt-1.5 text-sm font-medium text-red-600">
                {
                  state.errors
                    .excelBestand
                }
              </p>
            ) : null}
          </div>

          <LadenKnop />
        </form>

        {state.message ? (
          <div
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
              state.succes
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}
      </div>

      {rijen.length > 0 ? (
        <>
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-sm">
                <label
                  htmlFor="standaardAuditeur"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Auditeur voor alle rijen
                </label>

                <select
                  id="standaardAuditeur"
                  value={
                    standaardAuditeur
                  }
                  onChange={(event) =>
                    wijzigStandaardAuditeur(
                      event.target.value,
                    )
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">
                    Kies een auditeur
                  </option>

                  {TERREINCONTROLE_AUDITEURS.map(
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
              </div>

              <div className="text-sm font-semibold text-slate-700">
                {
                  geselecteerdeRijen.length
                }{" "}
                van {rijen.length} rijen
                geselecteerd
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <label
                  htmlFor="planningZoekterm"
                  className="block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Zoeken
                </label>

                <input
                  id="planningZoekterm"
                  type="search"
                  value={planningZoekterm}
                  onChange={(event) =>
                    setPlanningZoekterm(
                      event.target.value,
                    )
                  }
                  placeholder="Naam, OVAM-ID, adres, gemeente of bedrijf..."
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="planningFilter"
                  className="block text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Planningsstatus
                </label>

                <select
                  id="planningFilter"
                  value={planningFilter}
                  onChange={(event) =>
                    setPlanningFilter(
                      event.target.value,
                    )
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="ALLE">
                    Alle kleuren
                  </option>

                  <option value="NOG_NODIG">
                    Nog terreincontroles nodig
                  </option>

                  <option value="ROOD">
                    Rood — target niet behaald
                  </option>

                  <option value="GEEL">
                    Geel — controle minder dan 14 dagen geleden
                  </option>

                  <option value="GROEN">
                    Groen — target behaald
                  </option>

                  <option value="GRIJS">
                    Grijs — geen attesten of koppeling
                  </option>
                </select>
              </div>
            </div>

            <p className="mt-3 text-xs font-medium text-slate-500">
              {zichtbareRijen.length} van{" "}
              {rijen.length} plaatsbezoeken zichtbaar.
              Na het laden is geen enkele rij automatisch geselecteerd.
            </p>
          </div>

          {reserveringMelding ? (
            <div
              role="status"
              className="border-b border-slate-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900"
            >
              {reserveringMelding}
            </div>
          ) : null}

          <PlaatsbezoekenKaart
            rijen={zichtbareRijen}

            actieveRijSleutel={
              actieveKaartRijSleutel
            }
            focusVolgnummer={
              kaartFocusVolgnummer
            }
            geselecteerdeRijSleutels={
              geselecteerdeSleutels
            }
          />

          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[4800px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-100">
                <tr>
                  <th className="sticky left-0 z-30 border-b border-r border-slate-300 bg-slate-100 px-3 py-3">
                    <label className="flex items-center gap-2 font-bold">
                      <input
                        type="checkbox"
                        checked={
                          allesGeselecteerd
                        }
                        onChange={() => {
                          void selecteerAlles();
                        }}
                        disabled={
                          reserveerbareRijen.length ===
                          0
                        }
                        className="size-4 accent-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                      />

                      Selecteer
                    </label>
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Google Maps
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Excelrij
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Auditeur
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Inspectielocatie
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Bouwjaar
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Vloeroppervlakte (m²)
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Datum plaatsbezoek
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Uur plaatsbezoek
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Deskundige persoonsid
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Deskundige naam
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Deskundige kwaliteitspagina
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Naam asbestdeskundig bedrijf
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Status
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Postcode
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Gemeente
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Straat
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Huisnummer
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Extra adres details
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Perceel gemeente code
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Perceel afdelingscode
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Perceel sectie code
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Liggingsadres
                  </th>

                  <th className="border-b border-slate-300 px-3 py-3">
                    Controle
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {zichtbareRijen.map((rij) => {
                  const geselecteerd =
                    geselecteerdeSleutels.has(
                      rij.sleutel,
                    );

                  return (
                    <tr
                      key={
                        rij.sleutel
                      }
                      title={
                        rij.planningStatusTekst
                      }
                      className={`${planningRijStijl(
                        rij.planningStatus,
                      )} align-top transition-colors ${
                        geselecteerd
                          ? "ring-2 ring-inset ring-emerald-500"
                          : "opacity-85"
                      }`}
                      onClickCapture={(event) => {
                        const doel =
                          event.target;

                        if (
                          doel instanceof
                            Element &&
                          doel.closest(
                            "a, button, input, select, textarea, label",
                          )
                        ) {
                          return;
                        }

                        const heeftPositie =
                          typeof rij.latitude ===
                            "number" &&
                          typeof rij.longitude ===
                            "number" &&
                          Number.isFinite(
                            rij.latitude,
                          ) &&
                          Number.isFinite(
                            rij.longitude,
                          );

                        if (!heeftPositie) {
                          return;
                        }

                        setActieveKaartRijSleutel(
                          rij.sleutel,
                        );

                        setKaartFocusVolgnummer(
                          (huidig) =>
                            huidig + 1,
                        );
                      }}
                    >
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={
                            geselecteerd
                          }
                          onChange={() => {
                            void wijzigSelectie(
                              rij,
                            );
                          }}
                          disabled={
                            rij.beschikbaarheid ===
                              "DOOR_ANDER" ||
                            rij.beschikbaarheid ===
                              "INGEPLAND" ||
                            reserveringBezig.has(
                              rij.sleutel,
                            )
                          }
                          className="size-4 accent-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Excelrij ${rij.excelRij} selecteren`}
                        />

                        <div className="mt-2 w-52">
                          {reserveringBezig.has(
                            rij.sleutel,
                          ) ? (
                            <span className="text-[10px] font-bold text-blue-700">
                              Reserveren…
                            </span>
                          ) : rij.beschikbaarheid ===
                            "DOOR_MIJ" ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                              Door jou gekozen
                            </span>
                          ) : rij.beschikbaarheid ===
                            "DOOR_ANDER" ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">
                              Tijdelijk gereserveerd door{" "}
                              {rij.gereserveerdDoor ??
                                "een andere auditeur"}
                            </span>
                          ) : rij.beschikbaarheid ===
                            "INGEPLAND" ? (
                            <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-800">
                              Reeds ingepland
                              {rij.ingeplandDoor
                                ? ` door ${rij.ingeplandDoor}`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500">
                              Beschikbaar
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {rij.googleMapsUrl ? (
                          <a
                            href={
                              rij.googleMapsUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 font-bold text-white hover:bg-blue-800"
                          >
                            Open kaart ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3 align-top font-bold">
                        {rij.excelRij}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <select
                          value={
                            rij.auditeur
                          }
                          onChange={(
                            event,
                          ) =>
                            wijzigRij(
                              rij.sleutel,
                              {
                                auditeur:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          className="h-9 w-52 rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-emerald-600"
                        >
                          <option value="">
                            Kies auditeur
                          </option>

                          {TERREINCONTROLE_AUDITEURS.map(
                            (
                              auditeur,
                            ) => (
                              <option
                                key={
                                  auditeur
                                }
                                value={
                                  auditeur
                                }
                              >
                                {
                                  auditeur
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-72 whitespace-pre-wrap font-medium">
                          {toonTekst(
                            rij.inspectielocatie,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.bouwjaar,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.vloeroppervlakteM2,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {toonTekst(
                          rij.datumPlaatsbezoek,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {toonTekst(
                          rij.uurPlaatsbezoek,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <span className="whitespace-nowrap font-semibold">
                          <div className="min-w-56">
                          <p className="font-bold text-slate-900">
                            {toonTekst(
                              rij.ovamId,
                            )}
                          </p>

                          <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600">
                            <p>
                              Attesten:{" "}
                              <strong>
                                {rij.aantalAttesten}
                              </strong>
                            </p>

                            <p>
                              Terreincontroles:{" "}
                              <strong>
                                {
                                  rij.aantalTerreincontroles
                                }
                                /
                                {
                                  rij.terreincontroleTarget
                                }
                              </strong>
                            </p>

                            <p>
                              Nog nodig:{" "}
                              <strong>
                                {
                                  rij.aantalTerreincontrolesNodig
                                }
                              </strong>
                            </p>

                            <p>
                              Laatste:{" "}
                              <strong>
                                {formatteerPlanningDatum(
                                  rij.laatsteTerreincontrole,
                                )}
                              </strong>
                            </p>
                          </div>
                        </div>
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-52 font-semibold">
                          {toonTekst(
                            rij.naamAdi,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {rij.attestUrl ? (
                          <a
                            href={
                              rij.attestUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-80 break-all font-semibold text-blue-700 hover:underline"
                          >
                            {
                              rij.attestUrl
                            }
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-64 font-semibold">
                          {toonTekst(
                            rij.bedrijfsnaam,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <select
                          value={
                            rij.status ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            wijzigRij(
                              rij.sleutel,
                              {
                                status:
                                  event
                                    .target
                                    .value
                                    ? (event
                                        .target
                                        .value as TerreincontroleExcelRij["status"])
                                    : null,
                              },
                            )
                          }
                          className="h-9 w-52 rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-emerald-600"
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

                        <p className="mt-1 text-[10px] text-slate-500">
                          {statusLabel(
                            rij.status,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.postcode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-44">
                          {toonTekst(
                            rij.gemeente,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-52">
                          {toonTekst(
                            rij.straat,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.huisnummer,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="w-56 whitespace-pre-wrap">
                          {toonTekst(
                            rij.extraAdresDetails,
                          )}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.perceelGemeenteCode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.perceelAfdelingscode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        {toonTekst(
                          rij.perceelSectieCode,
                        )}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <span className="block w-72 break-all font-mono text-[10px]">
                          {rij.attestId ||
                            "Geen Attest-ID gevonden"}
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top">
                        {rij.waarschuwingen
                          .length ===
                        0 ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                            Geldig
                          </span>
                        ) : (
                          <ul className="w-72 space-y-1 text-[10px] font-medium text-red-700">
                            {rij.waarschuwingen.map(
                              (
                                waarschuwing,
                              ) => (
                                <li
                                  key={
                                    waarschuwing
                                  }
                                >
                                  {
                                    waarschuwing
                                  }
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

<footer className="border-t border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Selecteer de gewenste
                  plaatsbezoeken en kies
                  voor iedere geselecteerde
                  rij een auditeur.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Het Attest-ID wordt uit
                  Liggingsadres attest-id
                  gelezen. Als dat niet
                  mogelijk is, wordt het
                  automatisch uit de
                  deskundige
                  kwaliteitspagina gehaald.
                </p>
              </div>

              <form
                action={
                  bevestigFormAction
                }
              >

                <input
                  type="hidden"
                  name="reserveringAttestIds"
                  value={JSON.stringify(
                    geselecteerdeRijen.map(
                      (rij) =>
                        rij.attestId,
                    ),
                  )}
                />
                <input
                  type="hidden"
                  name="importGegevens"
                  value={
                    importGegevens
                  }
                />

                <BevestigKnop
                  uitgeschakeld={
                    geselecteerdeRijen.length ===
                    0
                  }
                  aantal={
                    geselecteerdeRijen.length
                  }
                />
              </form>
            </div>

            {bevestigState.message ? (
              <div
                role="status"
                className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  bevestigState.succes
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {
                  bevestigState.message
                }
              </div>
            ) : null}

            {bevestigState.fouten &&
            bevestigState.fouten
              .length > 0 ? (
              <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3">
                <ul className="space-y-1 text-xs font-medium text-red-800">
                  {bevestigState.fouten.map(
                    (
                      fout,
                      index,
                    ) => (
                      <li
                        key={`${index}-${fout}`}
                      >
                        {fout}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
          </footer>
        </>
      ) : null}
    </section>
  );
}

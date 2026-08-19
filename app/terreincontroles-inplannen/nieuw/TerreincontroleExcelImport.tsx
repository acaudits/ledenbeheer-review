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
import {
  bewaarTerreincontroleImport,
  leesBewaardeTerreincontroleImport,
} from "./TerreincontroleImportOpslag";
import {
  ExcelKolomFilter,
  type ExcelSortering,
} from "./ExcelKolomFilter";

const PLANNING_KLEUREN:
  readonly TerreincontroleExcelRij["planningStatus"][] =
    [
      "ROOD",
      "GEEL",
      "GROEN",
      "GRIJS",
    ];

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

function formatteerReserveringAfteltijd(
  verlooptOp: string | null,
  huidigeTijd: number,
) {
  if (
    !verlooptOp ||
    huidigeTijd <= 0
  ) {
    return null;
  }

  const vervaltijd =
    new Date(
      verlooptOp,
    ).getTime();

  if (
    !Number.isFinite(
      vervaltijd,
    )
  ) {
    return null;
  }

  const resterendeSeconden =
    Math.max(
      0,
      Math.ceil(
        (
          vervaltijd -
          huidigeTijd
        ) / 1000,
      ),
    );

  const minuten =
    Math.floor(
      resterendeSeconden / 60,
    );

  const seconden =
    resterendeSeconden % 60;

  return `${String(
    minuten,
  ).padStart(
    2,
    "0",
  )}:${String(
    seconden,
  ).padStart(
    2,
    "0",
  )}`;
}

function formatteerUploadtijdstip(
  waarde: string,
) {
  const datum =
    new Date(waarde);

  if (
    Number.isNaN(
      datum.getTime(),
    )
  ) {
    return "Onbekend tijdstip";
  }

  const datumTekst =
    datum.toLocaleDateString(
      "nl-BE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone:
          "Europe/Brussels",
      },
    );

  const tijdTekst =
    datum.toLocaleTimeString(
      "nl-BE",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone:
          "Europe/Brussels",
      },
    );

  return `${datumTekst} om ${tijdTekst}`;
}

type ExcelKolom = {
  sleutel: string;
  label: string;
};

const EXCEL_KOLOMMEN:
  ExcelKolom[] = [
    {
      sleutel: "googleMaps",
      label: "Google Maps",
    },
    {
      sleutel: "auditeur",
      label: "Auditeur",
    },
    {
      sleutel: "datumPlaatsbezoek",
      label: "Datum plaatsbezoek",
    },
    {
      sleutel: "uurPlaatsbezoek",
      label: "Uur plaatsbezoek",
    },
    {
      sleutel: "inspectielocatie",
      label: "Inspectielocatie",
    },
    {
      sleutel: "bouwjaar",
      label: "Bouwjaar",
    },
    {
      sleutel: "vloeroppervlakteM2",
      label: "Vloeroppervlakte (m²)",
    },
    {
      sleutel: "ovamId",
      label: "Deskundige persoonsid",
    },
    {
      sleutel: "naamAdi",
      label: "Deskundige naam",
    },
    {
      sleutel: "attestUrl",
      label: "Deskundige kwaliteitspagina",
    },
    {
      sleutel: "bedrijfsnaam",
      label: "Naam asbestdeskundig bedrijf",
    },
    {
      sleutel: "status",
      label: "Status",
    },
    {
      sleutel: "postcode",
      label: "Postcode",
    },
    {
      sleutel: "gemeente",
      label: "Gemeente",
    },
    {
      sleutel: "straat",
      label: "Straat",
    },
    {
      sleutel: "huisnummer",
      label: "Huisnummer",
    },
    {
      sleutel: "extraAdresDetails",
      label: "Extra adres details",
    },
    {
      sleutel: "perceelGemeenteCode",
      label: "Perceel gemeente code",
    },
    {
      sleutel: "perceelAfdelingscode",
      label: "Perceel afdelingscode",
    },
    {
      sleutel: "perceelSectieCode",
      label: "Perceel sectie code",
    },
    {
      sleutel: "attestId",
      label: "Liggingsadres",
    },
    {
      sleutel: "controle",
      label: "Controle",
    },
  ];

function excelWaarde(
  rij: TerreincontroleExcelRij,
  sleutel: string,
): string | number {
  switch (sleutel) {
    case "googleMaps":
      return rij.googleMapsUrl
        ? "Beschikbaar"
        : "Niet beschikbaar";

    case "auditeur":
      return rij.auditeur;

    case "inspectielocatie":
      return rij.inspectielocatie;

    case "bouwjaar":
      return rij.bouwjaar;

    case "vloeroppervlakteM2":
      return rij.vloeroppervlakteM2;

    case "datumPlaatsbezoek":
      return rij.datumPlaatsbezoek;

    case "uurPlaatsbezoek":
      return rij.uurPlaatsbezoek;

    case "ovamId":
      return rij.ovamId;

    case "naamAdi":
      return rij.naamAdi;

    case "attestUrl":
      return rij.attestUrl;

    case "bedrijfsnaam":
      return rij.bedrijfsnaam;

    case "status":
      return statusLabel(
        rij.status,
      );

    case "postcode":
      return rij.postcode;

    case "gemeente":
      return rij.gemeente;

    case "straat":
      return rij.straat;

    case "huisnummer":
      return rij.huisnummer;

    case "extraAdresDetails":
      return rij.extraAdresDetails;

    case "perceelGemeenteCode":
      return rij.perceelGemeenteCode;

    case "perceelAfdelingscode":
      return rij.perceelAfdelingscode;

    case "perceelSectieCode":
      return rij.perceelSectieCode;

    case "attestId":
      return rij.attestId;

    case "controle":
      return rij.waarschuwingen
        .length === 0
        ? "Geldig"
        : rij.waarschuwingen.join(
            " | ",
          );

    default:
      return "";
  }
}

function excelFilterWaarde(
  rij: TerreincontroleExcelRij,
  sleutel: string,
) {
  const waarde =
    excelWaarde(
      rij,
      sleutel,
    );

  const tekst =
    String(waarde).trim();

  return tekst || "—";
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
    actieveImport,
    setActieveImport,
  ] = useState<
    TerreincontroleExcelState | null
  >(null);

  const [
    importOpslagGeladen,
    setImportOpslagGeladen,
  ] = useState(false);

  const [
    geselecteerdeSleutels,
    setGeselecteerdeSleutels,
  ] = useState<
    Set<string>
  >(new Set());

  const standaardAuditeur =
    actieveImport
      ?.standaardAuditeur ??
    state.standaardAuditeur ??
    "";

  const [
    planningKleuren,
    setPlanningKleuren,
  ] = useState<
    TerreincontroleExcelRij["planningStatus"][]
  >(() => [
    ...PLANNING_KLEUREN,
  ]);

  const [
    excelFilters,
    setExcelFilters,
  ] = useState<
    Record<string, string[]>
  >({});

  const [
    excelSortering,
    setExcelSortering,
  ] = useState<ExcelSortering>(
    null,
  );

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

  const [
    reserveringTimerNu,
    setReserveringTimerNu,
  ] = useState(0);

  useEffect(() => {
    setReserveringTimerNu(
      Date.now(),
    );

    const interval =
      window.setInterval(
        () => {
          setReserveringTimerNu(
            Date.now(),
          );
        },
        1_000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, []);

  useEffect(() => {
    let actief = true;

    void leesBewaardeTerreincontroleImport()
      .then(
        (opgeslagenImport) => {
          if (
            !actief ||
            !opgeslagenImport
          ) {
            return;
          }

          setActieveImport(
            opgeslagenImport.importState,
          );

          setRijen(
            opgeslagenImport.rijen,
          );

          setGeselecteerdeSleutels(
            new Set(),
          );
        },
      )
      .catch(
        (fout: unknown) => {
          console.error(
            "Bewaarde terreincontrole-import kon niet worden geladen.",
            fout,
          );
        },
      )
      .finally(
        () => {
          if (actief) {
            setImportOpslagGeladen(
              true,
            );
          }
        },
      );

    return () => {
      actief = false;
    };
  }, []);

  useEffect(() => {
    if (
      !state.succes ||
      !state.rijen
    ) {
      return;
    }

    const nieuweRijen =
      state.rijen.map(
        (rij) => ({
          ...rij,
          auditeur:
            state.standaardAuditeur ??
            rij.auditeur,
        }),
      );

    setActieveImport({
      ...state,
      rijen: nieuweRijen,
    });

    setRijen(
      nieuweRijen,
    );

    setGeselecteerdeSleutels(
      new Set(),
    );

    setPlanningKleuren([
      ...PLANNING_KLEUREN,
    ]);

    setExcelFilters({});
    setExcelSortering(null);
    setPlanningZoekterm("");

    setActieveKaartRijSleutel(
      null,
    );
  }, [
    state,
  ]);

  useEffect(() => {
    if (
      !importOpslagGeladen ||
      !actieveImport
    ) {
      return;
    }

    void bewaarTerreincontroleImport({
      versie: 1,
      importState: {
        ...actieveImport,
        rijen,
      },
      rijen,
    }).catch(
      (fout: unknown) => {
        console.error(
          "Terreincontrole-import kon niet lokaal worden bewaard.",
          fout,
        );
      },
    );
  }, [
    actieveImport,
    importOpslagGeladen,
    rijen,
  ]);

  useEffect(() => {
    if (
      !bevestigState.succes
    ) {
      return;
    }

    setGeselecteerdeSleutels(
      new Set(),
    );
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
          } else if (
            "verlooptOp" in
              resultaat &&
            resultaat.verlooptOp
          ) {
            setRijen(
              (huidigeRijen) =>
                huidigeRijen.map(
                  (rij) =>
                    geselecteerdeSleutels.has(
                      rij.sleutel,
                    ) &&
                    rij.beschikbaarheid ===
                      "DOOR_MIJ"
                      ? {
                          ...rij,
                          reserveringVerlooptOp:
                            resultaat.verlooptOp,
                        }
                      : rij,
                ),
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

      const gefilterd =
        rijen.filter((rij) => {
          const voldoetAanKleur =
            planningKleuren.includes(
              rij.planningStatus,
            );

          if (!voldoetAanKleur) {
            return false;
          }

          if (zoekterm) {
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

            if (
              !zoekbareTekst.includes(
                zoekterm,
              )
            ) {
              return false;
            }
          }

          return Object.entries(
            excelFilters,
          ).every(
            ([
              sleutel,
              waarden,
            ]) =>
              waarden.length === 0 ||
              waarden.includes(
                excelFilterWaarde(
                  rij,
                  sleutel,
                ),
              ),
          );
        });

      if (!excelSortering) {
        return gefilterd;
      }

      return gefilterd
        .map(
          (rij, index) => ({
            rij,
            index,
          }),
        )
        .sort((a, b) => {
          const waardeA =
            excelWaarde(
              a.rij,
              excelSortering.kolom,
            );

          const waardeB =
            excelWaarde(
              b.rij,
              excelSortering.kolom,
            );

          let vergelijking = 0;

          const getalA =
            typeof waardeA ===
              "number"
              ? waardeA
              : Number.NaN;

          const getalB =
            typeof waardeB ===
              "number"
              ? waardeB
              : Number.NaN;

          if (
            Number.isFinite(getalA) &&
            Number.isFinite(getalB)
          ) {
            vergelijking =
              getalA - getalB;
          } else {
            vergelijking =
              String(waardeA)
                .localeCompare(
                  String(waardeB),
                  "nl-BE",
                  {
                    numeric: true,
                    sensitivity:
                      "base",
                  },
                );
          }

          if (vergelijking === 0) {
            return (
              a.index - b.index
            );
          }

          return excelSortering.richting ===
            "oplopend"
            ? vergelijking
            : -vergelijking;
        })
        .map(
          ({ rij }) => rij,
        );
    }, [
      rijen,
      planningKleuren,
      planningZoekterm,
      excelFilters,
      excelSortering,
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
        actieveImport
          ?.bestandsnaam ??
        state.bestandsnaam ??
        "",

      rijen:
        geselecteerdeRijen.map(
          (rij) => ({
            excelRij:
              rij.excelRij,

            auditeur:
              standaardAuditeur,

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

  function maakKolomKop(
    sleutel: string,
  ) {
    const kolom =
      EXCEL_KOLOMMEN.find(
        (item) =>
          item.sleutel ===
          sleutel,
      );

    if (!kolom) {
      return null;
    }

    return (
      <ExcelKolomFilter
        kolom={kolom.sleutel}
        label={kolom.label}
        waarden={rijen.map(
          (rij) =>
            excelFilterWaarde(
              rij,
              kolom.sleutel,
            ),
        )}
        geselecteerdeWaarden={
          excelFilters[
            kolom.sleutel
          ] ?? []
        }
        sortering={
          excelSortering
        }
        onFilterWijzigen={(
          waarden,
        ) =>
          setExcelFilters(
            (huidige) => ({
              ...huidige,
              [kolom.sleutel]:
                waarden,
            }),
          )
        }
        onSorteren={(
          richting,
        ) =>
          setExcelSortering({
            kolom:
              kolom.sleutel,
            richting,
          })
        }
        onSorteringWissen={() =>
          setExcelSortering(
            (huidige) =>
              huidige?.kolom ===
              kolom.sleutel
                ? null
                : huidige,
          )
        }
      />
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
            <p>
              {state.message}
            </p>

          </div>
        ) : null}

        {actieveImport
          ?.bestandsnaam &&
        actieveImport
          .opgeladenOp ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-slate-700">
            <p className="font-bold text-emerald-800">
              {rijen.length} plaatsbezoek(en) beschikbaar
            </p>

            <p className="mt-1">
              <span className="font-bold text-slate-900">
                Bestand:
              </span>{" "}
              {
                actieveImport.bestandsnaam
              }
            </p>

            <p className="mt-0.5">
              <span className="font-bold text-slate-900">
                Opgeladen op:
              </span>{" "}
              {formatteerUploadtijdstip(
                actieveImport.opgeladenOp,
              )}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Deze import blijft bewaard totdat een nieuw Excelbestand succesvol wordt opgeladen.
            </p>
          </div>
        ) : null}
      </div>

      {rijen.length > 0 ? (
        <>
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
            planningKleuren={
              planningKleuren
            }
            onWijzigPlanningKleuren={(
              kleuren,
            ) => {
              setPlanningKleuren(
                kleuren,
              );
            }}

            actieveRijSleutel={
              actieveKaartRijSleutel
            }
            focusVolgnummer={
              kaartFocusVolgnummer
            }
            geselecteerdeRijSleutels={
              geselecteerdeSleutels
            }
            selectieBezigSleutels={
              reserveringBezig
            }
            onWijzigSelectie={
              wijzigSelectie
            }
          />

          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-2xl">
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

              <button
                type="button"
                onClick={() => {
                  setExcelFilters(
                    {},
                  );
                  setExcelSortering(
                    null,
                  );
                }}
                disabled={
                  Object.values(
                    excelFilters,
                  ).every(
                    (waarden) =>
                      waarden.length ===
                      0,
                  ) &&
                  !excelSortering
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Alle kolomfilters wissen
              </button>
            </div>

            <p className="mt-2 text-xs font-medium text-slate-500">
              {zichtbareRijen.length} van{" "}
              {rijen.length} plaatsbezoeken zichtbaar.
            </p>
          </div>

          <div className="h-[72vh] min-h-[520px] overflow-auto bg-white">
            <table className="min-w-[3300px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-20 bg-slate-100">
                <tr>
                  <th className="sticky left-0 z-30 border-b border-r border-slate-300 bg-slate-100 px-1.5 py-2">
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

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "googleMaps",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "auditeur",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "datumPlaatsbezoek",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "uurPlaatsbezoek",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "inspectielocatie",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "bouwjaar",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "vloeroppervlakteM2",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "ovamId",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "naamAdi",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "attestUrl",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "bedrijfsnaam",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "status",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "postcode",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "gemeente",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "straat",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "huisnummer",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "extraAdresDetails",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "perceelGemeenteCode",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "perceelAfdelingscode",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "perceelSectieCode",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "attestId",
                    )}
                  </th>

                  <th className="border-b border-slate-300 px-1.5 py-2">
                    {maakKolomKop(
                      "controle",
                    )}
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
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-1.5 py-2 align-top">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                              <span>
                                Door jou gekozen
                              </span>

                              {formatteerReserveringAfteltijd(
                                rij.reserveringVerlooptOp,
                                reserveringTimerNu,
                              ) ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                  >
                                    ·
                                  </span>

                                  <span className="font-mono tabular-nums">
                                    nog{" "}
                                    {formatteerReserveringAfteltijd(
                                      rij.reserveringVerlooptOp,
                                      reserveringTimerNu,
                                    )}
                                  </span>
                                </>
                              ) : null}
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

                      <td className="px-1.5 py-2 align-top">
                        {rij.googleMapsUrl ? (
                          <a
                            href={
                              rij.googleMapsUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex whitespace-nowrap rounded-lg bg-blue-700 px-2 py-1.5 font-bold text-white hover:bg-blue-800"
                          >
                            Open kaart ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <div className="min-w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-800">
                          {toonTekst(
                            rij.auditeur,
                          )}
                        </div>
                      </td>

                      <td className="px-1.5 py-2 align-top whitespace-nowrap">
                        {toonTekst(
                          rij.datumPlaatsbezoek,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top whitespace-nowrap">
                        {toonTekst(
                          rij.uurPlaatsbezoek,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <p className="w-48 whitespace-pre-wrap font-medium">
                          {toonTekst(
                            rij.inspectielocatie,
                          )}
                        </p>
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.bouwjaar,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.vloeroppervlakteM2,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <span className="whitespace-nowrap font-semibold">
                          <div className="min-w-44">
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

                      <td className="px-1.5 py-2 align-top">
                        <p className="w-40 font-semibold">
                          {toonTekst(
                            rij.naamAdi,
                          )}
                        </p>
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {rij.attestUrl ? (
                          <a
                            href={
                              rij.attestUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-56 break-all font-semibold text-blue-700 hover:underline"
                          >
                            {
                              rij.attestUrl
                            }
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <p className="w-48 font-semibold">
                          {toonTekst(
                            rij.bedrijfsnaam,
                          )}
                        </p>
                      </td>

                      <td className="px-1.5 py-2 align-top">
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
                          className="h-8 w-40 rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-emerald-600"
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

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.postcode,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <p className="w-44">
                          {toonTekst(
                            rij.gemeente,
                          )}
                        </p>
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <p className="w-52">
                          {toonTekst(
                            rij.straat,
                          )}
                        </p>
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.huisnummer,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <p className="w-44 whitespace-pre-wrap">
                          {toonTekst(
                            rij.extraAdresDetails,
                          )}
                        </p>
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.perceelGemeenteCode,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.perceelAfdelingscode,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {toonTekst(
                          rij.perceelSectieCode,
                        )}
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        <span className="block w-52 break-all font-mono text-[10px]">
                          {rij.attestId ||
                            "Geen Attest-ID gevonden"}
                        </span>
                      </td>

                      <td className="px-1.5 py-2 align-top">
                        {rij.waarschuwingen
                          .length ===
                        0 ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                            Geldig
                          </span>
                        ) : (
                          <ul className="w-52 space-y-1 text-[10px] font-medium text-red-700">
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
                  plaatsbezoeken. De
                  auditeur wordt automatisch
                  bepaald op basis van de
                  ingelogde gebruiker.
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

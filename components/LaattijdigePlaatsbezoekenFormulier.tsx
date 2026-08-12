"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useQueryClient,
} from "@tanstack/react-query";

import {
  meldLaattijdigePlaatsbezoeken,
  type LaattijdigeMeldingState,
} from "@/app/aanmelden-laattijdige-plaatsbezoeken/actions";
import {
  LAATTIJDIGE_PLAATSBEZOEKEN_QUERY_SLEUTEL,
} from "@/hooks/useLaattijdigePlaatsbezoekenQuery";

type Optie = {
  waarde: string;
  label: string;
};

type Bezoek = {
  id: string;
  gemeente: string;
  straat: string;
  huisnummer: string;
  busnummer: string;
  extraAdresdetails: string;
  gemeenschappelijkeDelen: boolean;
  datum: string;
  tijdstip: string;
  reden: string;
};

type AdresOpties = {
  gemeente: Optie[];
  straat: Optie[];
  huisnummer: Optie[];
  busnummer: Optie[];
};

const beginstatus:
  LaattijdigeMeldingState = {};

const invoerStijl =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400";

function nieuwBezoek(): Bezoek {
  return {
    id: crypto.randomUUID(),
    gemeente: "",
    straat: "",
    huisnummer: "",
    busnummer: "",
    extraAdresdetails: "",
    gemeenschappelijkeDelen:
      false,
    datum: "",
    tijdstip: "",
    reden: "",
  };
}

function legeOpties(): AdresOpties {
  return {
    gemeente: [],
    straat: [],
    huisnummer: [],
    busnummer: [],
  };
}

function isMeerDan24Uur(
  bezoek: Bezoek,
) {
  if (
    !bezoek.datum ||
    !bezoek.tijdstip
  ) {
    return false;
  }

  const moment = new Date(
    `${bezoek.datum}T${bezoek.tijdstip}:00`,
  );

  return (
    !Number.isNaN(
      moment.getTime(),
    ) &&
    moment.getTime() -
      Date.now() >
      24 * 60 * 60 * 1000
  );
}

export function LaattijdigePlaatsbezoekenFormulier() {
  const [
    state,
    formAction,
    isBezig,
  ] = useActionState(
    meldLaattijdigePlaatsbezoeken,
    beginstatus,
  );

  const queryClient =
    useQueryClient();

  useEffect(() => {
    if (!state.geslaagd) {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey:
        LAATTIJDIGE_PLAATSBEZOEKEN_QUERY_SLEUTEL,
    });
  }, [
    queryClient,
    state.geslaagd,
  ]);

  const [naamAdi, setNaamAdi] =
    useState("");

  const [
    bedrijfsnaam,
    setBedrijfsnaam,
  ] = useState("");


  const [bezoeken, setBezoeken] =
    useState<Bezoek[]>(() => [
      nieuwBezoek(),
    ]);

  const [opties, setOpties] =
    useState<
      Record<string, AdresOpties>
    >({});

  const timers = useRef<
    Record<
      string,
      ReturnType<typeof setTimeout>
    >
  >({});

  const heeft24UurBlokkade =
    bezoeken.some(
      isMeerDan24Uur,
    );

  function wijzigBezoek(
    id: string,
    wijziging: Partial<Bezoek>,
  ) {
    setBezoeken((huidige) =>
      huidige.map((bezoek) =>
        bezoek.id === id
          ? {
              ...bezoek,
              ...wijziging,
            }
          : bezoek,
      ),
    );
  }

  function zetOpties(
    id: string,
    type: keyof AdresOpties,
    waarden: Optie[],
  ) {
    setOpties((huidige) => ({
      ...huidige,
      [id]: {
        ...(huidige[id] ??
          legeOpties()),
        [type]: waarden,
      },
    }));
  }

  function zoek(
    bezoek: Bezoek,
    type:
      | "gemeente"
      | "straat"
      | "huisnummer",
    q: string,
  ) {
    const minimum =
      type === "huisnummer"
        ? 1
        : 2;

    zetOpties(
      bezoek.id,
      type,
      [],
    );

    const sleutel =
      `${bezoek.id}:${type}`;

    if (timers.current[sleutel]) {
      clearTimeout(
        timers.current[sleutel],
      );
    }

    if (q.trim().length < minimum) {
      return;
    }

    timers.current[sleutel] =
      setTimeout(async () => {
        const params =
          new URLSearchParams({
            type,
            q: q.trim(),
            gemeente:
              bezoek.gemeente,
            straat: bezoek.straat,
          });

        try {
          const antwoord =
            await fetch(
              `/api/publiek/geopunt?${params}`,
            );

          const data =
            (await antwoord.json()) as {
              opties?: Optie[];
            };

          zetOpties(
            bezoek.id,
            type,
            Array.isArray(
              data.opties,
            )
              ? data.opties
              : [],
          );
        } catch {
          zetOpties(
            bezoek.id,
            type,
            [],
          );
        }
      }, 300);
  }

  async function laadBusnummers(
    bezoek: Bezoek,
    huisnummer: string,
  ) {
    const params =
      new URLSearchParams({
        type: "busnummer",
        gemeente:
          bezoek.gemeente,
        straat: bezoek.straat,
        huisnummer,
      });

    try {
      const antwoord = await fetch(
        `/api/publiek/geopunt?${params}`,
      );

      const data =
        (await antwoord.json()) as {
          opties?: Optie[];
        };

      zetOpties(
        bezoek.id,
        "busnummer",
        Array.isArray(data.opties)
          ? data.opties
          : [],
      );
    } catch {
      zetOpties(
        bezoek.id,
        "busnummer",
        [],
      );
    }
  }


  if (state.geslaagd) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl">
        <div className="text-5xl text-emerald-700">
          ✓
        </div>

        <h2 className="mt-4 text-2xl font-black text-slate-950">
          Je melding is ontvangen
        </h2>

        <p className="mt-3 text-slate-600">
          {state.aantal ?? 0}{" "}
          plaatsbezoek(en) geregistreerd.
        </p>

        <p className="mt-2 font-bold">
          Referentie: LP-
          {String(
            state.referentie ?? 0,
          ).padStart(6, "0")}
        </p>

        <a
          href="/aanmelden-laattijdige-plaatsbezoeken"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white"
        >
          Nieuwe melding
        </a>
      </section>
    );
  }

  return (
    <form
      action={formAction}
      autoComplete="off"
      className="space-y-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8"
    >
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[10000px]"
      />

      {state.fout ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          {state.fout}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-black">
          Gegevens asbestdeskundige
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-bold">
              Naam ADI *
            </span>
            <input
              name="naamAdi"
              autoComplete="off"
              aria-autocomplete="none"
              spellCheck={false}
              data-lpignore="true"
              data-form-type="other"
              required
              maxLength={255}
              value={naamAdi}
              onChange={(event) => {
                setNaamAdi(
                  event.target.value,
                );
              }}
              className={invoerStijl}
            />
          </label>

          <label>
            <span className="text-sm font-bold">
              Naam bedrijf *
            </span>
            <input
              name="bedrijfsnaam"
              autoComplete="off"
              aria-autocomplete="none"
              spellCheck={false}
              data-lpignore="true"
              data-form-type="other"
              required
              maxLength={500}
              value={bedrijfsnaam}
              onChange={(event) => {
                setBedrijfsnaam(
                  event.target.value,
                );
              }}
              className={invoerStijl}
            />
          </label>
        </div>

      </section>

      <section className="border-t pt-7">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-black">
            Inspectielocaties
          </h2>

          <button
            type="button"
            disabled={
              bezoeken.length >= 20
            }
            onClick={() => {
              setBezoeken(
                (huidige) => [
                  ...huidige,
                  nieuwBezoek(),
                ],
              );
            }}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400"
          >
            + Locatie
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {bezoeken.map(
            (bezoek, index) => {
              const bezoekOpties =
                opties[bezoek.id] ??
                legeOpties();

              return (
                <article
                  key={bezoek.id}
                  className="rounded-2xl border bg-slate-50 p-5"
                >
                  <div className="flex justify-between">
                    <h3 className="font-black">
                      Plaatsbezoek{" "}
                      {index + 1}
                    </h3>

                    {bezoeken.length >
                    1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBezoeken(
                            (huidige) =>
                              huidige.filter(
                                (item) =>
                                  item.id !==
                                  bezoek.id,
                              ),
                          );
                        }}
                        className="text-xs font-bold text-red-700"
                      >
                        Verwijderen
                      </button>
                    ) : null}
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-xl border bg-white p-3">
                    <input
                      type="checkbox"
                      checked={
                        bezoek.gemeenschappelijkeDelen
                      }
                      onChange={(event) => {
                        wijzigBezoek(
                          bezoek.id,
                          {
                            gemeenschappelijkeDelen:
                              event.target
                                .checked,
                          },
                        );
                      }}
                      className="size-5"
                    />
                    <span className="text-sm font-bold">
                      Gemeenschappelijke
                      delen
                    </span>
                  </label>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="relative">
                      <span className="text-sm font-bold">
                        Gemeente *
                      </span>
                      <input
                        required
                        value={
                          bezoek.gemeente
                        }
                        onChange={(event) => {
                          const waarde =
                            event.target.value;
                          wijzigBezoek(
                            bezoek.id,
                            {
                              gemeente:
                                waarde,
                              straat: "",
                              huisnummer:
                                "",
                              busnummer: "",
                            },
                          );
                          zoek(
                            bezoek,
                            "gemeente",
                            waarde,
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                      {bezoekOpties
                        .gemeente.length >
                      0 ? (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white p-1 shadow-xl">
                          {bezoekOpties.gemeente.map(
                            (optie) => (
                              <button
                                key={
                                  optie.waarde
                                }
                                type="button"
                                onClick={() => {
                                  wijzigBezoek(
                                    bezoek.id,
                                    {
                                      gemeente:
                                        optie.waarde,
                                      straat:
                                        "",
                                      huisnummer:
                                        "",
                                      busnummer:
                                        "",
                                    },
                                  );
                                  zetOpties(
                                    bezoek.id,
                                    "gemeente",
                                    [],
                                  );
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50"
                              >
                                {
                                  optie.label
                                }
                              </button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </label>

                    <label className="relative">
                      <span className="text-sm font-bold">
                        Straat *
                      </span>
                      <input
                        required
                        disabled={
                          !bezoek.gemeente
                        }
                        value={
                          bezoek.straat
                        }
                        onChange={(event) => {
                          const waarde =
                            event.target.value;
                          wijzigBezoek(
                            bezoek.id,
                            {
                              straat: waarde,
                              huisnummer:
                                "",
                              busnummer: "",
                            },
                          );
                          zoek(
                            {
                              ...bezoek,
                              straat: waarde,
                            },
                            "straat",
                            waarde,
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                      {bezoekOpties.straat
                        .length > 0 ? (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white p-1 shadow-xl">
                          {bezoekOpties.straat.map(
                            (optie) => (
                              <button
                                key={
                                  optie.waarde
                                }
                                type="button"
                                onClick={() => {
                                  wijzigBezoek(
                                    bezoek.id,
                                    {
                                      straat:
                                        optie.waarde,
                                      huisnummer:
                                        "",
                                      busnummer:
                                        "",
                                    },
                                  );
                                  zetOpties(
                                    bezoek.id,
                                    "straat",
                                    [],
                                  );
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50"
                              >
                                {
                                  optie.label
                                }
                              </button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </label>

                    <label className="relative">
                      <span className="text-sm font-bold">
                        Huisnummer *
                      </span>
                      <input
                        required
                        disabled={
                          !bezoek.straat
                        }
                        value={
                          bezoek.huisnummer
                        }
                        onChange={(event) => {
                          const waarde =
                            event.target.value;
                          wijzigBezoek(
                            bezoek.id,
                            {
                              huisnummer:
                                waarde,
                              busnummer: "",
                            },
                          );
                          zoek(
                            bezoek,
                            "huisnummer",
                            waarde,
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                      {bezoekOpties
                        .huisnummer.length >
                      0 ? (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white p-1 shadow-xl">
                          {bezoekOpties.huisnummer.map(
                            (optie) => (
                              <button
                                key={
                                  optie.waarde
                                }
                                type="button"
                                onClick={() => {
                                  wijzigBezoek(
                                    bezoek.id,
                                    {
                                      huisnummer:
                                        optie.waarde,
                                      busnummer:
                                        "",
                                    },
                                  );
                                  zetOpties(
                                    bezoek.id,
                                    "huisnummer",
                                    [],
                                  );
                                  void laadBusnummers(
                                    bezoek,
                                    optie.waarde,
                                  );
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50"
                              >
                                {
                                  optie.label
                                }
                              </button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </label>

                    <label>
                      <span className="text-sm font-bold">
                        Busnummer
                        <span className="font-normal text-slate-500">
                          {" "}
                          (optioneel)
                        </span>
                      </span>
                      <select
                        disabled={
                          !bezoek.huisnummer
                        }
                        value={
                          bezoek.busnummer
                        }
                        onFocus={() => {
                          if (
                            bezoek.huisnummer
                          ) {
                            void laadBusnummers(
                              bezoek,
                              bezoek.huisnummer,
                            );
                          }
                        }}
                        onChange={(event) => {
                          wijzigBezoek(
                            bezoek.id,
                            {
                              busnummer:
                                event.target
                                  .value,
                            },
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      >
                        <option value="">
                          Geen busnummer
                        </option>
                        {bezoekOpties.busnummer.map(
                          (optie) => (
                            <option
                              key={
                                optie.waarde
                              }
                              value={
                                optie.waarde
                              }
                            >
                              {
                                optie.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="md:col-span-2">
                      <span className="text-sm font-bold">
                        Extra adresdetails
                        <span className="font-normal text-slate-500">
                          {" "}
                          (optioneel)
                        </span>
                      </span>
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={
                          bezoek.extraAdresdetails
                        }
                        onChange={(event) => {
                          wijzigBezoek(
                            bezoek.id,
                            {
                              extraAdresdetails:
                                event.target
                                  .value,
                            },
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                    </label>

                    <label>
                      <span className="text-sm font-bold">
                        Datum *
                      </span>
                      <input
                        type="date"
                        required
                        min={
                          new Date()
                            .toISOString()
                            .slice(0, 10)
                        }
                        value={
                          bezoek.datum
                        }
                        onChange={(event) => {
                          wijzigBezoek(
                            bezoek.id,
                            {
                              datum:
                                event.target
                                  .value,
                            },
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                    </label>

                    <label>
                      <span className="text-sm font-bold">
                        Tijdstip *
                      </span>
                      <input
                        type="time"
                        required
                        value={
                          bezoek.tijdstip
                        }
                        onChange={(event) => {
                          wijzigBezoek(
                            bezoek.id,
                            {
                              tijdstip:
                                event.target
                                  .value,
                            },
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                    </label>

                    {isMeerDan24Uur(
                      bezoek,
                    ) ? (
                      <div className="md:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                        Dit plaatsbezoek ligt
                        meer dan 24 uur in de
                        toekomst en moet via
                        het OVAM-platform
                        aangemeld worden.
                      </div>
                    ) : null}

                    <label className="md:col-span-2">
                      <span className="text-sm font-bold">
                        Reden laattijdige
                        melding *
                      </span>
                      <textarea
                        required
                        rows={4}
                        minLength={3}
                        maxLength={2000}
                        value={
                          bezoek.reden
                        }
                        onChange={(event) => {
                          wijzigBezoek(
                            bezoek.id,
                            {
                              reden:
                                event.target
                                  .value,
                            },
                          );
                        }}
                        className={
                          invoerStijl
                        }
                      />
                    </label>
                  </div>
                </article>
              );
            },
          )}
        </div>
      </section>

      <input
        type="hidden"
        name="bezoekenJson"
        value={JSON.stringify(
          bezoeken.map(
            (bezoek) => ({
              gemeente:
                bezoek.gemeente,
              straat:
                bezoek.straat,
              huisnummer:
                bezoek.huisnummer,
              busnummer:
                bezoek.busnummer,
              extraAdresdetails:
                bezoek.extraAdresdetails,
              gemeenschappelijkeDelen:
                bezoek.gemeenschappelijkeDelen,
              datum:
                bezoek.datum,
              tijdstip:
                bezoek.tijdstip,
              reden:
                bezoek.reden,
            }),
          ),
        )}
      />

      <button
        type="submit"
        disabled={
          isBezig ||
          heeft24UurBlokkade
        }
        className="h-12 w-full rounded-xl bg-emerald-700 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isBezig
          ? "Melding versturen..."
          : "Melding versturen"}
      </button>
    </form>
  );
}

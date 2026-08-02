import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "—";
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

function toonWaarde(
  waarde:
    | string
    | number
    | null
    | undefined,
) {
  if (
    waarde === null ||
    waarde === undefined ||
    String(waarde).trim() === ""
  ) {
    return "—";
  }

  return String(waarde);
}

function deskcontroleStatusLabel(
  status: string,
) {
  switch (status) {
    case "IN_OPMAAK":
      return "In opmaak";

    case "GEACTUALISEERD":
      return "Geactualiseerd";

    case "AFGEROND":
      return "Afgerond";

    default:
      return "Geen";
  }
}

function deskcontroleStatusStijl(
  status: string,
) {
  switch (status) {
    case "AFGEROND":
      return "border-green-200 bg-green-100 text-green-900";

    case "GEACTUALISEERD":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";

    case "IN_OPMAAK":
      return "border-amber-200 bg-amber-100 text-amber-900";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function terreincontroleStatusLabel(
  status: string | null,
) {
  switch (status) {
    case "ACTUEEL_ATTEST":
      return "Actueel attest";

    case "IN_OPMAAK":
      return "In opmaak";

    case "GEARCHIVEERD_ATTEST":
      return "Gearchiveerd attest";

    default:
      return "Geen status";
  }
}

function terreincontroleStatusStijl(
  status: string | null,
) {
  switch (status) {
    case "ACTUEEL_ATTEST":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";

    case "IN_OPMAAK":
      return "border-amber-200 bg-amber-100 text-amber-900";

    case "GEARCHIVEERD_ATTEST":
      return "border-rose-200 bg-rose-100 text-rose-900";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

type GegevensVeldProps = {
  label: string;
  waarde:
    | string
    | number
    | null
    | undefined;
  breed?: boolean;
};

function GegevensVeld({
  label,
  waarde,
  breed = false,
}: GegevensVeldProps) {
  return (
    <div
      className={
        breed
          ? "sm:col-span-2 xl:col-span-3"
          : ""
      }
    >
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
        {toonWaarde(waarde)}
      </dd>
    </div>
  );
}

export default async function PersoonscertificaatDetailPage({
  params,
}: PaginaProps) {
  await vereisMachtiging(
    "CERTIFICATEN_BEKIJKEN",
  );

  const {
    id: idTekst,
  } = await params;

  const id = Number(idTekst);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const persoon =
    await prisma.lid.findFirst({
      where: {
        id,
        verwijderdOp: null,
      },
      select: {
        id: true,
        naamPersoon: true,
        telefoonnummer: true,
        mailadres: true,
        ovamId: true,
        certificaatnummer: true,
        uitgereiktOp: true,
        bedrijf: true,
        aansluiting: true,
        opmerking: true,
        certificatiePlatform:
          true,

        deskcontroles: {
          where: {
            verwijderdOp: null,
          },
          orderBy: [
            {
              datumControle:
                "desc",
            },
            {
              id: "desc",
            },
          ],
          select: {
            id: true,
            attestnummer: true,
            attestId: true,
            status: true,
            typeControle: true,
            datumControle: true,
            deadlineSanctie: true,
            deadlineCorrectie: true,
            adres: true,
            opmerkingen: true,

            procescertificaat: {
              select: {
                naamBedrijf: true,
                certificaatnummer:
                  true,
              },
            },

            vaststellingen: {
              orderBy: [
                {
                  excelRij: "asc",
                },
                {
                  id: "asc",
                },
              ],
              select: {
                id: true,
                excelRij: true,
                parameter: true,
                ncId: true,
                omschrijving: true,
                vastgesteldDoorCi:
                  true,
                verduidelijking:
                  true,
                groteImpact: true,
                categorie: true,
                motivatieAanpassing:
                  true,
              },
            },
          },
        },
      },
    });

  if (!persoon) {
    notFound();
  }

  const terreincontroles =
    await prisma.terreincontrole.findMany({
      where: {
        verwijderdOp: null,
        ovamId: persoon.ovamId,
      },
      orderBy: [
        {
          datumPlaatsbezoek:
            "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        status: true,
        factuurVerzonden: true,
        datumPlaatsbezoek:
          true,
        uurPlaatsbezoek: true,
        inspectielocatie: true,
        adres: true,
        bedrijfsnaam: true,
        attestId: true,
        opmerkingen: true,
      },
    });

  const aantalVaststellingen =
    persoon.deskcontroles.reduce(
      (
        totaal,
        deskcontrole,
      ) =>
        totaal +
        deskcontrole
          .vaststellingen.length,
      0,
    );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/persoonscertificaten"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            ← Terug naar persoonscertificaten
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {persoon.naamPersoon}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Persoonscertificaat{" "}
            {persoon.certificaatnummer}
          </p>
        </div>

        <Link
          href={`/persoonscertificaten/${persoon.id}/bewerken`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Persoonscertificaat bewerken
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            Persoonscertificaat
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {persoon.naamPersoon}
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">
                {
                  persoon
                    .deskcontroles
                    .length
                }
              </p>

              <p className="text-sm text-emerald-100">
                Deskcontroles
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">
                {
                  terreincontroles.length
                }
              </p>

              <p className="text-sm text-emerald-100">
                Terreincontroles
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">
                {
                  aantalVaststellingen
                }
              </p>

              <p className="text-sm text-emerald-100">
                Vaststellingen
              </p>
            </div>
          </div>
        </header>

        <dl className="grid gap-x-8 gap-y-6 px-6 py-6 sm:grid-cols-2 sm:px-8 xl:grid-cols-3">
          <GegevensVeld
            label="Naam"
            waarde={
              persoon.naamPersoon
            }
          />

          <GegevensVeld
            label="OVAM-ID"
            waarde={persoon.ovamId}
          />

          <GegevensVeld
            label="Certificaatnummer"
            waarde={
              persoon
                .certificaatnummer
            }
          />

          <GegevensVeld
            label="Uitgereikt op"
            waarde={formatteerDatum(
              persoon.uitgereiktOp,
            )}
          />

          <GegevensVeld
            label="Telefoonnummer"
            waarde={
              persoon.telefoonnummer
            }
          />

          <GegevensVeld
            label="E-mailadres"
            waarde={persoon.mailadres}
          />

          <GegevensVeld
            label="Bedrijf"
            waarde={persoon.bedrijf}
          />

          <GegevensVeld
            label="Aansluiting"
            waarde={
              persoon.aansluiting
            }
          />

          <GegevensVeld
            label="Certificatieplatform"
            waarde={
              persoon
                .certificatiePlatform
            }
          />

          <GegevensVeld
            label="Opmerking"
            waarde={persoon.opmerking}
            breed
          />
        </dl>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Deskcontroles en vaststellingen
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Alle actieve deskcontroles,
            met de vaststellingen per
            controle.
          </p>
        </div>

        {persoon.deskcontroles.length ===
        0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="font-bold text-slate-900">
              Geen deskcontroles
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Aan dit persoonscertificaat
              zijn geen actieve
              deskcontroles gekoppeld.
            </p>
          </div>
        ) : (
          persoon.deskcontroles.map(
            (deskcontrole) => (
              <article
                key={deskcontrole.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-950">
                        {deskcontrole.attestnummer ??
                          `Deskcontrole #${deskcontrole.id}`}
                      </h3>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${deskcontroleStatusStijl(
                          deskcontrole.status,
                        )}`}
                      >
                        {deskcontroleStatusLabel(
                          deskcontrole.status,
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      Controle op{" "}
                      {formatteerDatum(
                        deskcontrole
                          .datumControle,
                      )}
                      {" · "}
                      {deskcontrole
                        .procescertificaat
                        ?.naamBedrijf ??
                        "Geen bedrijf gekoppeld"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        deskcontrole
                          .vaststellingen
                          .length
                      }{" "}
                      {deskcontrole
                        .vaststellingen
                        .length === 1
                        ? "vaststelling"
                        : "vaststellingen"}
                    </p>
                  </div>

                  <Link
                    href={`/deskcontroles/${deskcontrole.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Deskcontrole bekijken
                  </Link>
                </header>

                <dl className="grid gap-4 border-b border-slate-200 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  <GegevensVeld
                    label="Attest-ID"
                    waarde={
                      deskcontrole.attestId
                    }
                  />

                  <GegevensVeld
                    label="Type controle"
                    waarde={
                      deskcontrole.typeControle ===
                      "OPVOLGING"
                        ? "Opvolging"
                        : deskcontrole.typeControle ===
                            "NIEUWE_CONTROLE"
                          ? "Nieuwe controle"
                          : "—"
                    }
                  />

                  <GegevensVeld
                    label="Deadline sanctie"
                    waarde={formatteerDatum(
                      deskcontrole
                        .deadlineSanctie,
                    )}
                  />

                  <GegevensVeld
                    label="Deadline correctie"
                    waarde={formatteerDatum(
                      deskcontrole
                        .deadlineCorrectie,
                    )}
                  />

                  <GegevensVeld
                    label="Adres"
                    waarde={
                      deskcontrole.adres
                    }
                  />

                  <GegevensVeld
                    label="Opmerkingen"
                    waarde={
                      deskcontrole
                        .opmerkingen
                    }
                  />
                </dl>

                {deskcontrole
                  .vaststellingen
                  .length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-500">
                    Geen vaststellingen
                    voor deze deskcontrole.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1500px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">
                            NC-ID
                          </th>
                          <th className="px-4 py-3">
                            Parameter
                          </th>
                          <th className="px-4 py-3">
                            Omschrijving
                          </th>
                          <th className="px-4 py-3">
                            Vastgesteld door CI
                          </th>
                          <th className="px-4 py-3">
                            Verduidelijking
                          </th>
                          <th className="px-4 py-3">
                            Grote impact
                          </th>
                          <th className="px-4 py-3">
                            Categorie
                          </th>
                          <th className="px-4 py-3">
                            Motivatie aanpassing
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {deskcontrole
                          .vaststellingen
                          .map(
                            (
                              vaststelling,
                            ) => (
                              <tr
                                key={
                                  vaststelling.id
                                }
                                className="align-top hover:bg-slate-50"
                              >
                                <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">
                                  {
                                    vaststelling.ncId
                                  }
                                </td>

                                <td className="px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.parameter,
                                  )}
                                </td>

                                <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.omschrijving,
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.vastgesteldDoorCi,
                                  )}
                                </td>

                                <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.verduidelijking,
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.groteImpact,
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.categorie,
                                  )}
                                </td>

                                <td className="max-w-md whitespace-pre-wrap px-4 py-3">
                                  {toonWaarde(
                                    vaststelling.motivatieAanpassing,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ),
          )
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Terreincontroles
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Actieve terreincontroles
            gekoppeld via OVAM-ID{" "}
            {persoon.ovamId}.
          </p>
        </div>

        {terreincontroles.length ===
        0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="font-bold text-slate-900">
              Geen terreincontroles
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Er zijn geen actieve
              terreincontroles met
              hetzelfde OVAM-ID.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {terreincontroles.map(
              (terreincontrole) => (
                <article
                  key={
                    terreincontrole.id
                  }
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-950">
                        Terreincontrole #
                        {
                          terreincontrole.id
                        }
                      </h3>

                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${terreincontroleStatusStijl(
                          terreincontrole.status,
                        )}`}
                      >
                        {terreincontroleStatusLabel(
                          terreincontrole.status,
                        )}
                      </span>
                    </div>

                    <Link
                      href={`/terreincontroles-inplannen/${terreincontrole.id}`}
                      className="text-sm font-bold text-emerald-700 hover:underline"
                    >
                      Bekijken →
                    </Link>
                  </div>

                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <GegevensVeld
                      label="Datum plaatsbezoek"
                      waarde={formatteerDatum(
                        terreincontrole
                          .datumPlaatsbezoek,
                      )}
                    />

                    <GegevensVeld
                      label="Uur"
                      waarde={
                        terreincontrole
                          .uurPlaatsbezoek
                      }
                    />

                    <GegevensVeld
                      label="Inspectielocatie"
                      waarde={
                        terreincontrole
                          .inspectielocatie ??
                        terreincontrole
                          .adres
                      }
                    />

                    <GegevensVeld
                      label="Bedrijf"
                      waarde={
                        terreincontrole
                          .bedrijfsnaam
                      }
                    />

                    <GegevensVeld
                      label="Attest-ID"
                      waarde={
                        terreincontrole
                          .attestId
                      }
                    />

                    <GegevensVeld
                      label="Factuur verzonden"
                      waarde={
                        terreincontrole
                          .factuurVerzonden
                          ? "Ja"
                          : "Nee"
                      }
                    />

                    <GegevensVeld
                      label="Opmerkingen"
                      waarde={
                        terreincontrole
                          .opmerkingen
                      }
                    />
                  </dl>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

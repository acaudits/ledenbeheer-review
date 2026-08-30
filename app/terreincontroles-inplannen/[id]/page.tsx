import NextLink from "next/link";
import { notFound } from "next/navigation";

import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { prisma } from "@/lib/prisma";
import {
  formatteerDatabaseTijd,
  maakGoogleMapsUrl,
} from "@/lib/terreincontrole";
import AfwezigeTerreincontroleHerstelKnop from "@/components/AfwezigeTerreincontroleHerstelKnop";
import TerreincontroleMeerMenu from "@/components/TerreincontroleMeerMenu";

export const dynamic =
  "force-dynamic";

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
};

type GegevensVeldProps = {
  label: string;
  waarde:
    | string
    | number
    | null
    | undefined;
  volledigeBreedte?: boolean;
};

function GegevensVeld({
  label,
  waarde,
  volledigeBreedte = false,
}: GegevensVeldProps) {
  const tekst =
    waarde === null ||
    waarde === undefined ||
    String(waarde).trim() === ""
      ? "—"
      : String(waarde);

  return (
    <div
      className={
        volledigeBreedte
          ? "md:col-span-2"
          : ""
      }
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
        {tekst}
      </dd>
    </div>
  );
}

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

function formatteerDatumTijd(
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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(datum);
}

function statusStijl(
  status: string | null,
) {
  switch (status) {
    case "ACTUEEL_ATTEST":
      return "bg-emerald-100 text-emerald-800";

    case "IN_OPMAAK":
      return "bg-amber-100 text-amber-800";

    case "GEARCHIVEERD_ATTEST":
      return "bg-rose-100 text-rose-800";

    default:
      return "bg-slate-200 text-slate-700";
  }
}

export default async function TerreincontroleDetailPage({
  params,
}: PaginaProps) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rollen,
      "TERREINCONTROLES_BEHEREN",
    );



  const { id: idTekst } =
    await params;

  const id = Number(idTekst);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const terreincontrole =
    await prisma.terreincontrole.findFirst(
      {
        where: {
          id,
          verwijderdOp: null,
        },
        select: {
          id: true,
          auditeur: true,
          factuurVerzonden: true,
          status: true,

          inspectielocatie: true,
          bouwjaar: true,
          vloeroppervlakteM2: true,

          datumPlaatsbezoek: true,
          uurPlaatsbezoek: true,

          ovamId: true,
          naamAdi: true,
          attestUrl: true,
          bedrijfsnaam: true,

          postcode: true,
          gemeente: true,
          straat: true,
          huisnummer: true,
          extraAdresDetails: true,

          perceelGemeenteCode: true,
          perceelAfdelingscode: true,
          perceelSectieCode: true,

          adres: true,
          opmerkingen: true,
          attestId: true,

          bronBestandsnaam: true,
          bronExcelRij: true,

          aangemaaktOp: true,
          bijgewerktOp: true,
          afwezigOp: true,
          afwezigReden: true,
        },
      },
    );

  if (!terreincontrole) {
    notFound();
  }

  const googleMapsUrl =
    maakGoogleMapsUrl(
      terreincontrole
        .inspectielocatie ??
        terreincontrole.adres,
    );

  const status =
    terreincontrole.status ??
    "NULL";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <NextLink
              href={
                terreincontrole
                  .afwezigOp
                  ? "/terreincontroles-inplannen/afwezigen"
                  : "/terreincontroles-inplannen"
              }
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            >
              {terreincontrole
                .afwezigOp
                ? "← Terug naar afwezigen"
                : "← Terug naar terreincontroles"}
            </NextLink>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Terreincontrole #
              {terreincontrole.id}
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Detailgegevens van het
              plaatsbezoek.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {magBeheren ? (
              terreincontrole
                .afwezigOp ? (
                <AfwezigeTerreincontroleHerstelKnop
                  id={terreincontrole.id}
                />
              ) : (
                <TerreincontroleMeerMenu
                  id={terreincontrole.id}
                />
              )
            ) : null}

            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-100"
              >
                Google Maps
              </a>
            ) : null}

            {terreincontrole.attestUrl ? (
              <a
                href={
                  terreincontrole.attestUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Attest openen
              </a>
            ) : null}

          </div>
        </div>

        {terreincontrole
          .afwezigOp ? (
          <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em]">
              Afwezig
            </p>

            <h2 className="mt-1 text-lg font-black">
              Deze terreincontrole staat in de afwezigenlijst
            </h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Reden
                </dt>

                <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold">
                  {terreincontrole
                    .afwezigReden ??
                    "Geen reden geregistreerd"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Geregistreerd op
                </dt>

                <dd className="mt-1 text-sm font-semibold">
                  {new Intl.DateTimeFormat(
                    "nl-BE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  ).format(
                    terreincontrole
                      .afwezigOp,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Controle
          </h2>

          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <GegevensVeld
              label="Auditeur"
              waarde={
                terreincontrole
                  .auditeur
              }
            />

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </dt>

              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStijl(
                    terreincontrole
                      .status,
                  )}`}
                >
                  {status}
                </span>
              </dd>
            </div>

            <GegevensVeld
              label="Factuur verzonden"
              waarde={
                terreincontrole
                  .factuurVerzonden ===
                null
                  ? "NVT"
                  : terreincontrole
                        .factuurVerzonden
                    ? "Ja"
                    : "Nee"
              }
            />

            <GegevensVeld
              label="Datum plaatsbezoek"
              waarde={formatteerDatum(
                terreincontrole
                  .datumPlaatsbezoek,
              )}
            />

            <GegevensVeld
              label="Uur plaatsbezoek"
              waarde={
                formatteerDatabaseTijd(
                  terreincontrole
                    .uurPlaatsbezoek,
                )
              }
            />
          </dl>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Inspectielocatie
          </h2>

          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <GegevensVeld
              label="Inspectielocatie"
              waarde={
                terreincontrole
                  .inspectielocatie
              }
              volledigeBreedte
            />

            <GegevensVeld
              label="Adres"
              waarde={
                terreincontrole.adres
              }
              volledigeBreedte
            />

            <GegevensVeld
              label="Straat"
              waarde={
                terreincontrole.straat
              }
            />

            <GegevensVeld
              label="Huisnummer"
              waarde={
                terreincontrole
                  .huisnummer
              }
            />

            <GegevensVeld
              label="Postcode"
              waarde={
                terreincontrole
                  .postcode
              }
            />

            <GegevensVeld
              label="Gemeente"
              waarde={
                terreincontrole
                  .gemeente
              }
            />

            <GegevensVeld
              label="Extra adresdetails"
              waarde={
                terreincontrole
                  .extraAdresDetails
              }
              volledigeBreedte
            />

            <GegevensVeld
              label="Bouwjaar"
              waarde={
                terreincontrole
                  .bouwjaar
              }
            />

            <GegevensVeld
              label="Vloeroppervlakte (m²)"
              waarde={
                terreincontrole
                  .vloeroppervlakteM2
                  ?.toString()
              }
            />
          </dl>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Asbestdeskundige
          </h2>

          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <GegevensVeld
              label="Deskundige persoons-ID"
              waarde={
                terreincontrole.ovamId
              }
            />

            <GegevensVeld
              label="Deskundige naam"
              waarde={
                terreincontrole
                  .naamAdi
              }
            />

            <GegevensVeld
              label="Naam asbestdeskundig bedrijf"
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

            <div className="md:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Deskundige kwaliteitspagina
              </dt>

              <dd className="mt-1 break-all text-sm font-medium">
                {terreincontrole
                  .attestUrl ? (
                  <a
                    href={
                      terreincontrole
                        .attestUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline hover:text-emerald-900"
                  >
                    {
                      terreincontrole
                        .attestUrl
                    }
                  </a>
                ) : (
                  <span className="text-slate-900">
                    —
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Perceelgegevens
          </h2>

          <dl className="mt-5 grid gap-5 md:grid-cols-3">
            <GegevensVeld
              label="Perceel gemeente code"
              waarde={
                terreincontrole
                  .perceelGemeenteCode
              }
            />

            <GegevensVeld
              label="Perceel afdelingscode"
              waarde={
                terreincontrole
                  .perceelAfdelingscode
              }
            />

            <GegevensVeld
              label="Perceel sectie code"
              waarde={
                terreincontrole
                  .perceelSectieCode
              }
            />
          </dl>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Opmerkingen
          </h2>

          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <GegevensVeld
              label="Opmerkingen"
              waarde={
                terreincontrole
                  .opmerkingen
              }
              volledigeBreedte
            />
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Import- en systeemgegevens
          </h2>

          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <GegevensVeld
              label="Interne ID"
              waarde={
                terreincontrole.id
              }
            />

            <GegevensVeld
              label="Bronbestand"
              waarde={
                terreincontrole
                  .bronBestandsnaam
              }
            />

            <GegevensVeld
              label="Excelrij"
              waarde={
                terreincontrole
                  .bronExcelRij
              }
            />

            <GegevensVeld
              label="Aangemaakt op"
              waarde={formatteerDatumTijd(
                terreincontrole
                  .aangemaaktOp,
              )}
            />

            <GegevensVeld
              label="Bijgewerkt op"
              waarde={formatteerDatumTijd(
                terreincontrole
                  .bijgewerktOp,
              )}
            />
          </dl>
        </section>
      </div>
    </main>
  );
}

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { notFound } from "next/navigation";
import { DeskcontroleVaststellingenTabel } from "@/components/DeskcontroleVaststellingenTabel";
import { DeskcontroleDetailSnelleActies } from "@/components/DeskcontroleDetailSnelleActies";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DeskcontroleDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "";
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

function statusLabel(
  status: string,
) {
  if (status === "IN_OPMAAK") {
    return "In opmaak";
  }

  if (
    status === "GEACTUALISEERD"
  ) {
    return "Geactualiseerd";
  }

  if (status === "AFGEROND") {
    return "Afgerond";
  }

  return "Geen";
}


function typeControleLabel(
  typeControle: string | null,
) {
  if (
    typeControle ===
    "OPVOLGING"
  ) {
    return "Opvolging";
  }

  if (
    typeControle ===
    "NIEUWE_CONTROLE"
  ) {
    return "Nieuwe controle";
  }

  return "—";
}


function statusStijl(
  status: string,
) {
  if (status === "AFGEROND") {
    return "border-green-300 bg-green-100 text-green-900";
  }

  if (
    status === "GEACTUALISEERD"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "IN_OPMAAK") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}


type GegevensVeldProps = {
  label: string;
  waarde?: string | null;
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
        {waarde?.trim() || "—"}
      </dd>
    </div>
  );
}

export default async function DeskcontroleDetailPage({
  params,
}: DeskcontroleDetailPageProps) {
  const gebruiker = await vereisMachtiging("DESKCONTROLES_BEKIJKEN");

  const magBeheren = heeftMachtiging(
    gebruiker.rol,
    "DESKCONTROLES_BEHEREN",
  );

  function Link(
    props: ComponentProps<typeof NextLink>,
  ) {
    const bestemming =
      typeof props.href === "string"
        ? props.href
        : "";

    if (
      !magBeheren &&
      bestemming.endsWith("/bewerken")
    ) {
      return null;
    }

    return <NextLink {...props} />;
  }

  const { id: idWaarde } =
    await params;

  const id = Number(idWaarde);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const deskcontrole =
    await prisma.deskcontrole.findUnique({
      where: {
        id,
      },
      include: {
        lid: {
          select: {
            naamPersoon: true,
            ovamId: true,
            certificaatnummer: true,
            certificatiePlatform: true,
          },
        },
        procescertificaat: {
          select: {
            naamBedrijf: true,
            kboNummer: true,
            certificaatnummer: true,
            oneDrive: true,
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
        },
      },
    });

  if (!deskcontrole) {
    notFound();
  }

  const vaststellingRijen =
    deskcontrole.vaststellingen.map(
      (vaststelling) => ({
        id: vaststelling.id,
        excelRij:
          vaststelling.excelRij,
        parameter:
          vaststelling.parameter ?? "",
        ncId:
          vaststelling.ncId,
        omschrijving:
          vaststelling.omschrijving ??
          "",
        vastgesteldDoorCi:
          vaststelling.vastgesteldDoorCi ??
          "",
        verduidelijking:
          vaststelling.verduidelijking ??
          "",
        groteImpact:
          vaststelling.groteImpact ??
          "",
        categorie:
          vaststelling.categorie ?? "",
        motivatieAanpassing:
          vaststelling.motivatieAanpassing ??
          "",
      }),
    );

  const oneDrive =
    deskcontrole.oneDrive ??
    deskcontrole.procescertificaat
      ?.oneDrive ??
    "";
  

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/deskcontroles"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          ← Terug naar deskcontroles
        </Link>

        <div className="flex flex-wrap gap-2">
          {deskcontrole.verwijderdOp ? (
            <span className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
              Verwijderd
            </span>
          ) : (
            <Link
              href={`/deskcontroles/${deskcontrole.id}/bewerken`}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Bewerken
            </Link>
          )}

          <a
            href={
              deskcontrole.linkAttest ??
              undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800"
          >
            Open attest ↗
          </a>

          {oneDrive ? (
            <a
              href={oneDrive}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Open OneDrive ↗
            </a>
          ) : null}
        </div>
      </div>

      {magBeheren &&
      !deskcontrole.verwijderdOp ? (
        <DeskcontroleDetailSnelleActies
          id={deskcontrole.id}
          status={deskcontrole.status}
          mailSanctieVerzonden={
            deskcontrole
              .mailSanctieVerzonden ??
            false
          }
          mailCorrectieVerzonden={
            deskcontrole
              .mailCorrectieVerzonden ??
            false
          }
          voorwaardelijkeOpheffing={
            deskcontrole
              .voorwaardelijkeOpheffing ??
            false
          }
        />
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                Deskcontrole opvolging
              </p>

              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {
                  deskcontrole.attestnummer
                }
              </h1>

              <p className="mt-2 text-sm text-emerald-100">
                {
                  deskcontrole.lid
                    .naamPersoon
                }{" "}
                ·{" "}
                {
                  deskcontrole
                    .procescertificaat
                    ?.naamBedrijf ??
                  "Niet gekoppeld"
                }

              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-sm font-bold ${statusStijl(
                deskcontrole.status,
              )}`}
            >
              {statusLabel(
                deskcontrole.status,
              )}
            </span>
          </div>
        </header>

        <dl className="grid gap-x-8 gap-y-6 px-6 py-6 sm:grid-cols-2 sm:px-8 xl:grid-cols-3">
          <GegevensVeld
            label="Auditeur"
            waarde={
              deskcontrole.auditeur
            }
          />

          <GegevensVeld
            label="Type Controle"
            waarde={typeControleLabel(
              deskcontrole.typeControle,
            )}
          />

          <GegevensVeld
            label="Attest-ID"
            waarde={
              deskcontrole.attestId
            }
          />

          <GegevensVeld
            label="Naam ADI"
            waarde={
              deskcontrole.lid
                .naamPersoon
            }
          />

          <GegevensVeld
            label="OVAM-ID"
            waarde={
              deskcontrole.lid.ovamId
            }
          />

          <GegevensVeld
            label="Persoonscertificaat"
            waarde={
              deskcontrole.lid
                .certificaatnummer
            }
          />

          <GegevensVeld
            label="Certificatie platform"
            waarde={
              deskcontrole.lid
                .certificatiePlatform
            }
          />

          <GegevensVeld
            label="Bedrijfsnaam"
            waarde={
              deskcontrole
                .procescertificaat
                ?.naamBedrijf ??
              "Niet gekoppeld"
            }
          />

          <GegevensVeld
            label="Ondernemingsnummer / EU-btw-nummer"
            waarde={
              deskcontrole
                .procescertificaat
                ?.kboNummer
                ? formatteerOndernemingsnummer(
                    deskcontrole
                      .procescertificaat
                      .kboNummer,
                  )
                : "Niet gekoppeld"
            }
          />


          <GegevensVeld
            label="Procescertificaat"
            waarde={
              deskcontrole
                .procescertificaat
                ?.certificaatnummer ??
              "Niet gekoppeld"
            }
          />


          <GegevensVeld
            label="Datum controle"
            waarde={formatteerDatum(
              deskcontrole.datumControle,
            )}
          />

          <GegevensVeld
            label="Deadline Sanctie"
            waarde={formatteerDatum(
              deskcontrole.deadlineSanctie,
            )}
          />

          <GegevensVeld
            label="Finalisatie Datum"
            waarde={formatteerDatum(
              deskcontrole.finalisatieDatum,
            )}
          />

          <GegevensVeld
            label="Deadline Correctie"
            waarde={formatteerDatum(
              deskcontrole.deadlineCorrectie,
            )}
          />

          <GegevensVeld
            label="Mail sanctie verzonden"
            waarde={
              deskcontrole
                .mailSanctieVerzonden
                ? "Ja"
                : "Nee"
            }
          />

          <GegevensVeld
            label="Mail correctie verzonden"
            waarde={
              deskcontrole
                .mailCorrectieVerzonden
                ? "Ja"
                : "Nee"
            }
          />

          <GegevensVeld
            label="Voorwaardelijke Opheffing"
            waarde={
              deskcontrole
                .voorwaardelijkeOpheffing
                ? "Ja"
                : "Nee"
            }
          />

          <GegevensVeld
            label="Adres"
            waarde={
              deskcontrole.adres
            }
            breed
          />

          <GegevensVeld
            label="Opmerkingen"
            waarde={
              deskcontrole.opmerkingen
            }
            breed
          />
        </dl>
      </section>

      {vaststellingRijen.length >
      0 ? (
        <DeskcontroleVaststellingenTabel
          rijen={vaststellingRijen}
        />
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="font-bold text-slate-950">
            Geen vaststellingen
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Aan deze deskcontrole zijn
            geen vaststellingen
            gekoppeld.
          </p>
        </section>
      )}
    </div>
  );
}

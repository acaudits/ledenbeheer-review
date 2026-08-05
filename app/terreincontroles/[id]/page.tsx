import Link from "next/link";
import { notFound } from "next/navigation";

import {
  TerreincontroleDossierActies,
  VerwijderTerreincontroleVaststellingKnop,
} from "@/components/TerreincontroleDossierActies";
import { vereisMachtiging } from "@/lib/auth";
import { heeftMachtiging } from "@/lib/autorisatie";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    toegevoegd?: string;
  }>;
};

function datum(datum: Date) {
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

function Veld({
  label,
  waarde,
  breed = false,
}: {
  label: string;
  waarde?: string | null;
  breed?: boolean;
}) {
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

export default async function TerreincontroleDetailPage({
  params,
  searchParams,
}: Props) {
  const gebruiker =
    await vereisMachtiging(
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  const { id: idWaarde } =
    await params;

  const { toegevoegd } =
    await searchParams;

  const id = Number(idWaarde);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const dossier =
    await prisma.terreincontroleDossier.findUnique({
      where: {
        id,
      },
      include: {
        vaststellingen: {
          orderBy: [
            { excelRij: "asc" },
            { id: "asc" },
          ],
        },
      },
    });

  if (!dossier) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <Link
        href="/terreincontroles"
        className="text-sm font-bold text-emerald-700"
      >
        ← Terug naar terreincontroles
      </Link>

      {toegevoegd === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          De terreincontrole is toegevoegd.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-7 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">
            Terreincontrole
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {dossier.attestnummer}
          </h1>

          <p className="mt-2 text-sm text-emerald-100">
            {dossier.naamAdi} ·{" "}
            {dossier.bedrijfsnaam} ·{" "}
            {statusLabel(
              dossier.status,
            )}
          </p>
        </header>

        <dl className="grid gap-x-8 gap-y-6 px-6 py-7 sm:grid-cols-2 xl:grid-cols-3">
          <Veld
            label="Auditeur"
            waarde={dossier.auditeur}
          />
          <Veld
            label="Naam ADI"
            waarde={dossier.naamAdi}
          />
          <Veld
            label="Status"
            waarde={statusLabel(
              dossier.status,
            )}
          />
          <Veld
            label="Attestnummer"
            waarde={
              dossier.attestnummer
            }
          />
          <Veld
            label="Datum controle"
            waarde={datum(
              dossier.datumControle,
            )}
          />
          <Veld
            label="PersoonsID"
            waarde={
              dossier.persoonsId
            }
          />
          <Veld
            label="Persoonscertificaat"
            waarde={
              dossier
                .persoonscertificaatNummer
            }
          />
          <Veld
            label="Bedrijfsnaam"
            waarde={
              dossier.bedrijfsnaam
            }
          />
          <Veld
            label="Ondernemingsnummer"
            waarde={formatteerOndernemingsnummer(
              dossier.ondernemingsnummer,
            )}
          />
          <Veld
            label="Procescertificaat"
            waarde={
              dossier
                .procescertificaatNummer
            }
          />
          <Veld
            label="Certificatieplatform"
            waarde={
              dossier
                .certificatiePlatform
            }
          />
          <Veld
            label="Attest-ID"
            waarde={dossier.attestId}
          />
          <Veld
            label="Adres"
            waarde={dossier.adres}
            breed
          />
          <Veld
            label="Opmerkingen"
            waarde={
              dossier.opmerkingen
            }
            breed
          />
        </dl>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-5">
          <a
            href={dossier.linkAttest}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          >
            Attest openen
          </a>

          {dossier.certificatiePlatform ? (
            <a
              href={
                dossier.certificatiePlatform
              }
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"
            >
              Certificatieplatform
            </a>
          ) : null}
        </div>
      </section>

      {magBeheren &&
      !dossier.verwijderdOp ? (
        <TerreincontroleDossierActies
          id={dossier.id}
          status={dossier.status}
        />
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">

            Non-conformiteiten
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {
              dossier.vaststellingen
                .length
            }{" "}
            {dossier.vaststellingen
              .length === 1
              ? "vaststelling"
              : "non-conformiteiten"}
          </p>
        </header>

        {dossier.vaststellingen
          .length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">

            Aan deze terreincontrole zijn nog geen non-conformiteiten gekoppeld.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1900px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {[
                    "NC-ID",
                    "Parameter",
                    "Omschrijving",
                    "Vastgesteld door CI",
                    "Verduidelijking",
                    "Grote impact",
                    "Categorie",
                    "Motivatie aanpassing",
                    ...(magBeheren
                      ? ["Acties"]
                      : []),
                  ].map((label) => (
                    <th
                      key={label}
                      className="border-b border-slate-200 px-4 py-3"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {dossier.vaststellingen.map(
                  (vaststelling) => (
                    <tr
                      key={
                        vaststelling.id
                      }
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="px-4 py-3 font-bold">
                        {
                          vaststelling.ncId
                        }
                      </td>
                      <td className="px-4 py-3">
                        {vaststelling.parameter ??
                          "—"}
                      </td>
                      <td className="max-w-96 whitespace-pre-wrap px-4 py-3">
                        {vaststelling.omschrijving ??
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        {vaststelling.vastgesteldDoorCi ??
                          "—"}
                      </td>
                      <td className="max-w-96 whitespace-pre-wrap px-4 py-3">
                        {vaststelling.verduidelijking ??
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        {vaststelling.groteImpact ??
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        {vaststelling.categorie ??
                          "—"}
                      </td>
                      <td className="max-w-96 whitespace-pre-wrap px-4 py-3">
                        {vaststelling.motivatieAanpassing ??
                          "—"}
                      </td>

                      {magBeheren ? (
                        <td className="px-4 py-3">
                          <VerwijderTerreincontroleVaststellingKnop
                            terreincontroleId={
                              dossier.id
                            }
                            vaststellingId={
                              vaststelling.id
                            }
                          />
                        </td>
                      ) : null}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

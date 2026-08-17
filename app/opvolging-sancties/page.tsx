import { redirect } from "next/navigation";

import { OpvolgingSanctieActies } from "@/components/OpvolgingSanctieActies";

import {
  heeftMachtiging,
} from "@/lib/autorisatie";
import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";
import {
  ncCategorieLabel,
  opvolgingBronLabel,
} from "@/lib/opvolging-sancties";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

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

function gebruikerNaam(
  gebruiker: {
    email: string;
    naam: string | null;
    voornaam: string | null;
    achternaam: string | null;
  } | null,
) {
  if (!gebruiker) {
    return "—";
  }

  const volledigeNaam = [
    gebruiker.voornaam,
    gebruiker.achternaam,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    volledigeNaam ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

export default async function OpvolgingSanctiesPage() {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  const magDeskcontrolesBekijken =
    heeftMachtiging(
      gebruiker.rol,
      "DESKCONTROLES_BEKIJKEN",
    );

  const magTerreincontrolesBekijken =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEKIJKEN",
    );

  const magDeskcontrolesBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "DESKCONTROLES_BEHEREN",
    );

  const magTerreincontrolesBeheren =
    heeftMachtiging(
      gebruiker.rol,
      "TERREINCONTROLES_BEHEREN",
    );

  if (
    !magDeskcontrolesBekijken &&
    !magTerreincontrolesBekijken
  ) {
    redirect("/");
  }

  const registraties =
    await prisma.opvolgingSanctie.findMany({
      where: {
        verwijderdOp: null,
      },
      include: {
        auditeurGebruiker: {
          select: {
            email: true,
            naam: true,
            voornaam: true,
            achternaam: true,
          },
        },
        afgerondDoorGebruiker: {
          select: {
            email: true,
            naam: true,
            voornaam: true,
            achternaam: true,
          },
        },
      },
      orderBy: [
        {
          datumVaststelling:
            "desc",
        },
        {
          id: "desc",
        },
      ],
    });


  const auditeurs =
    await prisma.toegestaneGebruiker.findMany({
      where: {
        actief: true,
        rol: "AUDITEUR",
      },
      select: {
        id: true,
        email: true,
        naam: true,
        voornaam: true,
        achternaam: true,
      },
      orderBy: [
        {
          voornaam: "asc",
        },
        {
          achternaam: "asc",
        },
        {
          email: "asc",
        },
      ],
    });

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Controlebeheer
        </p>

        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Opvolging/sancties
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Centrale opvolging van vaststellingen, non-conformiteiten en sanctieperiodes.
        </p>

        <p className="mt-3 text-sm font-semibold text-slate-700">
          {registraties.length}{" "}
          {registraties.length === 1
            ? "registratie"
            : "registraties"}
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {registraties.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              Nog geen opvolgingen
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Gebruik bij een deskcontrole, terreincontrole of registratie na finalisatie de actie Opvolgen/sanctioneren.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[2400px] border-collapse text-left">
              <thead className="bg-slate-100">
                <tr className="text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-3">
                    Bron
                  </th>
                  <th className="px-3 py-3">
                    Auditeur
                  </th>
                  <th className="px-3 py-3">
                    Naam ADI
                  </th>
                  <th className="px-3 py-3">
                    Opvolging afgerond
                  </th>
                  <th className="px-3 py-3">
                    Datum afgerond
                  </th>
                  <th className="px-3 py-3">
                    Afgerond door
                  </th>
                  <th className="px-3 py-3">
                    Link attest
                  </th>
                  <th className="px-3 py-3">
                    Attestnummer
                  </th>
                  <th className="px-3 py-3">
                    Reden
                  </th>
                  <th className="px-3 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="px-3 py-3">
                    OVAM-ID
                  </th>
                  <th className="px-3 py-3">
                    Datum vaststelling
                  </th>
                  <th className="px-3 py-3">
                    Opmerkingen
                  </th>
                  <th className="px-3 py-3">
                    NC-categorie
                  </th>
                  <th className="px-3 py-3">
                    Sanctie begindatum
                  </th>
                  <th className="px-3 py-3">
                    Sanctie einddatum
                  </th>
                  <th className="sticky right-0 bg-slate-100 px-3 py-3">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {registraties.map(
                  (registratie) => (
                    <tr
                      key={
                        registratie.id
                      }
                      className="align-top text-sm text-slate-700 hover:bg-emerald-50/40"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-semibold">
                        {opvolgingBronLabel(
                          registratie.bronType,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {gebruikerNaam(
                          registratie.auditeurGebruiker,
                        ) !== "—"
                          ? gebruikerNaam(
                              registratie.auditeurGebruiker,
                            )
                          : registratie.auditeur ??
                            "—"}
                      </td>

                      <td className="px-3 py-3">
                        {registratie.naamAdi ??
                          "—"}
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            registratie.opvolgingAfgerond
                          }
                          readOnly
                          aria-label="Opvolging afgerond"
                          className="size-4 accent-emerald-700"
                        />
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {formatteerDatum(
                          registratie.datumAfgerond,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {gebruikerNaam(
                          registratie.afgerondDoorGebruiker,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {registratie.linkAttest ? (
                          <a
                            href={
                              registratie.linkAttest
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-emerald-700 underline hover:text-emerald-900"
                          >
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {registratie.attestnummer ??
                          "—"}
                      </td>

                      <td className="max-w-80 whitespace-pre-wrap px-3 py-3">
                        {registratie.reden}
                      </td>

                      <td className="px-3 py-3">
                        {registratie.bedrijfsnaam ??
                          "—"}
                      </td>

                      <td className="px-3 py-3">
                        {registratie.ovamId ??
                          "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {formatteerDatum(
                          registratie.datumVaststelling,
                        )}
                      </td>

                      <td className="max-w-80 whitespace-pre-wrap px-3 py-3">
                        {registratie.opmerkingen ??
                          "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-semibold">
                        {ncCategorieLabel(
                          registratie.ncCategorie,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {formatteerDatum(
                          registratie.sanctieBegindatum,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {formatteerDatum(
                          registratie.sanctieEinddatum,
                        )}
                      </td>

                      <td className="sticky right-0 bg-white px-3 py-3">
                        {(
                          registratie.bronType ===
                          "DESKCONTROLE"
                            ? magDeskcontrolesBeheren
                            : magTerreincontrolesBeheren
                        ) ? (
                          <OpvolgingSanctieActies
                            registratie={{
                              id: registratie.id,
                              auditeurGebruikerId:
                                registratie.auditeurGebruikerId,
                              opvolgingAfgerond:
                                registratie.opvolgingAfgerond,
                              datumAfgerond:
                                registratie.datumAfgerond
                                  ?.toISOString()
                                  .slice(0, 10) ??
                                "",
                              afgerondDoorGebruikerId:
                                registratie.afgerondDoorGebruikerId,
                              opmerkingen:
                                registratie.opmerkingen ??
                                "",
                            }}
                            auditeurs={auditeurs}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            —
                          </span>
                        )}
                      </td>
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

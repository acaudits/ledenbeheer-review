import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  OpvolgingSanctieHerstelKnop,
} from "@/components/OpvolgingSanctieHerstelKnop";
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
import {
  prisma,
} from "@/lib/prisma";

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
      hour:
        datum.getUTCHours() === 0 &&
        datum.getUTCMinutes() === 0
          ? undefined
          : "2-digit",
      minute:
        datum.getUTCHours() === 0 &&
        datum.getUTCMinutes() === 0
          ? undefined
          : "2-digit",
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

  return (
    [
      gebruiker.voornaam,
      gebruiker.achternaam,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    gebruiker.naam?.trim() ||
    gebruiker.email
  );
}

export default async function VerwijderdeOpvolgingSanctiesPage() {
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
        verwijderdOp: {
          not: null,
        },
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
      },
      orderBy: [
        {
          verwijderdOp: "desc",
        },
        {
          id: "desc",
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
          Verwijderde opvolgingen/sancties
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Overzicht van verwijderde opvolgingen die opnieuw geactiveerd kunnen worden.
        </p>

        <p className="mt-3 text-sm font-semibold text-slate-700">
          {registraties.length}{" "}
          {registraties.length === 1
            ? "verwijderde registratie"
            : "verwijderde registraties"}
        </p>

        <div className="mt-4">
          <Link
            href="/opvolging-sancties"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Terug naar actieve registraties
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {registraties.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              Geen verwijderde opvolgingen
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Er zijn momenteel geen verwijderde registraties.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] border-collapse text-left">
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
                    Reden
                  </th>
                  <th className="px-3 py-3">
                    NC-categorie
                  </th>
                  <th className="px-3 py-3">
                    Datum vaststelling
                  </th>
                  <th className="px-3 py-3">
                    Verwijderd op
                  </th>
                  <th className="sticky right-0 bg-slate-100 px-3 py-3">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {registraties.map(
                  (registratie) => {
                    const magHerstellen =
                      registratie.bronType ===
                      "DESKCONTROLE"
                        ? magDeskcontrolesBeheren
                        : magTerreincontrolesBeheren;

                    return (
                      <tr
                        key={registratie.id}
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

                        <td className="max-w-96 whitespace-pre-wrap px-3 py-3">
                          {registratie.reden}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 font-semibold">
                          {ncCategorieLabel(
                            registratie.ncCategorie,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {formatteerDatum(
                            registratie.datumVaststelling,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {formatteerDatum(
                            registratie.verwijderdOp,
                          )}
                        </td>

                        <td className="sticky right-0 bg-white px-3 py-3">
                          {magHerstellen ? (
                            <OpvolgingSanctieHerstelKnop
                              id={
                                registratie.id
                              }
                            />
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

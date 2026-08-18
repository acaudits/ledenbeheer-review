import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";

import TerreincontroleHerstelKnop from "@/components/TerreincontroleHerstelKnop";
import { vereisMachtiging } from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";
import {
  formatteerDatabaseTijd,
  maakGoogleMapsUrl,
} from "@/lib/terreincontrole";

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

export default async function VerwijderdeTerreincontrolesPage() {
  await vereisMachtiging("TERREINCONTROLES_BEHEREN");

  const terreincontroles =
    await prisma.terreincontrole.findMany(
      {
        where: {
          verwijderdOp: {
            not: null,
          },
        },

        orderBy: [
          {
            verwijderdOp:
              "desc",
          },
          {
            id: "desc",
          },
        ],

        select: {
          id: true,
          auditeur: true,
          status: true,
          factuurVerzonden: true,
          inspectielocatie: true,
          adres: true,
          datumPlaatsbezoek: true,
          uurPlaatsbezoek: true,
          attestId: true,
          verwijderdOp: true,
        },
      },
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Verwijderde terreincontroles"
        omschrijving={
          <>
            {terreincontroles.length}{" "}
            {terreincontroles.length === 1
              ? "verwijderde terreincontrole"
              : "verwijderde terreincontroles"}
          </>
        }
        acties={
          <BeheerActieLink
            href="/terreincontroles-inplannen"
            variant="neutraal"
            kinderen="← Terug naar planning"
          />
        }
      />

        <div className={BEHEER_TABEL_STIJLEN.verwijderdKader}>
          {terreincontroles.length ===
          0 ? (
            <div className={BEHEER_TABEL_STIJLEN.leeg}>
              <p className="text-sm font-medium text-slate-600">
                Er zijn geen verwijderde terreincontroles.
              </p>
            </div>
          ) : (
            <div className={BEHEER_TABEL_STIJLEN.scroll}>
              <table className={`${BEHEER_TABEL_STIJLEN.tabel} ${BEHEER_TABEL_STIJLEN.actieKolomEerste} min-w-[1500px] text-sm`}>
                <thead className={BEHEER_TABEL_STIJLEN.kop}>
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3">
                      Acties
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Google Maps
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Auditeur
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Status
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Factuur verzonden
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Inspectielocatie
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Datum plaatsbezoek
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Uur
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Attest-ID
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Verwijderd op
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {terreincontroles.map(
                    (
                      terreincontrole,
                    ) => {
                      const googleMapsUrl =
                        maakGoogleMapsUrl(
                          terreincontrole
                            .inspectielocatie ??
                            terreincontrole
                              .adres,
                        );

                      return (
                        <tr
                          key={
                            terreincontrole.id
                          }
                          className="align-top hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <TerreincontroleHerstelKnop
                              id={
                                terreincontrole.id
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            {googleMapsUrl ? (
                              <a
                                href={
                                  googleMapsUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-700 underline"
                              >
                                Openen
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {terreincontrole
                              .auditeur ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            {terreincontrole
                              .status ??
                              "NULL"}
                          </td>

                          <td className="px-4 py-3">
                            {terreincontrole
                              .factuurVerzonden
                              ? "Ja"
                              : "Nee"}
                          </td>

                          <td className="max-w-sm px-4 py-3">
                            {terreincontrole
                              .inspectielocatie ??
                              terreincontrole
                                .adres ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatteerDatum(
                              terreincontrole
                                .datumPlaatsbezoek,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatteerDatabaseTijd(
                              terreincontrole
                                .uurPlaatsbezoek,
                            ) ?? "—"}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            {terreincontrole
                              .attestId ??
                              "—"}
                          </td>

                          <td className="px-4 py-3">
                            {formatteerDatumTijd(
                              terreincontrole
                                .verwijderdOp,
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
      </div>
    </div>
  );
}


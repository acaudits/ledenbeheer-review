import {
  BeheerActieLink,
  BeheerOverzichtHeader,
  BEHEER_KNOP_KLASSEN,
} from "@/components/BeheerOverzichtHeader";
import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";

import { herstelTerreincontrole } from "@/app/terreincontroles/dossier-actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    hersteld?: string;
  }>;
};

function datum(
  waarde: Date | null,
) {
  if (!waarde) {
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
  ).format(waarde);
}

export default async function VerwijderdeTerreincontrolesPage({
  searchParams,
}: Props) {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const { hersteld } =
    await searchParams;

  const dossiers =
    await prisma.terreincontroleDossier.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      orderBy: {
        verwijderdOp: "desc",
      },
    });

  return (
    <div className="space-y-5">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Verwijderde terreincontroles"
        omschrijving={
          <>
            {dossiers.length}{" "}
            {dossiers.length === 1
              ? "verwijderde terreincontrole"
              : "verwijderde terreincontroles"}
          </>
        }
        acties={
          <BeheerActieLink
            href="/terreincontroles"
            variant="neutraal"
            kinderen="← Terug naar terreincontroles"
          />
        }
      />

      {hersteld === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          De terreincontrole is hersteld.
        </div>
      ) : null}

      <section className={BEHEER_TABEL_STIJLEN.verwijderdKader}>
        <div className={BEHEER_TABEL_STIJLEN.verwijderdBovenbalk}>
          <h2 className={BEHEER_TABEL_STIJLEN.overzichtTitel}>
            Overzicht
          </h2>

          <p className={BEHEER_TABEL_STIJLEN.aantal}>
            {dossiers.length} verwijderde terreincontroles
          </p>
        </div>

        {dossiers.length === 0 ? (
          <div className={BEHEER_TABEL_STIJLEN.verwijderdLeeg}>
            Er zijn geen verwijderde terreincontroles.
          </div>
        ) : (
          <div className={`${BEHEER_TABEL_STIJLEN.scroll} bg-white`}>
            <table className={`${BEHEER_TABEL_STIJLEN.tabel} min-w-[1100px] text-sm ${BEHEER_TABEL_STIJLEN.actieKolomLaatste}`}>
              <thead className={BEHEER_TABEL_STIJLEN.kop}>
                <tr>
                  <th className="px-4 py-3">
                    Attestnummer
                  </th>
                  <th className="px-4 py-3">
                    Naam ADI
                  </th>
                  <th className="px-4 py-3">
                    Bedrijfsnaam
                  </th>
                  <th className="px-4 py-3">
                    Verwijderd op
                  </th>
                  <th className="px-4 py-3">
                    Actie
                  </th>
                </tr>
              </thead>

              <tbody>
                {dossiers.map(
                  (dossier) => {
                    const actie =
                      herstelTerreincontrole.bind(
                        null,
                        dossier.id,
                      );

                    return (
                      <tr
                        key={
                          dossier.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-bold">
                          {
                            dossier.attestnummer
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            dossier.naamAdi
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            dossier.bedrijfsnaam
                          }
                        </td>
                        <td className="px-4 py-3">
                          {datum(
                            dossier.verwijderdOp,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <form
                            action={
                              actie
                            }
                          >
                            <button
                              type="submit"
                              className={`${BEHEER_KNOP_KLASSEN.primair} disabled:cursor-wait disabled:opacity-60`}
                            >
                              Herstellen
                            </button>
                          </form>
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

import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";
import { CopyButton } from "@/components/CopyButton";
import { HerstelButton } from "@/components/CertificaatStatusButton";
import { formatteerOndernemingsnummer } from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";
import { vereisMachtiging } from "@/lib/auth";

export const dynamic = "force-dynamic";

function datum(
  datumWaarde: Date | null,
) {
  if (!datumWaarde) {
    return "";
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
  ).format(datumWaarde);
}

export default async function VerwijderdeProcescertificatenPage() {
  await vereisMachtiging("CERTIFICATEN_BEHEREN");

  const certificaten =
    await prisma.procescertificaat.findMany({
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
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Procescertificaten"
        titel="Verwijderde procescertificaten"
        omschrijving={
          <>
            {certificaten.length} verwijderde
            {certificaten.length === 1
              ? " registratie"
              : " registraties"}
          </>
        }
        acties={
          <BeheerActieLink
            href="/procescertificaten"
            variant="neutraal"
            kinderen="← Terug naar procescertificaten"
          />
        }
      />

      <section className={BEHEER_TABEL_STIJLEN.verwijderdKader}>
        <div className={BEHEER_TABEL_STIJLEN.verwijderdBovenbalk}>
          <h2 className={BEHEER_TABEL_STIJLEN.overzichtTitel}>
            Overzicht
          </h2>

          <p className={BEHEER_TABEL_STIJLEN.aantal}>
            {certificaten.length}{" "}
            verwijderde records
          </p>
        </div>

        {certificaten.length === 0 ? (
          <div className={BEHEER_TABEL_STIJLEN.verwijderdLeeg}>
            <h2 className="text-xl font-bold text-slate-950">
              Geen verwijderde
              procescertificaten
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Verwijderde
              procescertificaten
              verschijnen hier.
            </p>
          </div>
        ) : (
          <div className={`${BEHEER_TABEL_STIJLEN.scroll} bg-white`}>
            <table className={`${BEHEER_TABEL_STIJLEN.tabel} min-w-[1100px] ${BEHEER_TABEL_STIJLEN.actieKolomLaatste}`}>
              <thead className={BEHEER_TABEL_STIJLEN.kop}>
                <tr>
                  {[
                    "Bedrijf",
                    "Ondernemingsnummer / EU-btw-nummer",
                    "Certificaatnummer",
                    "Type",
                    "Verwijderd op",
                    "Actie",
                  ].map((titel) => (
                    <th
                      key={titel}
                      className="border-b border-slate-200 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {titel}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {certificaten.map(
                  (certificaat) => {
                    const type =
                      certificaat.ondernemingstype ===
                      "EENMANSZAAK"
                        ? "Eenmanszaak"
                        : "Bedrijf";

                    const waarden = [
                      certificaat.naamBedrijf,
                      formatteerOndernemingsnummer(
                        certificaat.kboNummer,
                      ),
                      certificaat.certificaatnummer,
                      type,
                      datum(
                        certificaat.verwijderdOp,
                      ),
                    ];

                    return (
                      <tr
                        key={certificaat.id}
                        className="hover:bg-slate-50"
                      >
                        {waarden.map(
                          (
                            waarde,
                            index,
                          ) => (
                            <td
                              key={index}
                              className="px-5 py-4 text-sm text-slate-700"
                            >
                              <div className="flex min-w-max items-center gap-2">
                                <span>
                                  {waarde}
                                </span>

                                <CopyButton
                                  waarde={
                                    waarde
                                  }
                                />
                              </div>
                            </td>
                          ),
                        )}

                        <td className="px-5 py-4 text-right">
                          <HerstelButton
                            id={
                              certificaat.id
                            }
                            soort="proces"
                            naam={
                              certificaat.naamBedrijf
                            }
                          />
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

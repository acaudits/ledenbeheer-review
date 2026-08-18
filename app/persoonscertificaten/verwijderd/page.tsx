import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  BEHEER_TABEL_STIJLEN,
} from "@/components/BeheerTabelOnderdelen";
import { CopyButton } from "@/components/CopyButton";
import { HerstelButton } from "@/components/CertificaatStatusButton";
import { prisma } from "@/lib/prisma";
import { vereisMachtiging } from "@/lib/auth";

export const dynamic = "force-dynamic";

function datum(datumWaarde: Date | null) {
  if (!datumWaarde) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(datumWaarde);
}

export default async function VerwijderdePersoonscertificatenPage() {
  await vereisMachtiging("CERTIFICATEN_BEHEREN");

  const leden = await prisma.lid.findMany({
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
        bovenTitel="Persoonscertificaten"
        titel="Verwijderde persoonscertificaten"
        omschrijving={
          <>
            {leden.length} verwijderde
            {leden.length === 1
              ? " registratie"
              : " registraties"}
          </>
        }
        acties={
          <BeheerActieLink
            href="/persoonscertificaten"
            variant="neutraal"
            kinderen="← Terug naar persoonscertificaten"
          />
        }
      />

      <section className={BEHEER_TABEL_STIJLEN.verwijderdKader}>
        <div className={BEHEER_TABEL_STIJLEN.verwijderdBovenbalk}>
          <h2 className={BEHEER_TABEL_STIJLEN.overzichtTitel}>
            Overzicht
          </h2>

          <p className={BEHEER_TABEL_STIJLEN.aantal}>
            {leden.length} verwijderde records
          </p>
        </div>

        {leden.length === 0 ? (
          <div className={BEHEER_TABEL_STIJLEN.verwijderdLeeg}>
            <h2 className="text-xl font-bold text-slate-950">
              Geen verwijderde persoonscertificaten
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Verwijderde persoonscertificaten verschijnen hier.
            </p>
          </div>
        ) : (
          <div className={`${BEHEER_TABEL_STIJLEN.scroll} bg-white`}>
            <table className={`${BEHEER_TABEL_STIJLEN.tabel} min-w-[1100px] ${BEHEER_TABEL_STIJLEN.actieKolomLaatste}`}>
              <thead className={BEHEER_TABEL_STIJLEN.kop}>
                <tr>
                  {[
                    "Naam persoon",
                    "OVAM-ID",
                    "Certificaatnummer",
                    "Bedrijf",
                    "Mailadres",
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
                {leden.map((lid) => (
                  <tr key={lid.id} className="hover:bg-slate-50">
                    {[
                      lid.naamPersoon,
                      lid.ovamId,
                      lid.certificaatnummer,
                      lid.bedrijf,
                      lid.mailadres,
                      datum(lid.verwijderdOp),
                    ].map((waarde, index) => (
                      <td
                        key={index}
                        className="px-5 py-4 text-sm text-slate-700"
                      >
                        <div className="flex min-w-max items-center gap-2">
                          <span className={!waarde ? "text-slate-400" : ""}>
                            {waarde || "—"}
                          </span>
                          <CopyButton waarde={waarde} />
                        </div>
                      </td>
                    ))}

                    <td className="px-5 py-4 text-right">
                      <HerstelButton
                        id={lid.id}
                        soort="persoon"
                        naam={lid.naamPersoon}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

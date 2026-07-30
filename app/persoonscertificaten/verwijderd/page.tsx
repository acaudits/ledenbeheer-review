import Link from "next/link";
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
    <>
      <header className="mb-7 border-b border-slate-200 pb-7">
        <Link
          href="/persoonscertificaten"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          ← Terug naar persoonscertificaten
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Persoonscertificaten
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
          Verwijderde persoonscertificaten
        </h1>

        <p className="mt-2 text-slate-600">
          Deze records zijn niet meer zichtbaar in de gewone lijst.
          Je kunt ze opnieuw terugzetten.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="font-semibold text-slate-950">
            {leden.length} verwijderde records
          </p>
        </div>

        {leden.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              Geen verwijderde persoonscertificaten
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Verwijderde persoonscertificaten verschijnen hier.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50">
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
    </>
  );
}

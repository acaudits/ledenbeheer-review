import { prisma } from "@/lib/prisma";
import { vereisBeheerder } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { GebruikerToevoegenForm } from "./GebruikerToevoegenForm";
import { TijdelijkWachtwoordForm } from "./TijdelijkWachtwoordForm";
import { wijzigGebruikerStatus } from "./actions";

export const dynamic = "force-dynamic";

function formatteerDatum(datum: Date | null) {
  if (!datum) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(datum);
}

export default async function GebruikersPage() {
  const huidigeBeheerder =
    await vereisBeheerder();

  const gebruikers =
    await prisma.toegestaneGebruiker.findMany({
      orderBy: [
        {
          actief: "desc",
        },
        {
          email: "asc",
        },
      ],
    });

  return (
    <>
      <PageHeader
        titel="Gebruikersbeheer"
        beschrijving="Voeg gebruikers toe en beheer hun toegang tot het certificatenbeheer."
      />

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Nieuwe gebruiker
          </h2>

          <p className="mt-1 mb-6 text-sm leading-6 text-slate-500">
            Maak een account met een tijdelijk wachtwoord.
          </p>

          <GebruikerToevoegenForm />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-950">
              Gebruikers
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {gebruikers.length} gebruikers geregistreerd
            </p>
          </div>

          {gebruikers.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Er zijn nog geen gebruikers toegevoegd.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Gebruiker
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Rol
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Aangemaakt
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actie
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {gebruikers.map((gebruiker) => {
                    const isEigenAccount =
                      gebruiker.id === huidigeBeheerder.id;

                    return (
                      <tr
                        key={gebruiker.id}
                        className="hover:bg-emerald-50/30"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {gebruiker.naam || "Geen naam"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {gebruiker.email}
                          </p>

                          {isEigenAccount && (
                            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                              Jouw account
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              gebruiker.beheerder
                                ? "bg-violet-50 text-violet-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {gebruiker.beheerder
                              ? "Beheerder"
                              : "Gebruiker"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                gebruiker.actief
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {gebruiker.actief
                                ? "Actief"
                                : "Gedeactiveerd"}
                            </span>

                            {gebruiker.wachtwoordWijzigen && (
                              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                Wachtwoord wijzigen
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatteerDatum(
                            gebruiker.aangemaaktOp,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isEigenAccount ? (
                            <div className="text-right">
                              <span className="text-xs text-slate-400">
                                Niet beschikbaar
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-2">
                              <TijdelijkWachtwoordForm
                                gebruikerId={gebruiker.id}
                              />

                              <form
                                action={wijzigGebruikerStatus}
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={gebruiker.id}
                                />

                                <input
                                  type="hidden"
                                  name="actief"
                                  value={
                                    gebruiker.actief
                                      ? "false"
                                      : "true"
                                  }
                                />

                                <button
                                  type="submit"
                                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                    gebruiker.actief
                                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  {gebruiker.actief
                                    ? "Deactiveren"
                                    : "Activeren"}
                                </button>
                              </form>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

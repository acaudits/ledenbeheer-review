import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bewerkBugRapport,
} from "../../actions";
import { vereisMachtiging } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BewerkBugRapportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker =
    await vereisMachtiging(
      "CERTIFICATEN_BEKIJKEN",
    );

  const isBeheerder =
    gebruiker.rollen.includes("BEHEERDER");

  const { id: idWaarde } = await params;
  const id = Number(idWaarde);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const rapport =
    await prisma.bugRapport.findUnique({
      where: { id },
    });

  if (!rapport) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl">
      <Link
        href="/bug-rapporteren"
        className="text-sm font-bold text-emerald-700"
      >
        ← Terug naar bugrapporten
      </Link>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-black text-slate-950">
          Bugrapport bewerken
        </h1>

        <form
          action={bewerkBugRapport}
          className="mt-6 grid gap-5 lg:grid-cols-2"
        >
          <input
            type="hidden"
            name="id"
            value={rapport.id}
          />

          <label className="text-sm font-bold text-slate-700">
            Webpagina
            <input
              type="url"
              name="webpagina"
              required
              maxLength={2048}
              defaultValue={
                rapport.webpagina
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>

          <label className="text-sm font-bold text-slate-700">
            Prioriteit
            <select
              name="prioriteit"
              defaultValue={
                rapport.prioriteit
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
            >
              <option value="1">
                1 — Webapp onbruikbaar
              </option>
              <option value="2">
                2 — Dringend
              </option>
              <option value="3">
                3 — Aanpassing nodig
              </option>
            </select>
          </label>

          {isBeheerder ? (
            <label className="text-sm font-bold text-slate-700">
              Status
              <select
                name="status"
                defaultValue={
                  rapport.status
                }
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
              >
                <option value="OPEN">
                  Open
                </option>
                <option value="IN_BEHANDELING">
                  In behandeling
                </option>
                <option value="BEHANDELD">
                  Behandeld
                </option>
                <option value="AFGEWEZEN">
                  Afgewezen
                </option>
              </select>
            </label>
          ) : (
            <div className="text-sm font-bold text-slate-700">
              Status
              <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal text-slate-700">
                {rapport.status ===
                "IN_BEHANDELING"
                  ? "In behandeling"
                  : rapport.status ===
                      "BEHANDELD"
                    ? "Behandeld"
                    : rapport.status ===
                        "AFGEWEZEN"
                      ? "Afgewezen"
                      : "Open"}
              </p>
              <p className="mt-1 text-xs font-normal text-slate-500">
                Alleen een beheerder kan de status aanpassen.
              </p>
            </div>
          )}

          <label className="text-sm font-bold text-slate-700 lg:col-span-2">
            Uitleg bug
            <textarea
              name="uitleg"
              required
              minLength={5}
              maxLength={10_000}
              rows={6}
              defaultValue={rapport.uitleg}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>

          <label className="text-sm font-bold text-slate-700 lg:col-span-2">
            Feedback
            <textarea
              name="opmerkingen"
              maxLength={10_000}
              rows={4}
              defaultValue={
                rapport.opmerkingen ?? ""
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
            >
              Wijzigingen opslaan
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

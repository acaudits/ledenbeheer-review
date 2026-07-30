"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InloggenPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function inloggen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (bezig) return;

    setBezig(true);
    setFout(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: wachtwoord,
      });

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setFout(
        "Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord.",
      );
      setBezig(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-28 w-52 items-center justify-center rounded-2xl bg-white p-4 shadow-sm">
            <img
              src="/skh-logo.svg"
              alt="SKH"
              className="max-h-20 w-full object-contain"
            />
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-7 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Certificaten CRM
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              Inloggen
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Log in met het e-mailadres waarvoor je een uitnodiging hebt
              ontvangen.
            </p>
          </div>

          {fout && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {fout}
            </div>
          )}

          <form onSubmit={inloggen} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                E-mailadres
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="naam@bedrijf.be"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label
                  htmlFor="wachtwoord"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Wachtwoord
                </label>

                <Link
                  href="/wachtwoord-vergeten"
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Wachtwoord vergeten?
                </Link>
              </div>

              <input
                id="wachtwoord"
                name="wachtwoord"
                type="password"
                autoComplete="current-password"
                required
                value={wachtwoord}
                onChange={(event) => setWachtwoord(event.target.value)}
                placeholder="Voer je wachtwoord in"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              disabled={bezig}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bezig ? "Bezig met inloggen..." : "Inloggen"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Je kunt alleen inloggen wanneer een beheerder je e-mailadres heeft
            toegevoegd.
          </p>
        </section>
      </div>
    </main>
  );
}

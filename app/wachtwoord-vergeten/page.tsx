"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuurResetlink(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (bezig) return;

    setBezig(true);
    setFout(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${origin}/wachtwoord-instellen`,
        },
      );

      if (error) {
        throw error;
      }

      setVerstuurd(true);
    } catch {
      setFout(
        "De aanvraag kon niet worden verwerkt. Probeer het later opnieuw.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="mb-7 text-center">
          <img
            src="/skh-logo.svg"
            alt="SKH"
            className="mx-auto mb-6 h-20 w-44 object-contain"
          />

          <h1 className="text-2xl font-bold text-slate-950">
            Wachtwoord vergeten
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Vul je e-mailadres in. Als hiervoor een account bestaat, ontvang je
            een link om een nieuw wachtwoord te kiezen.
          </p>
        </div>

        {verstuurd ? (
          <div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              Als dit e-mailadres toegang heeft, is er een resetlink verstuurd.
              Controleer ook je map met ongewenste e-mail.
            </div>

            <Link
              href="/inloggen"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800"
            >
              Terug naar inloggen
            </Link>
          </div>
        ) : (
          <form onSubmit={verstuurResetlink} className="space-y-5">
            {fout && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {fout}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                E-mailadres
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="naam@bedrijf.be"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              disabled={bezig}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bezig ? "Resetlink versturen..." : "Resetlink versturen"}
            </button>

            <Link
              href="/inloggen"
              className="block text-center text-sm font-semibold text-emerald-700 hover:underline"
            >
              Terug naar inloggen
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}

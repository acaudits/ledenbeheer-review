"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordInstellenPage() {
  const router = useRouter();

  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [sessieGeldig, setSessieGeldig] = useState<boolean | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function controleerSessie() {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSessieGeldig(Boolean(session));
    }

    void controleerSessie();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessieGeldig(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function slaWachtwoordOp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFout(null);

    if (wachtwoord.length < 10) {
      setFout("Gebruik een wachtwoord van minimaal 10 tekens.");
      return;
    }

    if (wachtwoord !== bevestiging) {
      setFout("De twee wachtwoorden zijn niet hetzelfde.");
      return;
    }
    setBezig(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: wachtwoord,
      });

      if (error) {
        throw error;
      }

      const statusResponse = await fetch(
        "/api/auth/wachtwoord-gewijzigd",
        {
          method: "POST",
          credentials: "include",
        },
      );

      const statusGegevens = await statusResponse.json().catch(() => null);

      if (!statusResponse.ok) {
        throw new Error(
          statusGegevens?.melding ??
            "Het wachtwoord werd gewijzigd, maar de accountstatus kon niet worden bijgewerkt.",
        );
      }

      await supabase.auth.signOut();

      router.replace("/inloggen?gewijzigd=1");
      router.refresh();
    } catch (fout) {
      console.error("Wachtwoord opslaan mislukt:", fout);

      setFout(
        fout instanceof Error
          ? fout.message
          : "Het wachtwoord kon niet worden opgeslagen.",
      );

      setBezig(false);
    }
  }

  if (sessieGeldig === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          De beveiligde link wordt gecontroleerd...
        </div>
      </main>
    );
  }

  if (!sessieGeldig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <img
            src="/skh-logo.svg"
            alt="SKH"
            className="mx-auto mb-6 h-20 w-44 object-contain"
          />

          <h1 className="text-xl font-bold text-slate-950">
            Link is ongeldig of verlopen
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Vraag een nieuwe wachtwoordlink aan of neem contact op met de
            beheerder voor een nieuwe uitnodiging.
          </p>

          <Link
            href="/wachtwoord-vergeten"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            Nieuwe resetlink aanvragen
          </Link>
        </section>
      </main>
    );
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
            Kies een wachtwoord
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Gebruik minimaal 10 tekens. Een lang, uniek wachtwoord is het
            veiligst.
          </p>
        </div>

        <form onSubmit={slaWachtwoordOp} className="space-y-5">
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
              htmlFor="wachtwoord"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nieuw wachtwoord
            </label>

            <input
              id="wachtwoord"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={wachtwoord}
              onChange={(event) => setWachtwoord(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="bevestiging"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Herhaal het wachtwoord
            </label>

            <input
              id="bevestiging"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={bevestiging}
              onChange={(event) => setBevestiging(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={bezig}
            className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bezig ? "Wachtwoord opslaan..." : "Wachtwoord opslaan"}
          </button>
        </form>
      </section>
    </main>
  );
}

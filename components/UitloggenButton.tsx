"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UitloggenButtonProps = {
  sluitMenu?: () => void;
};

export function UitloggenButton({
  sluitMenu,
}: UitloggenButtonProps) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function uitloggen() {
    if (bezig) return;

    setBezig(true);
    setFout(null);

    try {
      try {
        await fetch("/api/aanwezigheid", {
          method: "DELETE",
          credentials: "include",
          keepalive: true,
        });
      } catch (aanwezigheidsfout) {
        console.warn(
          "Uitlogstatus registreren mislukt:",
          aanwezigheidsfout,
        );
      }

      const supabase = createClient();

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) {
        throw error;
      }

      sluitMenu?.();

      /*
       * Een volledige paginawissel zorgt ervoor dat ook alle
       * server-side gegevens en beveiligde pagina's worden gewist.
       */
      window.location.replace("/inloggen");
    } catch (error) {
      console.error("Uitloggen is mislukt:", error);

      setFout(
        "Uitloggen is niet gelukt. Probeer het opnieuw.",
      );

      setBezig(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={uitloggen}
        disabled={bezig}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-400/5 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-300/35 hover:bg-red-400/10 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? (
          <>
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />

              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            Uitloggen...
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-5"
              aria-hidden="true"
            >
              <path
                d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            Uitloggen
          </>
        )}
      </button>

      {fout && (
        <p
          role="alert"
          className="px-2 text-center text-xs leading-5 text-red-300"
        >
          {fout}
        </p>
      )}
    </div>
  );
}

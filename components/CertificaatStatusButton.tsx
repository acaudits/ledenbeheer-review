"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CertificaatSoort = "persoon" | "proces";

type StatusButtonProps = {
  id: number;
  soort: CertificaatSoort;
  naam?: string;
};

async function wijzigStatus(
  id: number,
  soort: CertificaatSoort,
  actie: "verwijder" | "herstel",
) {
  const response = await fetch("/api/certificaten/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      id,
      soort,
      actie,
    }),
  });

  let resultaat: { message?: string } = {};

  try {
    resultaat = await response.json();
  } catch {
    // Geen geldige JSON ontvangen.
  }

  if (!response.ok) {
    throw new Error(
      resultaat.message ||
        `De server gaf foutcode ${response.status}. Probeer het opnieuw.`,
    );
  }

  return resultaat;
}

export function VerwijderButton({
  id,
  soort,
  naam,
}: StatusButtonProps) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verwijderCertificaat() {
    if (bezig) return;

    const onderwerp =
      naam && naam.trim().length > 0
        ? `“${naam}”`
        : "dit certificaat";

    const bevestigd = window.confirm(
      `Weet je zeker dat je ${onderwerp} wilt verwijderen?\n\nHet certificaat wordt naar de lijst met verwijderde certificaten verplaatst en kan later worden hersteld.`,
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout(null);

    try {
      await wijzigStatus(id, soort, "verwijder");

      router.refresh();

      // Zorgt ervoor dat de rij onmiddellijk uit de actieve lijst verdwijnt.
      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    } catch (error) {
      const melding =
        error instanceof Error
          ? error.message
          : "Het certificaat kon niet worden verwijderd.";

      console.error("Fout bij verwijderen:", error);
      setFout(melding);
      window.alert(melding);
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={verwijderCertificaat}
        disabled={bezig}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
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
                className="opacity-90"
              />
            </svg>
            Verwijderen...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"
              />
            </svg>
            Verwijderen
          </>
        )}
      </button>

      {fout && (
        <p role="alert" className="max-w-52 text-xs text-red-600">
          {fout}
        </p>
      )}
    </div>
  );
}

export function HerstelButton({
  id,
  soort,
  naam,
}: StatusButtonProps) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function herstelCertificaat() {
    if (bezig) return;

    const onderwerp =
      naam && naam.trim().length > 0
        ? `“${naam}”`
        : "dit certificaat";

    const bevestigd = window.confirm(
      `Wil je ${onderwerp} herstellen?\n\nHet certificaat wordt opnieuw in de actieve lijst geplaatst.`,
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout(null);

    try {
      await wijzigStatus(id, soort, "herstel");

      router.refresh();

      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    } catch (error) {
      const melding =
        error instanceof Error
          ? error.message
          : "Het certificaat kon niet worden hersteld.";

      console.error("Fout bij herstellen:", error);
      setFout(melding);
      window.alert(melding);
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={herstelCertificaat}
        disabled={bezig}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
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
                className="opacity-90"
              />
            </svg>
            Herstellen...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6"
              />
            </svg>
            Herstellen
          </>
        )}
      </button>

      {fout && (
        <p role="alert" className="max-w-52 text-xs text-red-600">
          {fout}
        </p>
      )}
    </div>
  );
}

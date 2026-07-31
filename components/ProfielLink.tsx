"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type ProfielGegevens = {
  naam: string | null;
  email: string;
};

type ProfielLinkProps = {
  sluitMenu?: () => void;
};

function initialen(naam: string | null) {
  const delen = String(naam ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (delen.length === 0) {
    return "?";
  }

  if (delen.length === 1) {
    return delen[0]
      .slice(0, 2)
      .toLocaleUpperCase("nl-BE");
  }

  return (
    delen[0][0] +
    delen[delen.length - 1][0]
  ).toLocaleUpperCase("nl-BE");
}

export function ProfielLink({
  sluitMenu,
}: ProfielLinkProps) {
  const [
    profiel,
    setProfiel,
  ] =
    useState<ProfielGegevens | null>(
      null,
    );

  useEffect(() => {
    let actief = true;

    async function laadProfiel() {
      try {
        const antwoord =
          await fetch(
            "/api/auth/mij",
            {
              credentials:
                "include",
              cache: "no-store",
            },
          );

        if (!antwoord.ok) {
          return;
        }

        const gegevens =
          await antwoord.json();

        if (
          actief &&
          typeof gegevens.email ===
            "string"
        ) {
          setProfiel({
            naam:
              typeof gegevens.naam ===
              "string"
                ? gegevens.naam
                : null,
            email:
              gegevens.email,
          });
        }
      } catch (fout) {
        console.error(
          "Profiel voor navigatie ophalen mislukt:",
          fout,
        );
      }
    }

    void laadProfiel();

    return () => {
      actief = false;
    };
  }, []);

  if (!profiel) {
    return null;
  }

  return (
    <Link
      href="/mijn-overzicht"
      onClick={sluitMenu}
      className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
        {initialen(
          profiel.naam,
        )}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">
          {profiel.naam ||
            "Mijn profiel"}
        </span>

        <span className="mt-0.5 block truncate text-xs text-slate-400">
          {profiel.email}
        </span>
      </span>
    </Link>
  );
}

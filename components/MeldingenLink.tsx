"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  usePathname,
} from "next/navigation";

type MeldingenLinkProps = {
  sluitMenu?: () => void;
};

export function MeldingenLink({
  sluitMenu,
}: MeldingenLinkProps) {
  const pathname =
    usePathname();

  const [
    aantalOngelezen,
    setAantalOngelezen,
  ] =
    useState<number | null>(
      null,
    );

  const laadAantal =
    useCallback(
      async () => {
        try {
          const antwoord =
            await fetch(
              "/api/meldingen",
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              },
            );

          if (!antwoord.ok) {
            return;
          }

          const gegevens =
            await antwoord
              .json();

          if (
            typeof gegevens
              .aantalOngelezen ===
            "number"
          ) {
            setAantalOngelezen(
              gegevens
                .aantalOngelezen,
            );
          }
        } catch (fout) {
          console.error(
            "Aantal meldingen ophalen mislukt:",
            fout,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void laadAantal();

    const intervalId =
      window.setInterval(
        () => {
          void laadAantal();
        },
        60_000,
      );

    function bijFocus() {
      void laadAantal();
    }

    function bijZichtbaarheid() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void laadAantal();
      }
    }

    function bijMeldingenWijziging() {
      void laadAantal();
    }

    window.addEventListener(
      "focus",
      bijFocus,
    );

    window.addEventListener(
      "meldingen-gewijzigd",
      bijMeldingenWijziging,
    );

    document.addEventListener(
      "visibilitychange",
      bijZichtbaarheid,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      window.removeEventListener(
        "focus",
        bijFocus,
      );

      window.removeEventListener(
        "meldingen-gewijzigd",
        bijMeldingenWijziging,
      );

      document.removeEventListener(
        "visibilitychange",
        bijZichtbaarheid,
      );
    };
  }, [
    laadAantal,
    pathname,
  ]);

  const actief =
    pathname ===
      "/meldingen" ||
    pathname.startsWith(
      "/meldingen/",
    );

  const badgeTekst =
    aantalOngelezen !== null &&
    aantalOngelezen > 99
      ? "99+"
      : aantalOngelezen;

  return (
    <Link
      href="/meldingen"
      onClick={sluitMenu}
      aria-current={
        actief
          ? "page"
          : undefined
      }
      aria-label={
        aantalOngelezen
          ? `Meldingen, ${aantalOngelezen} ongelezen`
          : "Meldingen"
      }
      className={
        actief
          ? "flex items-center gap-3 rounded-xl bg-emerald-500/15 px-3 py-3 text-sm font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
          : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
      }
    >
      <span className="relative flex size-8 shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={
            actief
              ? "size-5 text-emerald-400"
              : "size-5 text-slate-400"
          }
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {aantalOngelezen !==
          null &&
        aantalOngelezen > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
            {badgeTekst}
          </span>
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        Meldingen
      </span>

      {aantalOngelezen !==
        null &&
      aantalOngelezen > 0 ? (
        <span className="text-xs font-semibold text-rose-300">
          {badgeTekst}
        </span>
      ) : null}
    </Link>
  );
}

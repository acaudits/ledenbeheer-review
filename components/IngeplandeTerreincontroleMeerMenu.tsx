"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { IngeplandeTerreincontroleStatusExcelImport } from "@/components/IngeplandeTerreincontroleStatusExcelImport";

type Props = {
  magBeheren: boolean;
  magExporteren: boolean;
  magStatussenImporteren: boolean;
};

const menuLinkKlasse =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900";

function MenuIcoon({
  children,
  kleur = "grijs",
}: {
  children: React.ReactNode;
  kleur?: "grijs" | "groen" | "amber" | "rood";
}) {
  const kleurKlasse = {
    grijs: "bg-slate-100 text-slate-600",
    groen: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rood: "bg-red-100 text-red-700",
  }[kleur];

  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${kleurKlasse}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export function IngeplandeTerreincontroleMeerMenu({
  magBeheren,
  magExporteren,
  magStatussenImporteren,
}: Props) {
  const [geopend, setGeopend] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function sluitBijKlikBuiten(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setGeopend(false);
      }
    }

    function sluitMetEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGeopend(false);
      }
    }

    document.addEventListener("mousedown", sluitBijKlikBuiten);
    document.addEventListener("keydown", sluitMetEscape);

    return () => {
      document.removeEventListener("mousedown", sluitBijKlikBuiten);
      document.removeEventListener("keydown", sluitMetEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative z-[100]">
      <button
        type="button"
        aria-expanded={geopend}
        aria-haspopup="true"
        onClick={() => setGeopend((huidig) => !huidig)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="1.7" fill="currentColor" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" />
          <circle cx="19" cy="12" r="1.7" fill="currentColor" />
        </svg>
        Meer
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`size-4 transition ${geopend ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {geopend ? (
        <div className="absolute right-0 top-full z-[110] mt-2 w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5">
          <div className="p-2">
            {magExporteren ? (
              <Link
                href="/terreincontroles-inplannen/export"
                onClick={() => setGeopend(false)}
                className={menuLinkKlasse}
              >
                <MenuIcoon kleur="groen">
                  <svg viewBox="0 0 24 24" fill="none" className="size-5">
                    <path
                      d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </MenuIcoon>

                <span>
                  <span className="block">Exporteren naar Excel</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    De ingeplande terreincontroles downloaden
                  </span>
                </span>
              </Link>
            ) : null}

            <Link
              href="/terreincontroles-inplannen/afwezigen"
              onClick={() => setGeopend(false)}
              className={menuLinkKlasse}
            >
              <MenuIcoon kleur="amber">
                <svg viewBox="0 0 24 24" fill="none" className="size-5">
                  <path
                    d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7c.8-3.2 3.2-5 7-5s6.2 1.8 7 5M5 5l14 14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </MenuIcoon>

              <span>
                <span className="block">Afwezigen</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  Afwezige terreincontroles bekijken
                </span>
              </span>
            </Link>

            {magBeheren ? (
              <Link
                href="/terreincontroles-inplannen/verwijderd"
                onClick={() => setGeopend(false)}
                className={menuLinkKlasse}
              >
                <MenuIcoon kleur="rood">
                  <svg viewBox="0 0 24 24" fill="none" className="size-5">
                    <path
                      d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </MenuIcoon>

                <span>
                  <span className="block">Verwijderde terreincontroles</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    Verwijderde controles bekijken en herstellen
                  </span>
                </span>
              </Link>
            ) : null}
          </div>

          {magStatussenImporteren ? (
            <div className="border-t border-slate-200 bg-slate-50 p-3">
              <IngeplandeTerreincontroleStatusExcelImport />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

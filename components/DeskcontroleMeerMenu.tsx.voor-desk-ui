"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { DeskcontroleStatusExcelImport } from "@/components/DeskcontroleStatusExcelImport";

export function DeskcontroleMeerMenu() {
  const [
    geopend,
    setGeopend,
  ] = useState(false);

  const menuRef =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(() => {
    function sluitBijKlikBuiten(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(
          event.target,
        )
      ) {
        setGeopend(false);
      }
    }

    function sluitMetEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setGeopend(false);
      }
    }

    document.addEventListener(
      "mousedown",
      sluitBijKlikBuiten,
    );

    document.addEventListener(
      "keydown",
      sluitMetEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        sluitBijKlikBuiten,
      );

      document.removeEventListener(
        "keydown",
        sluitMetEscape,
      );
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setGeopend(
            (huidige) =>
              !huidige,
          )
        }
        aria-expanded={geopend}
        aria-haspopup="menu"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5"
          aria-hidden="true"
        >
          <circle
            cx="5"
            cy="12"
            r="1.7"
            fill="currentColor"
          />

          <circle
            cx="12"
            cy="12"
            r="1.7"
            fill="currentColor"
          />

          <circle
            cx="19"
            cy="12"
            r="1.7"
            fill="currentColor"
          />
        </svg>

        Meer acties

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`size-4 transition ${
            geopend
              ? "rotate-180"
              : ""
          }`}
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
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="p-2">
            <Link
              href="/deskcontroles/verwijderd"
              role="menuitem"
              onClick={() =>
                setGeopend(
                  false,
                )
              }
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span>
                <span className="block">
                  Verwijderde deskcontroles
                </span>

                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  Verwijderde records bekijken en herstellen
                </span>
              </span>
            </Link>

            <a
              href="/deskcontroles/export-openstaand"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <span>
                <span className="block">
                  Excel Geen / In opmaak
                </span>

                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  Openstaande deskcontroles downloaden
                </span>
              </span>
            </a>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-3">
            <DeskcontroleStatusExcelImport />
          </div>
        </div>
      ) : null}
    </div>
  );
}


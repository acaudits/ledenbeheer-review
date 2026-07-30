"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UitloggenButton } from "@/components/UitloggenButton";
import { BeheerderLink } from "@/components/BeheerderLink";


const navigatie = [
  {
    naam: "Dashboard",
    href: "/",
    icoon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    naam: "Persoonscertificaten",
    href: "/persoonscertificaten",
    icoon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    naam: "Procescertificaten",
    href: "/procescertificaten",
    icoon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d="M4 20V8h16v12M8 8V4h8v4M8 12h2m4 0h2M8 16h2m4 0h2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    naam: "Deskcontrole opvolging",
    href: "/deskcontroles",
    icoon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
      >
        <path
          d="M8 4h8m-9 3h10a2 2 0 0 1 2 2v11H5V9a2 2 0 0 1 2-2Zm2 4h6m-6 4h6m-6 4h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    naam: "Terreincontroles",
    href: "/terreincontroles",
    icoon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
      >
        <path
          d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="9"
          r="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },

];

function isActief(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type MenuInhoudProps = {
  pathname: string;
  sluitMenu?: () => void;
};

function MenuInhoud({
  pathname,
  sluitMenu,
}: MenuInhoudProps) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-6">
        <Link
          href="/"
          onClick={sluitMenu}
          className="flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition hover:bg-emerald-50"
        >
          <img
            src="/skh-logo.svg"
            alt="SKH"
            className="block max-h-20 w-full object-contain"
          />
        </Link>

        <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/60">
          Certificaten CRM
        </p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Navigatie
        </p>

        {navigatie.map((item) => {
          const actief = isActief(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={sluitMenu}
              aria-current={actief ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                actief
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={
                  actief
                    ? "text-emerald-400"
                    : "text-slate-500"
                }
              >
                {item.icoon}
              </span>

              <span>{item.naam}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <Link
          href="/persoonscertificaten/nieuw"
          onClick={sluitMenu}
          className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          <span className="mr-2 text-lg leading-none">+</span>
          Persoonscertificaat
        </Link>

        <Link
          href="/procescertificaten/nieuw"
          onClick={sluitMenu}
          className="flex w-full items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-3 text-center text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
        >
          <span className="mr-2 text-lg leading-none">+</span>
          Procescertificaat
        </Link>
        <BeheerderLink sluitMenu={sluitMenu} />
        <UitloggenButton sluitMenu={sluitMenu} />

        <p className="pt-2 text-center text-xs text-slate-600">
          SKH Certificatenbeheer
        </p>
      </div>
    </>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [mobielOpen, setMobielOpen] = useState(false);

  function openMobielMenu() {
    setMobielOpen(true);
  }

  function sluitMobielMenu() {
    setMobielOpen(false);
  }

  return (
    <>
      {/* Navigatie op desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-y-auto border-r border-white/5 bg-[#071512] lg:flex">
        <MenuInhoud pathname={pathname} />
      </aside>

      {/* Header op smartphone en tablet */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-10 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img
              src="/skh-logo.svg"
              alt="SKH"
              className="block max-h-9 w-full object-contain"
            />
          </div>

          <span className="truncate text-sm font-bold text-slate-900">
            Certificaten CRM
          </span>
        </Link>

        <button
          type="button"
          onClick={openMobielMenu}
          aria-label="Navigatiemenu openen"
          aria-expanded={mobielOpen}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-5"
          >
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* Uitklapbaar menu op smartphone en tablet */}
      {mobielOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Navigatiemenu sluiten"
            className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
            onClick={sluitMobielMenu}
          />

          <aside className="relative flex h-full w-[min(88vw,320px)] flex-col overflow-y-auto bg-[#071512] shadow-2xl">
            <button
              type="button"
              onClick={sluitMobielMenu}
              aria-label="Navigatiemenu sluiten"
              className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-5"
              >
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <MenuInhoud
              pathname={pathname}
              sluitMenu={sluitMobielMenu}
            />
          </aside>
        </div>
      )}
    </>
  );
}

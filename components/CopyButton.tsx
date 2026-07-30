"use client";

import { useState } from "react";

type CopyButtonProps = {
  waarde: string | null | undefined;
  label?: string;
};

export function CopyButton({
  waarde,
  label = "Kopiëren",
}: CopyButtonProps) {
  const [gekopieerd, setGekopieerd] = useState(false);

  if (!waarde || waarde === "—") {
    return null;
  }

  async function kopieer() {
    if (!waarde) {
      return;
    }

    try {
      await navigator.clipboard.writeText(waarde);
      setGekopieerd(true);

      window.setTimeout(() => {
        setGekopieerd(false);
      }, 1500);
    } catch {
      const tekstvak = document.createElement("textarea");
      tekstvak.value = waarde;
      tekstvak.style.position = "fixed";
      tekstvak.style.opacity = "0";

      document.body.appendChild(tekstvak);
      tekstvak.select();
      document.execCommand("copy");
      tekstvak.remove();

      setGekopieerd(true);

      window.setTimeout(() => {
        setGekopieerd(false);
      }, 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={kopieer}
      title={gekopieerd ? "Gekopieerd" : label}
      aria-label={gekopieerd ? "Gekopieerd" : label}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg border transition ${
        gekopieerd
          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
          : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      {gekopieerd ? (
        <svg viewBox="0 0 24 24" fill="none" className="size-4">
          <path
            d="m5 12 4 4L19 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="size-4">
          <rect
            x="8"
            y="8"
            width="11"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BeheerderLinkProps = {
  sluitMenu?: () => void;
};

export function BeheerderLink({ sluitMenu }: BeheerderLinkProps) {
  const [isBeheerder, setIsBeheerder] = useState(false);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    let actief = true;

    async function controleerBeheerder() {
      try {
        const response = await fetch("/api/auth/mij", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const gegevens = await response.json();

        if (actief) {
          setIsBeheerder(gegevens.beheerder === true);
        }
      } catch (fout) {
        console.error("Beheerdercontrole mislukt:", fout);
      } finally {
        if (actief) {
          setGeladen(true);
        }
      }
    }

    controleerBeheerder();

    return () => {
      actief = false;
    };
  }, []);

  if (!geladen || !isBeheerder) {
    return null;
  }

  return (
    <Link
      href="/gebruikers"
      onClick={sluitMenu}
      className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
    >
      Gebruikersbeheer
    </Link>
  );
}


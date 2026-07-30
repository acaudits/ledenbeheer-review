"use client";

import Link from "next/link";

type BeheerderLinkProps = {
  rol: string | null;
  sluitMenu?: () => void;
};

export function BeheerderLink({
  rol,
  sluitMenu,
}: BeheerderLinkProps) {
  if (
    rol !== "BEHEERDER"
  ) {
    return null;
  }

  return (
    <Link
      href="/gebruikers"
      onClick={sluitMenu}
      className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      Gebruikersbeheer
    </Link>
  );
}

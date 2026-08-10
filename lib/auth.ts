import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  heeftMachtiging,
  isGebruikersrol,
  type GebruikersrolWaarde,
  type Machtiging,
} from "@/lib/autorisatie";
import {
  prisma,
} from "@/lib/prisma";
import {
  createClient,
} from "@/lib/supabase/server";

export async function haalIngelogdeGebruikerOp() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsFout,
  } =
    await supabase.auth.getClaims();

  if (claimsFout) {
    return null;
  }

  const emailClaim =
    claimsData?.claims
      ?.email;

  if (
    typeof emailClaim !==
    "string"
  ) {
    return null;
  }

  const email =
    emailClaim
      .trim()
      .toLowerCase();

  if (!email) {
    return null;
  }

  return prisma
    .toegestaneGebruiker
    .findUnique({
      where: {
        email,
      },
    });
}

export async function vereisIngelogdeGebruiker() {
  const gebruiker =
    await haalIngelogdeGebruikerOp();

  if (!gebruiker?.actief) {
    redirect(
      "/inloggen",
    );
  }

  return gebruiker;
}

export async function vereisRol(
  ...toegelatenRollen:
    GebruikersrolWaarde[]
) {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  if (
    !isGebruikersrol(
      gebruiker.rol,
    ) ||
    !toegelatenRollen.includes(
      gebruiker.rol,
    )
  ) {
    redirect("/");
  }

  return gebruiker;
}

export async function vereisMachtiging(
  machtiging: Machtiging,
) {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  if (
    !heeftMachtiging(
      gebruiker.rol,
      machtiging,
    )
  ) {
    redirect("/");
  }

  return gebruiker;
}

export async function vereisBeheerder() {
  return vereisRol(
    "BEHEERDER",
  );
}

import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function haalIngelogdeGebruikerOp() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const email = user.email.trim().toLowerCase();

  return prisma.toegestaneGebruiker.findUnique({
    where: {
      email,
    },
  });
}

export async function vereisIngelogdeGebruiker() {
  const gebruiker = await haalIngelogdeGebruikerOp();

  if (!gebruiker?.actief) {
    redirect("/inloggen");
  }

  return gebruiker;
}

export async function vereisBeheerder() {
  const gebruiker = await vereisIngelogdeGebruiker();

  if (!gebruiker.beheerder) {
    redirect("/");
  }

  return gebruiker;
}

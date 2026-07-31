"use server";

import { revalidatePath } from "next/cache";

import { vereisIngelogdeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfielStatus = {
  succes: boolean;
  melding: string;
};

function normaliseerTekst(
  waarde: FormDataEntryValue | null,
) {
  return String(waarde ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normaliseerEmail(
  waarde: FormDataEntryValue | null,
) {
  return String(waarde ?? "")
    .trim()
    .toLowerCase();
}

function geldigEmailadres(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function slaEigenProfielOp(
  _vorigeStatus: ProfielStatus,
  formData: FormData,
): Promise<ProfielStatus> {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  const voornaam = normaliseerTekst(
    formData.get("voornaam"),
  );

  const achternaam = normaliseerTekst(
    formData.get("achternaam"),
  );

  const email = normaliseerEmail(
    formData.get("email"),
  );

  if (
    voornaam.length < 2 ||
    voornaam.length > 100
  ) {
    return {
      succes: false,
      melding:
        "Vul een geldige voornaam in van maximaal 100 tekens.",
    };
  }

  if (
    achternaam.length < 2 ||
    achternaam.length > 150
  ) {
    return {
      succes: false,
      melding:
        "Vul een geldige achternaam in van maximaal 150 tekens.",
    };
  }

  if (!geldigEmailadres(email)) {
    return {
      succes: false,
      melding: "Vul een geldig e-mailadres in.",
    };
  }

  const bestaandeGebruiker =
    await prisma.toegestaneGebruiker.findFirst({
      where: {
        email,
        NOT: {
          id: gebruiker.id,
        },
      },
      select: {
        id: true,
      },
    });

  if (bestaandeGebruiker) {
    return {
      succes: false,
      melding:
        "Dit e-mailadres is al gekoppeld aan een andere gebruiker.",
    };
  }

  if (!gebruiker.authUserId) {
    return {
      succes: false,
      melding:
        "Het profiel is nog niet aan het loginaccount gekoppeld. Log opnieuw in en probeer opnieuw.",
    };
  }

  const volledigeNaam =
    `${voornaam} ${achternaam}`.trim();

  const vorigEmailadres =
    gebruiker.email;

  const supabaseAdmin =
    createAdminClient();

  const {
    error: authFout,
  } =
    await supabaseAdmin.auth.admin.updateUserById(
      gebruiker.authUserId,
      {
        email,
        email_confirm: true,
        user_metadata: {
          naam: volledigeNaam,
          voornaam,
          achternaam,
        },
      },
    );

  if (authFout) {
    console.error(
      "Supabase-profiel aanpassen mislukt:",
      authFout,
    );

    return {
      succes: false,
      melding:
        "Het loginaccount kon niet worden aangepast.",
    };
  }

  try {
    await prisma.toegestaneGebruiker.update({
      where: {
        id: gebruiker.id,
      },
      data: {
        email,
        naam: volledigeNaam,
        voornaam,
        achternaam,
        profielVoltooidOp:
          gebruiker.profielVoltooidOp ??
          new Date(),
      },
    });
  } catch (fout) {
    console.error(
      "Profiel opslaan in database mislukt:",
      fout,
    );

    /*
     * Probeer het e-mailadres in Supabase terug
     * te zetten als Prisma opslaan mislukt.
     */
    if (email !== vorigEmailadres) {
      const { error: herstelFout } =
        await supabaseAdmin.auth.admin.updateUserById(
          gebruiker.authUserId,
          {
            email: vorigEmailadres,
            email_confirm: true,
          },
        );

      if (herstelFout) {
        console.error(
          "Supabase-e-mailadres herstellen mislukt:",
          herstelFout,
        );
      }
    }

    return {
      succes: false,
      melding:
        "Het profiel kon niet volledig worden opgeslagen.",
    };
  }

  revalidatePath("/");
  revalidatePath("/mijn-profiel");
  revalidatePath("/profiel-voltooien");

  return {
    succes: true,
    melding: "Je profiel is opgeslagen.",
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { isGebruikersrol } from "@/lib/autorisatie";
import { prisma } from "@/lib/prisma";
import { vereisBeheerder } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type GebruikerFormulierStatus = {
  succes: boolean;
  melding: string;
};

export type WachtwoordResetStatus = {
  succes: boolean;
  melding: string;
};

function normaliseerEmail(
  waarde: FormDataEntryValue | null,
) {
  return String(waarde ?? "")
    .trim()
    .toLowerCase();
}

export async function maakGebruikerAan(
  _vorigeStatus: GebruikerFormulierStatus,
  formData: FormData,
): Promise<GebruikerFormulierStatus> {
  await vereisBeheerder();

  const naam = String(
    formData.get("naam") ?? "",
  ).trim();

  const email = normaliseerEmail(
    formData.get("email"),
  );

  const tijdelijkWachtwoord = String(
    formData.get("tijdelijkWachtwoord") ?? "",
  );

  const rolWaarde = String(
    formData.get("rol") ?? "",
  );

  if (!isGebruikersrol(rolWaarde)) {
    return {
      succes: false,
      melding:
        "Selecteer een geldige gebruikersrol.",
    };
  }

  const beheerder =
    rolWaarde === "BEHEERDER";

  if (!email) {
    return {
      succes: false,
      melding: "Vul een e-mailadres in.",
    };
  }

  if (!email.includes("@")) {
    return {
      succes: false,
      melding: "Vul een geldig e-mailadres in.",
    };
  }

  if (tijdelijkWachtwoord.length < 12) {
    return {
      succes: false,
      melding:
        "Het tijdelijke wachtwoord moet minimaal 12 tekens bevatten.",
    };
  }

  const bestaandeGebruiker =
    await prisma.toegestaneGebruiker.findUnique({
      where: {
        email,
      },
    });

  if (bestaandeGebruiker) {
    return {
      succes: false,
      melding:
        "Dit e-mailadres staat al in gebruikersbeheer.",
    };
  }

  const supabaseAdmin = createAdminClient();

  const {
    data: authData,
    error: authFout,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tijdelijkWachtwoord,
    email_confirm: true,
    user_metadata: {
      naam: naam || null,
    },
  });

  if (authFout || !authData.user) {
    console.error(
      "Supabase-gebruiker aanmaken mislukt:",
      authFout,
    );

    return {
      succes: false,
      melding:
        authFout?.message ||
        "De gebruiker kon niet in Supabase worden aangemaakt.",
    };
  }

  try {
    await prisma.toegestaneGebruiker.create({
      data: {
        email,
        naam: naam || null,
        rol: rolWaarde,
        beheerder,
        actief: true,
        wachtwoordWijzigen: true,
        authUserId: authData.user.id,
        uitgenodigdOp: new Date(),
      },
    });
  } catch (error) {
    console.error(
      "Gebruiker opslaan in database mislukt:",
      error,
    );

    /*
     * Voorkom dat er een los Supabase-account blijft bestaan
     * wanneer het opslaan in Prisma mislukt.
     */
    await supabaseAdmin.auth.admin.deleteUser(
      authData.user.id,
    );

    return {
      succes: false,
      melding:
        "De gebruiker kon niet in de database worden opgeslagen.",
    };
  }

  revalidatePath("/gebruikers");

  return {
    succes: true,
    melding:
      "De gebruiker is aangemaakt. Geef het tijdelijke wachtwoord veilig door.",
  };
}

export async function stelTijdelijkWachtwoordIn(
  _vorigeStatus: WachtwoordResetStatus,
  formData: FormData,
): Promise<WachtwoordResetStatus> {
  const huidigeBeheerder =
    await vereisBeheerder();

  const id = Number(formData.get("id"));

  const tijdelijkWachtwoord = String(
    formData.get("tijdelijkWachtwoord") ?? "",
  );

  const bevestiging = String(
    formData.get("bevestiging") ?? "",
  );

  if (!Number.isInteger(id) || id <= 0) {
    return {
      succes: false,
      melding: "Ongeldige gebruiker.",
    };
  }

  if (tijdelijkWachtwoord.length < 12) {
    return {
      succes: false,
      melding:
        "Het tijdelijke wachtwoord moet minimaal 12 tekens bevatten.",
    };
  }

  if (tijdelijkWachtwoord !== bevestiging) {
    return {
      succes: false,
      melding:
        "De twee tijdelijke wachtwoorden zijn niet gelijk.",
    };
  }

  const gebruiker =
    await prisma.toegestaneGebruiker.findUnique({
      where: {
        id,
      },
    });

  if (!gebruiker) {
    return {
      succes: false,
      melding: "De gebruiker werd niet gevonden.",
    };
  }

  if (gebruiker.id === huidigeBeheerder.id) {
    return {
      succes: false,
      melding:
        "Je kunt via gebruikersbeheer niet je eigen wachtwoord resetten.",
    };
  }

  if (!gebruiker.authUserId) {
    return {
      succes: false,
      melding:
        "Deze gebruiker is nog niet aan een Supabase-account gekoppeld.",
    };
  }

  const vorigeVerplichting =
    gebruiker.wachtwoordWijzigen;

  /*
   * Zet eerst de verplichting in onze database aan.
   * Als Supabase daarna mislukt, draaien we dit terug.
   */
  await prisma.toegestaneGebruiker.update({
    where: {
      id: gebruiker.id,
    },
    data: {
      wachtwoordWijzigen: true,
    },
  });

  const supabaseAdmin = createAdminClient();

  const { error } =
    await supabaseAdmin.auth.admin.updateUserById(
      gebruiker.authUserId,
      {
        password: tijdelijkWachtwoord,
      },
    );

  if (error) {
    await prisma.toegestaneGebruiker.update({
      where: {
        id: gebruiker.id,
      },
      data: {
        wachtwoordWijzigen:
          vorigeVerplichting,
      },
    });

    console.error(
      "Tijdelijk wachtwoord instellen mislukt:",
      error,
    );

    return {
      succes: false,
      melding:
        error.message ||
        "Het tijdelijke wachtwoord kon niet worden ingesteld.",
    };
  }

  revalidatePath("/gebruikers");

  return {
    succes: true,
    melding:
      "Het tijdelijke wachtwoord is ingesteld. De gebruiker moet het bij de volgende aanmelding wijzigen.",
  };
}

export async function wijzigGebruikerStatus(
  formData: FormData,
) {
  const huidigeBeheerder =
    await vereisBeheerder();

  const id = Number(formData.get("id"));

  const nieuweStatus =
    String(formData.get("actief")) === "true";

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Ongeldige gebruiker.");
  }

  const gebruiker =
    await prisma.toegestaneGebruiker.findUnique({
      where: {
        id,
      },
    });

  if (!gebruiker) {
    throw new Error(
      "De gebruiker werd niet gevonden.",
    );
  }

  if (
    gebruiker.id === huidigeBeheerder.id &&
    nieuweStatus === false
  ) {
    throw new Error(
      "Je kunt je eigen beheerdersaccount niet deactiveren.",
    );
  }

  const vorigeStatus = gebruiker.actief;

  await prisma.toegestaneGebruiker.update({
    where: {
      id,
    },
    data: {
      actief: nieuweStatus,
    },
  });

  if (gebruiker.authUserId) {
    const supabaseAdmin =
      createAdminClient();

    const { error } =
      await supabaseAdmin.auth.admin.updateUserById(
        gebruiker.authUserId,
        {
          ban_duration: nieuweStatus
            ? "none"
            : "876000h",
        },
      );

    if (error) {
      await prisma.toegestaneGebruiker.update({
        where: {
          id,
        },
        data: {
          actief: vorigeStatus,
        },
      });

      console.error(
        "Supabase-status wijzigen mislukt:",
        error,
      );

      throw new Error(
        "De status kon niet in Supabase worden gewijzigd.",
      );
    }
  }

  revalidatePath("/gebruikers");
}


export async function wijzigGebruikerRol(
  formData: FormData,
) {
  const huidigeBeheerder =
    await vereisBeheerder();

  const id = Number(
    formData.get("id"),
  );

  const rolWaarde = String(
    formData.get("rol") ?? "",
  );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Ongeldige gebruiker.",
    );
  }

  if (
    !isGebruikersrol(
      rolWaarde,
    )
  ) {
    throw new Error(
      "Ongeldige gebruikersrol.",
    );
  }

  const gebruiker =
    await prisma
      .toegestaneGebruiker
      .findUnique({
        where: {
          id,
        },
      });

  if (!gebruiker) {
    throw new Error(
      "De gebruiker werd niet gevonden.",
    );
  }

  if (
    gebruiker.id ===
      huidigeBeheerder.id &&
    rolWaarde !== "BEHEERDER"
  ) {
    throw new Error(
      "Je kunt je eigen beheerdersrol niet verwijderen.",
    );
  }

  await prisma
    .toegestaneGebruiker
    .update({
      where: {
        id,
      },

      data: {
        rol: rolWaarde,

        /*
         * Tijdelijk synchroon houden zolang
         * oudere componenten dit veld gebruiken.
         */
        beheerder:
          rolWaarde ===
          "BEHEERDER",
      },
    });

  revalidatePath(
    "/gebruikers",
  );
}

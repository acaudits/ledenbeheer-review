import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  heeftMachtiging,
  type Machtiging,
} from "@/lib/autorisatie";
import {
  vereisIngelogdeGebruiker,
} from "@/lib/auth";
import type {
  OpvolgingBron,
} from "@/lib/opvolging-sancties";

async function vereisEenVan(
  ...machtigingen: Machtiging[]
) {
  const gebruiker =
    await vereisIngelogdeGebruiker();

  const toegelaten =
    machtigingen.some(
      (machtiging) =>
        heeftMachtiging(
          gebruiker.rollen,
          machtiging,
        ),
    );

  if (!toegelaten) {
    redirect("/");
  }

  return gebruiker;
}

export function vereisOpvolgingSanctieBeheer(
  bronType: OpvolgingBron,
) {
  if (bronType === "DESKCONTROLE") {
    return vereisEenVan(
      "DESKCONTROLES_BEHEREN",
    );
  }

  if (
    bronType === "HANDMATIG" ||
    bronType === "EXCEL_IMPORT"
  ) {
    return vereisEenVan(
      "DESKCONTROLES_BEHEREN",
      "TERREINCONTROLES_BEHEREN",
    );
  }

  return vereisEenVan(
    "TERREINCONTROLES_BEHEREN",
  );
}

export function vereisOpvolgingSanctieInzage(
  bronType: OpvolgingBron,
) {
  if (bronType === "DESKCONTROLE") {
    return vereisEenVan(
      "DESKCONTROLES_BEKIJKEN",
    );
  }

  if (
    bronType === "HANDMATIG" ||
    bronType === "EXCEL_IMPORT"
  ) {
    return vereisEenVan(
      "DESKCONTROLES_BEKIJKEN",
      "TERREINCONTROLES_BEKIJKEN",
    );
  }

  return vereisEenVan(
    "TERREINCONTROLES_BEKIJKEN",
  );
}

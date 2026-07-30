export const GEBRUIKERSROLLEN = [
  "BEHEERDER",
  "ADMINISTRATIEF",
  "AUDITEUR",
] as const;

export type GebruikersrolWaarde =
  (typeof GEBRUIKERSROLLEN)[number];

export const MACHTIGINGEN = [
  "GEBRUIKERSBEHEER",

  "CERTIFICATEN_BEKIJKEN",
  "CERTIFICATEN_BEHEREN",

  "DESKCONTROLES_BEKIJKEN",
  "DESKCONTROLES_BEHEREN",
  "DESKCONTROLES_EXCEL_EXPORTEREN",
  "DESKCONTROLES_STATUS_IMPORTEREN",

  "TERREINCONTROLES_BEKIJKEN",
  "TERREINCONTROLES_BEHEREN",
  "TERREINCONTROLES_EXPORTEREN",

  "ATTESTSTATISTIEKEN_BEHEREN",
] as const;

export type Machtiging =
  (typeof MACHTIGINGEN)[number];

const ROLLEN_PER_MACHTIGING: Record<
  Machtiging,
  readonly GebruikersrolWaarde[]
> = {
  GEBRUIKERSBEHEER: [
    "BEHEERDER",
  ],

  CERTIFICATEN_BEKIJKEN: [
    "BEHEERDER",
    "ADMINISTRATIEF",
    "AUDITEUR",
  ],

  CERTIFICATEN_BEHEREN: [
    "BEHEERDER",
    "ADMINISTRATIEF",
  ],

  DESKCONTROLES_BEKIJKEN: [
    "BEHEERDER",
    "ADMINISTRATIEF",
    "AUDITEUR",
  ],

  DESKCONTROLES_BEHEREN: [
    "BEHEERDER",
    "AUDITEUR",
  ],

  DESKCONTROLES_EXCEL_EXPORTEREN: [
    "BEHEERDER",
  ],

  DESKCONTROLES_STATUS_IMPORTEREN: [
    "BEHEERDER",
  ],

  TERREINCONTROLES_BEKIJKEN: [
    "BEHEERDER",
    "ADMINISTRATIEF",
    "AUDITEUR",
  ],

  TERREINCONTROLES_BEHEREN: [
    "BEHEERDER",
    "AUDITEUR",
  ],

  TERREINCONTROLES_EXPORTEREN: [
    "BEHEERDER",
  ],

  ATTESTSTATISTIEKEN_BEHEREN: [
    "BEHEERDER",
  ],
};

export function isGebruikersrol(
  waarde: unknown,
): waarde is GebruikersrolWaarde {
  return (
    typeof waarde === "string" &&
    GEBRUIKERSROLLEN.some(
      (rol) => rol === waarde,
    )
  );
}

export function heeftMachtiging(
  rolWaarde: unknown,
  machtiging: Machtiging,
) {
  if (
    !isGebruikersrol(
      rolWaarde,
    )
  ) {
    return false;
  }

  return ROLLEN_PER_MACHTIGING[
    machtiging
  ].includes(
    rolWaarde,
  );
}

export function rolLabel(
  rolWaarde: unknown,
) {
  switch (rolWaarde) {
    case "BEHEERDER":
      return "Beheerder";

    case "ADMINISTRATIEF":
      return "Administratief";

    case "AUDITEUR":
      return "Auditeur";

    default:
      return "Onbekende rol";
  }
}

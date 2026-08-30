export const GEBRUIKERSROLLEN = [
  "BEHEERDER",
  "ADMINISTRATIEF",
  "AUDITEUR",
  "INTERNE_AUDITEUR",
  "KLACHTENBEHANDELAAR",
  "BEGELEIDER",
  "HELPDESK",
  "FACTURATIE",
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
  "TERREINCONTROLES_STATUS_IMPORTEREN",

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

  TERREINCONTROLES_STATUS_IMPORTEREN: [
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

export function normaliseerRollen(
  waarde: unknown,
): GebruikersrolWaarde[] {
  const waarden =
    Array.isArray(waarde)
      ? waarde
      : [waarde];

  return Array.from(
    new Set(
      waarden.filter(
        isGebruikersrol,
      ),
    ),
  );
}

export function heeftRol(
  rollen: unknown,
  rol: GebruikersrolWaarde,
) {
  return normaliseerRollen(
    rollen,
  ).includes(rol);
}

export function heeftMachtiging(
  rollen: unknown,
  machtiging: Machtiging,
) {
  const geldigeRollen =
    normaliseerRollen(rollen);

  return geldigeRollen.some(
    (rol) =>
      ROLLEN_PER_MACHTIGING[
        machtiging
      ].includes(rol),
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

    case "INTERNE_AUDITEUR":
      return "Interne Auditeur";

    case "KLACHTENBEHANDELAAR":
      return "Klachtenbehandelaar";

    case "BEGELEIDER":
      return "Begeleider";

    case "HELPDESK":
      return "Helpdesk";

    case "FACTURATIE":
      return "Facturatie";

    default:
      return "Onbekende rol";
  }
}

export function bepaalPrimaireRol(
  rollen: readonly GebruikersrolWaarde[],
): GebruikersrolWaarde {
  const prioriteit:
    readonly GebruikersrolWaarde[] = [
      "BEHEERDER",
      "AUDITEUR",
      "ADMINISTRATIEF",
      "INTERNE_AUDITEUR",
      "KLACHTENBEHANDELAAR",
      "BEGELEIDER",
      "HELPDESK",
      "FACTURATIE",
    ];

  return (
    prioriteit.find((rol) =>
      rollen.includes(rol),
    ) ?? "AUDITEUR"
  );
}

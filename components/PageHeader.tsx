import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";

type PageHeaderProps = {
  titel: string;
  beschrijving?: string;
  bovenTitel?: string;
  actieTekst?: string;
  actieHref?: string;
  secundaireActieTekst?: string;
  secundaireActieHref?: string;
  compact?: boolean;
};

export function PageHeader({
  titel,
  beschrijving,
  bovenTitel = "Certificaten CRM",
  actieTekst,
  actieHref,
  secundaireActieTekst,
  secundaireActieHref,
}: PageHeaderProps) {
  const acties =
    (
      actieTekst &&
      actieHref
    ) ||
    (
      secundaireActieTekst &&
      secundaireActieHref
    ) ? (
      <>
        {actieTekst &&
        actieHref ? (
          <BeheerActieLink
            href={actieHref}
            variant="primair"
            plusIcoon
            kinderen={actieTekst}
          />
        ) : null}

        {secundaireActieTekst &&
        secundaireActieHref ? (
          <BeheerActieLink
            href={
              secundaireActieHref
            }
            variant="neutraal"
            kinderen={
              secundaireActieTekst
            }
          />
        ) : null}
      </>
    ) : undefined;

  return (
    <BeheerOverzichtHeader
      bovenTitel={bovenTitel}
      titel={titel}
      omschrijving={
        beschrijving
      }
      acties={acties}
    />
  );
}

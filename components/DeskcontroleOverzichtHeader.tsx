"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";
import {
  DeskcontroleMeerMenu,
} from "@/components/DeskcontroleMeerMenu";
import {
  DESKCONTROLE_SERVERGEGEVENS_EVENT,
  type DeskcontroleServergegevens,
} from "@/hooks/useDeskcontrolesQuery";

type DeskcontroleOverzichtHeaderProps = {
  aantal: number | null;
  magBeheren: boolean;
  magExporteren: boolean;
  magStatussenImporteren: boolean;
  serverModus?: boolean;
};

export function DeskcontroleOverzichtHeader({
  aantal,
  magBeheren,
  magExporteren,
  magStatussenImporteren,
  serverModus = false,
}: DeskcontroleOverzichtHeaderProps) {
  const [
    serverAantal,
    setServerAantal,
  ] = useState<number | null>(
    aantal,
  );

  useEffect(() => {
    if (!serverModus) {
      return;
    }

    function verwerkServergegevens(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<
          DeskcontroleServergegevens
        >;

      setServerAantal(
        customEvent.detail
          .aantalTotaal,
      );
    }

    window.addEventListener(
      DESKCONTROLE_SERVERGEGEVENS_EVENT,
      verwerkServergegevens,
    );

    return () => {
      window.removeEventListener(
        DESKCONTROLE_SERVERGEGEVENS_EVENT,
        verwerkServergegevens,
      );
    };
  }, [serverModus]);

  const getoondAantal =
    serverModus
      ? serverAantal
      : aantal;

  return (
    <BeheerOverzichtHeader
      bovenTitel="Deskcontroles"
      titel="Deskcontrole opvolging"
      omschrijving={
        getoondAantal === null
          ? "Actieve deskcontroles laden..."
          : `${getoondAantal} actieve ${
              getoondAantal === 1
                ? "deskcontrole"
                : "deskcontroles"
            }`
      }
      acties={
        <>
          {magBeheren ? (
            <BeheerActieLink
              href="/deskcontroles/nieuw"
              variant="primair"
              plusIcoon
              kinderen="Nieuwe deskcontrole"
            />
          ) : null}

          {magExporteren ? (
            <BeheerActieLink
              href="/deskcontroles/export"
              variant="secundair"
              kinderen="Exporteren naar Excel"
            />
          ) : null}

          <DeskcontroleMeerMenu
            magBeheren={
              magBeheren
            }
            magExporteren={
              magExporteren
            }
            magStatussenImporteren={
              magStatussenImporteren
            }
          />
        </>
      }
    />
  );
}

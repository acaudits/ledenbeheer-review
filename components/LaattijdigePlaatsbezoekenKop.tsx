"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  PageHeader,
} from "@/components/PageHeader";
import {
  type LaattijdigePlaatsbezoekenOverzicht,
  LAATTIJDIGE_PLAATSBEZOEKEN_SERVERGEGEVENS_EVENT,
  type LaattijdigePlaatsbezoekenServergegevens,
} from "@/hooks/useLaattijdigePlaatsbezoekenQuery";

export function LaattijdigePlaatsbezoekenKop() {
  const [
    overzicht,
    setOverzicht,
  ] = useState<
    LaattijdigePlaatsbezoekenOverzicht | null
  >(null);

  useEffect(() => {
    function ontvang(
      event: Event,
    ) {
      const aangepast =
        event as CustomEvent<
          LaattijdigePlaatsbezoekenServergegevens
        >;

      setOverzicht(
        aangepast.detail
          .overzicht,
      );
    }

    window.addEventListener(
      LAATTIJDIGE_PLAATSBEZOEKEN_SERVERGEGEVENS_EVENT,
      ontvang,
    );

    return () => {
      window.removeEventListener(
        LAATTIJDIGE_PLAATSBEZOEKEN_SERVERGEGEVENS_EVENT,
        ontvang,
      );
    };
  }, []);

  const beschrijving =
    overzicht
      ? `${overzicht.plaatsbezoeken} ${
          overzicht.plaatsbezoeken ===
          1
            ? "gemeld plaatsbezoek"
            : "gemelde plaatsbezoeken"
        } in ${overzicht.meldingen} ${
          overzicht.meldingen ===
          1
            ? "melding"
            : "meldingen"
        }`
      : "Plaatsbezoeken laden...";

  return (
    <PageHeader
      compact
      titel="Laattijdige plaatsbezoeken"
      beschrijving={
        beschrijving
      }
    />
  );
}

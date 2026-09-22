"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type LaattijdigeMeldingState,
} from "@/app/aanmelden-laattijdige-plaatsbezoeken/actions";

type Stap =
  | "PERSOONSGEGEVENS"
  | "ADRES"
  | "PLANNING"
  | "BEVESTIGING"
  | "VERZENDEN";

type Momentopname = {
  naamAdi: string;
  persoonsId: string;
  privacyKennisname: boolean;
  aantalPlaatsbezoeken: number;
  bezoeken: Array<{
    gemeente: string;
    straat: string;
    huisnummer: string;
    busnummer: string;
    extraAdresdetails: string;
    gemeenschappelijkeDelen: boolean;
    datum: string;
    tijdstip: string;
    reden: string;
  }>;
};

type Invoer = {
  stap: Stap;
  resultaat:
    LaattijdigeMeldingState;
  momentopname: Momentopname;
};

const ROUTE =
  "/api/publiek/laattijdige-formulierlog";

function bepaalApparaat() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "ONBEKEND";
  }

  const breedte =
    window.innerWidth;

  if (breedte < 768) {
    return "MOBIEL";
  }

  if (breedte < 1100) {
    return "TABLET";
  }

  return "DESKTOP";
}

async function verstuur(
  inhoud: Record<
    string,
    unknown
  >,
) {
  try {
    await fetch(ROUTE, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(inhoud),
    });
  } catch {
    /*
     * Formulierlogging mag de
     * gebruiker nooit hinderen.
     */
  }
}

export function useLaattijdigeFormulierlog({
  stap,
  resultaat,
  momentopname,
}: Invoer) {
  const [sessieToken] =
    useState(
      () =>
        globalThis.crypto.randomUUID(),
    );

  const laatsteInteractie =
    useRef(0);

  const momentopnameRef =
    useRef(momentopname);

  const stapRef =
    useRef<Stap>(stap);

  const resultaatVerstuurd =
    useRef("");

  useEffect(() => {
    momentopnameRef.current =
      momentopname;
    stapRef.current = stap;
  }, [
    momentopname,
    stap,
  ]);

  const registreerActiviteit =
    useCallback(() => {
      laatsteInteractie.current =
        Date.now();
    }, []);

  const registreerOvamLinkKlik =
    useCallback(() => {
      laatsteInteractie.current =
        Date.now();

      void verstuur({
        type: "OVAM_LINK",
        sessieToken,
        stap: stapRef.current,
        momentopname:
          momentopnameRef.current,
      });
    }, [sessieToken]);

  useEffect(() => {
    laatsteInteractie.current =
      Date.now();

    void verstuur({
      type: "START",
      sessieToken,
      apparaat:
        bepaalApparaat(),
      stap: stapRef.current,
      momentopname:
        momentopnameRef.current,
    });

    const interval =
      window.setInterval(() => {
        const recentActief =
          Date.now() -
            laatsteInteractie.current <
          60_000;

        if (
          document.visibilityState ===
            "visible" &&
          recentActief
        ) {
          void verstuur({
            type: "HEARTBEAT",
            sessieToken,
            duurDelta: 15,
            stap: stapRef.current,
            momentopname:
              momentopnameRef.current,
          });
        }
      }, 15_000);

    function sluitSessie() {
      const inhoud =
        JSON.stringify({
          type: "ONVOLLEDIG",
          sessieToken,
          stap: stapRef.current,
          momentopname:
            momentopnameRef.current,
        });

      try {
        navigator.sendBeacon(
          ROUTE,
          new Blob(
            [inhoud],
            {
              type:
                "application/json",
            },
          ),
        );
      } catch {
        // Geen invloed op navigatie.
      }
    }

    window.addEventListener(
      "pagehide",
      sluitSessie,
    );

    return () => {
      window.clearInterval(
        interval,
      );

      window.removeEventListener(
        "pagehide",
        sluitSessie,
      );
    };
  }, [sessieToken]);

  useEffect(() => {
    const sleutel =
      resultaat.geslaagd
        ? `geslaagd:${
            resultaat.referentie ??
            ""
          }`
        : resultaat.fout
          ? `mislukt:${resultaat.fout}`
          : "";

    if (
      !sleutel ||
      resultaatVerstuurd.current ===
        sleutel
    ) {
      return;
    }

    resultaatVerstuurd.current =
      sleutel;

    void verstuur({
      type: "RESULTAAT",
      sessieToken,
      geslaagd:
        resultaat.geslaagd ===
        true,
      referentie:
        resultaat.referentie ??
        null,
      foutmelding:
        resultaat.fout ?? null,
      stap:
        resultaat.geslaagd
          ? "VOLTOOID"
          : stapRef.current,
      momentopname:
        momentopnameRef.current,
    });
  }, [
    resultaat.fout,
    resultaat.geslaagd,
    resultaat.referentie,
    sessieToken,
  ]);

  return {
    sessieToken,
    registreerActiviteit,
    registreerOvamLinkKlik,
  };
}

"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LAATSTE_ACTIVITEIT_SLEUTEL,
  MAXIMALE_INACTIVITEIT_MS,
} from "@/lib/inactiviteit";

type Props = {
  pathname: string;
};

export function InactiviteitBewaker({
  pathname,
}: Props) {
  useEffect(() => {
    let timer: number | undefined;
    let uitloggenBezig = false;

    function leesLaatsteActiviteit() {
      const waarde = Number(
        window.localStorage.getItem(
          LAATSTE_ACTIVITEIT_SLEUTEL,
        ),
      );

      return Number.isFinite(waarde) &&
        waarde > 0
        ? waarde
        : null;
    }

    async function uitloggenDoorInactiviteit() {
      if (uitloggenBezig) {
        return;
      }

      uitloggenBezig = true;

      if (timer) {
        window.clearTimeout(timer);
      }

      try {
        await fetch("/api/aanwezigheid", {
          method: "DELETE",
          credentials: "include",
          keepalive: true,
        });
      } catch (fout) {
        console.warn(
          "Aanwezigheidsstatus bijwerken mislukt:",
          fout,
        );
      }

      window.localStorage.removeItem(
        LAATSTE_ACTIVITEIT_SLEUTEL,
      );

      try {
        const supabase = createClient();

        await supabase.auth.signOut({
          scope: "local",
        });
      } finally {
        window.location.replace(
          "/inloggen?fout=inactief",
        );
      }
    }

    function planUitloggen(
      laatsteActiviteit: number,
    ) {
      if (timer) {
        window.clearTimeout(timer);
      }

      const resterend =
        MAXIMALE_INACTIVITEIT_MS -
        (Date.now() - laatsteActiviteit);

      if (resterend <= 0) {
        void uitloggenDoorInactiviteit();
        return;
      }

      timer = window.setTimeout(
        () =>
          void uitloggenDoorInactiviteit(),
        resterend,
      );
    }

    function registreerActiviteit() {
      if (uitloggenBezig) {
        return;
      }

      const nu = Date.now();
      const vorige =
        leesLaatsteActiviteit();

      /*
       * Controleer eerst de verstreken tijd. Zo kan een klik na
       * het ontwaken van een laptop de verlopen sessie niet
       * opnieuw actief maken.
       */
      if (
        vorige &&
        nu - vorige >=
          MAXIMALE_INACTIVITEIT_MS
      ) {
        void uitloggenDoorInactiviteit();
        return;
      }

      window.localStorage.setItem(
        LAATSTE_ACTIVITEIT_SLEUTEL,
        String(nu),
      );

      planUitloggen(nu);
    }

    function controleerBijTerugkeer() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        registreerActiviteit();
      }
    }

    function synchroniseerTabbladen(
      event: StorageEvent,
    ) {
      if (
        event.key !==
        LAATSTE_ACTIVITEIT_SLEUTEL
      ) {
        return;
      }

      if (event.newValue === null) {
        void uitloggenDoorInactiviteit();
        return;
      }

      const tijdstip = Number(
        event.newValue,
      );

      if (
        Number.isFinite(tijdstip) &&
        tijdstip > 0
      ) {
        planUitloggen(tijdstip);
      }
    }

    const bestaandeActiviteit =
      leesLaatsteActiviteit();

    if (
      bestaandeActiviteit &&
      Date.now() -
        bestaandeActiviteit >=
        MAXIMALE_INACTIVITEIT_MS
    ) {
      void uitloggenDoorInactiviteit();

      return () => {
        if (timer) {
          window.clearTimeout(timer);
        }
      };
    }

    registreerActiviteit();

    window.addEventListener(
      "pointerdown",
      registreerActiviteit,
    );
    window.addEventListener(
      "keydown",
      registreerActiviteit,
    );
    window.addEventListener(
      "scroll",
      registreerActiviteit,
      { passive: true },
    );
    window.addEventListener(
      "touchstart",
      registreerActiviteit,
      { passive: true },
    );
    window.addEventListener(
      "focus",
      registreerActiviteit,
    );
    window.addEventListener(
      "storage",
      synchroniseerTabbladen,
    );
    document.addEventListener(
      "visibilitychange",
      controleerBijTerugkeer,
    );

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }

      window.removeEventListener(
        "pointerdown",
        registreerActiviteit,
      );
      window.removeEventListener(
        "keydown",
        registreerActiviteit,
      );
      window.removeEventListener(
        "scroll",
        registreerActiviteit,
      );
      window.removeEventListener(
        "touchstart",
        registreerActiviteit,
      );
      window.removeEventListener(
        "focus",
        registreerActiviteit,
      );
      window.removeEventListener(
        "storage",
        synchroniseerTabbladen,
      );
      document.removeEventListener(
        "visibilitychange",
        controleerBijTerugkeer,
      );
    };
  }, [pathname]);

  return null;
}

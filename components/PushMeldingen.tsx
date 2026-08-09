"use client";

import {
  useEffect,
  useState,
} from "react";

type PushMeldingenProps = {
  publiekeSleutel: string;
  toegelaten: boolean;
};

type Toestand =
  | "LADEN"
  | "NIET_ONDERSTEUND"
  | "UIT"
  | "AAN"
  | "GEBLOKKEERD";

function base64NaarUint8Array(
  waarde: string,
) {
  const opvulling =
    "=".repeat(
      (4 - (waarde.length % 4)) %
        4,
    );

  const base64 =
    (waarde + opvulling)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const binair =
    window.atob(base64);

  return Uint8Array.from(
    binair,
    (teken) =>
      teken.charCodeAt(0),
  );
}

async function haalRegistratieOp() {
  await navigator.serviceWorker.register(
    "/sw.js",
    {
      scope: "/",
    },
  );

  return navigator.serviceWorker.ready;
}

async function leesFoutmelding(
  antwoord: Response,
) {
  try {
    const gegevens =
      (await antwoord.json()) as {
        fout?: unknown;
      };

    if (
      typeof gegevens.fout ===
      "string"
    ) {
      return gegevens.fout;
    }
  } catch {
    // Gebruik de standaardmelding.
  }

  return "Er is een onverwachte fout opgetreden.";
}

export function PushMeldingen({
  publiekeSleutel,
  toegelaten,
}: PushMeldingenProps) {
  const [
    toestand,
    setToestand,
  ] = useState<Toestand>("LADEN");

  const [
    bezig,
    setBezig,
  ] = useState(false);

  const [
    melding,
    setMelding,
  ] = useState("");

  useEffect(() => {
    let geannuleerd = false;

    async function controleer() {
      if (
        !toegelaten ||
        !publiekeSleutel ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!geannuleerd) {
          setToestand(
            "NIET_ONDERSTEUND",
          );
        }

        return;
      }

      if (
        Notification.permission ===
        "denied"
      ) {
        if (!geannuleerd) {
          setToestand(
            "GEBLOKKEERD",
          );
        }

        return;
      }

      try {
        const registratie =
          await haalRegistratieOp();

        const abonnement =
          await registratie
            .pushManager
            .getSubscription();

        if (!geannuleerd) {
          setToestand(
            abonnement
              ? "AAN"
              : "UIT",
          );
        }
      } catch {
        if (!geannuleerd) {
          setToestand(
            "NIET_ONDERSTEUND",
          );
        }
      }
    }

    void controleer();

    return () => {
      geannuleerd = true;
    };
  }, [
    publiekeSleutel,
    toegelaten,
  ]);

  async function inschakelen() {
    setBezig(true);
    setMelding("");

    try {
      const toestemming =
        await Notification
          .requestPermission();

      if (
        toestemming !== "granted"
      ) {
        setToestand(
          toestemming === "denied"
            ? "GEBLOKKEERD"
            : "UIT",
        );

        setMelding(
          "Je hebt geen toestemming voor meldingen gegeven.",
        );

        return;
      }

      const registratie =
        await haalRegistratieOp();

      let abonnement =
        await registratie
          .pushManager
          .getSubscription();

      if (!abonnement) {
        abonnement =
          await registratie
            .pushManager
            .subscribe({
              userVisibleOnly: true,
              applicationServerKey:
                base64NaarUint8Array(
                  publiekeSleutel,
                ),
            });
      }

      const antwoord =
        await fetch(
          "/api/push/abonnement",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              abonnement.toJSON(),
            ),
          },
        );

      if (!antwoord.ok) {
        throw new Error(
          await leesFoutmelding(
            antwoord,
          ),
        );
      }

      setToestand("AAN");
      setMelding(
        "Pushmeldingen zijn ingeschakeld op dit toestel.",
      );
    } catch (fout) {
      setMelding(
        fout instanceof Error
          ? fout.message
          : "Pushmeldingen konden niet worden ingeschakeld.",
      );
    } finally {
      setBezig(false);
    }
  }

  async function uitschakelen() {
    setBezig(true);
    setMelding("");

    try {
      const registratie =
        await haalRegistratieOp();

      const abonnement =
        await registratie
          .pushManager
          .getSubscription();

      if (abonnement) {
        const antwoord =
          await fetch(
            "/api/push/abonnement",
            {
              method: "DELETE",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                endpoint:
                  abonnement.endpoint,
              }),
            },
          );

        if (!antwoord.ok) {
          throw new Error(
            await leesFoutmelding(
              antwoord,
            ),
          );
        }

        await abonnement.unsubscribe();
      }

      setToestand("UIT");
      setMelding(
        "Pushmeldingen zijn uitgeschakeld op dit toestel.",
      );
    } catch (fout) {
      setMelding(
        fout instanceof Error
          ? fout.message
          : "Pushmeldingen konden niet worden uitgeschakeld.",
      );
    } finally {
      setBezig(false);
    }
  }

  async function verstuurTest() {
    setBezig(true);
    setMelding("");

    try {
      const registratie =
        await haalRegistratieOp();

      const abonnement =
        await registratie
          .pushManager
          .getSubscription();

      if (!abonnement) {
        setToestand("UIT");
        throw new Error(
          "Schakel pushmeldingen eerst opnieuw in.",
        );
      }

      const antwoord =
        await fetch(
          "/api/push/test",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              endpoint:
                abonnement.endpoint,
            }),
          },
        );

      if (!antwoord.ok) {
        throw new Error(
          await leesFoutmelding(
            antwoord,
          ),
        );
      }

      setMelding(
        "De testmelding werd verstuurd.",
      );
    } catch (fout) {
      setMelding(
        fout instanceof Error
          ? fout.message
          : "De testmelding kon niet worden verstuurd.",
      );
    } finally {
      setBezig(false);
    }
  }

  if (!toegelaten) {
    return (
      <p className="text-sm leading-6 text-slate-600">
        Pushmeldingen voor rode laattijdige
        plaatsbezoeken zijn alleen beschikbaar
        voor beheerders en auditeurs.
      </p>
    );
  }

  if (!publiekeSleutel) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Web Push is niet geconfigureerd.
      </p>
    );
  }

  if (
    toestand === "NIET_ONDERSTEUND"
  ) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        Pushmeldingen worden in deze browser
        of in deze omgeving niet ondersteund.
        Op iPhone moet je de webapp eerst via
        Safari aan het beginscherm toevoegen.
      </p>
    );
  }

  if (
    toestand === "GEBLOKKEERD"
  ) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
        Meldingen zijn in de browserinstellingen
        geblokkeerd. Geef deze website opnieuw
        toestemming en herlaad daarna de pagina.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          toestand === "AAN"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
      >
        {toestand === "LADEN"
          ? "Status controleren..."
          : toestand === "AAN"
            ? "Pushmeldingen zijn ingeschakeld op dit toestel."
            : "Pushmeldingen zijn uitgeschakeld op dit toestel."}
      </div>

      {melding ? (
        <p
          role="status"
          className="text-sm leading-6 text-slate-700"
        >
          {melding}
        </p>
      ) : null}

      <p className="text-sm leading-6 text-slate-600">
        Je krijgt alleen meldingen die voor jouw
        rol zijn toegestaan. Je kunt meldingen
        afzonderlijk per computer, telefoon of
        browser aan- en uitzetten.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        {toestand !== "AAN" ? (
          <button
            type="button"
            disabled={
              bezig ||
              toestand === "LADEN"
            }
            onClick={inschakelen}
            className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bezig
              ? "Inschakelen..."
              : "Pushmeldingen inschakelen"}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={bezig}
              onClick={verstuurTest}
              className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bezig
                ? "Bezig..."
                : "Testmelding versturen"}
            </button>

            <button
              type="button"
              disabled={bezig}
              onClick={uitschakelen}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Pushmeldingen uitschakelen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

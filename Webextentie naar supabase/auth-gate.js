"use strict";

(() => {
  const authBasis = (
    typeof RUNTIME_API_URL === "string" &&
    RUNTIME_API_URL
      ? RUNTIME_API_URL
      : "https://asbestcrm.be"
  ).replace(/\/+$/, "");

  const gate =
    document.getElementById(
      "webextensie-auth-gate",
    );

  const titel =
    document.getElementById(
      "webextensie-auth-titel",
    );

  const bericht =
    document.getElementById(
      "webextensie-auth-bericht",
    );

  const loginKnop =
    document.getElementById(
      "webextensie-auth-inloggen",
    );

  const opnieuwKnop =
    document.getElementById(
      "webextensie-auth-opnieuw",
    );

  const spinner =
    document.getElementById(
      "webextensie-auth-spinner",
    );

  if (
    !gate ||
    !titel ||
    !bericht ||
    !loginKnop ||
    !opnieuwKnop ||
    !spinner
  ) {
    console.error(
      "Het beveiligde inlogscherm is niet volledig beschikbaar.",
    );
    return;
  }

  let controleActief = false;
  let toegangVerleend = false;

  function toonBezig() {
    titel.textContent =
      "Aanmelding controleren";

    bericht.textContent =
      "Je beveiligde Asbest CRM-sessie wordt gecontroleerd.";

    spinner.hidden = false;
    loginKnop.hidden = true;
    opnieuwKnop.hidden = true;
    opnieuwKnop.disabled = true;
  }

  function toonInloggen(tekst) {
    titel.textContent =
      "Inloggen vereist";

    bericht.textContent =
      tekst ||
      "Log in met je beheerdersaccount van Asbest CRM.";

    spinner.hidden = true;
    loginKnop.hidden = false;
    opnieuwKnop.hidden = false;
    opnieuwKnop.disabled = false;
  }

  function toonGeenToegang(tekst) {
    titel.textContent =
      "Geen toegang";

    bericht.textContent =
      tekst ||
      "De webextensie is alleen beschikbaar voor beheerders.";

    spinner.hidden = true;
    loginKnop.hidden = true;
    opnieuwKnop.hidden = false;
    opnieuwKnop.disabled = false;
  }

  function verleenToegang() {
    toegangVerleend = true;

    document.body.classList.add(
      "webextensie-toegang",
    );

    document.body.classList.remove(
      "webextensie-vergrendeld",
    );

    gate.hidden = true;
    gate.setAttribute(
      "aria-hidden",
      "true",
    );
  }

  function vergrendel() {
    toegangVerleend = false;

    document.body.classList.remove(
      "webextensie-toegang",
    );

    document.body.classList.add(
      "webextensie-vergrendeld",
    );

    gate.hidden = false;
    gate.setAttribute(
      "aria-hidden",
      "false",
    );
  }

  async function controleerSessie() {
    if (controleActief) {
      return;
    }

    controleActief = true;
    vergrendel();
    toonBezig();

    try {
      const antwoord = await fetch(
        `${authBasis}/api/webextensie/sessie`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "X-Webextensie-Id":
              chrome.runtime.id,
          },
        },
      );

      let gegevens = null;

      try {
        gegevens = await antwoord.json();
      } catch {
        gegevens = null;
      }

      if (
        antwoord.ok &&
        gegevens?.ingelogd === true &&
        gegevens?.beheerder === true
      ) {
        verleenToegang();
        return;
      }

      if (
        antwoord.status === 403 &&
        gegevens?.ingelogd === true
      ) {
        toonGeenToegang(
          gegevens?.fout,
        );
        return;
      }

      toonInloggen(
        gegevens?.fout ||
        "Log in met je beheerdersaccount van Asbest CRM.",
      );
    } catch {
      toonInloggen(
        "Asbest CRM kon niet worden bereikt. Controleer je verbinding en probeer opnieuw.",
      );
    } finally {
      controleActief = false;
    }
  }

  loginKnop.addEventListener(
    "click",
    async () => {
      const loginUrl =
        `${authBasis}/inloggen`;

      try {
        await chrome.tabs.create({
          url: loginUrl,
          active: true,
        });

        bericht.textContent =
          "Log in bij Asbest CRM en klik daarna op ‘Opnieuw controleren’.";
      } catch {
        window.open(
          loginUrl,
          "_blank",
          "noopener,noreferrer",
        );
      }
    },
  );

  opnieuwKnop.addEventListener(
    "click",
    controleerSessie,
  );

  window.addEventListener(
    "focus",
    () => {
      if (!toegangVerleend) {
        controleerSessie();
      }
    },
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState === "visible" &&
        !toegangVerleend
      ) {
        controleerSessie();
      }
    },
  );

  vergrendel();
  controleerSessie();
})();

"use strict";

(() => {
  const MAXIMAAL_AANTAL = 500;
  const UUID_PATROON =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const GELDIGE_STATUSSEN = new Set([
    "GEARCHIVEERD_ATTEST",
    "IN_OPMAAK",
    "ACTUEEL_ATTEST",
  ]);

  const terreinRuntimeBasis = (
    typeof RUNTIME_API_URL === "string" &&
    RUNTIME_API_URL
      ? RUNTIME_API_URL
      : "https://asbestcrm.be"
  ).replace(/\/+$/, "");

  const formulier =
    document.getElementById("terreincontrole-form");
  const invoer =
    document.getElementById("terrein-attest-id-invoer");
  const ophalenKnop =
    document.getElementById("terrein-openstaande-ophalen");
  const verwerkenKnop =
    document.getElementById("terrein-verwerken");
  const stoppenKnop =
    document.getElementById("terrein-verwerking-stoppen");
  const invoerWissenKnop =
    document.getElementById("terrein-invoer-wissen");
  const statusElement =
    document.getElementById("terrein-verwerking-status");
  const voortgangElement =
    document.getElementById("terrein-voortgang");
  const voortgangTekst =
    document.getElementById("terrein-voortgang-tekst");
  const voortgangBalk =
    document.getElementById("terrein-voortgang-balk");
  const voortgangSpoor =
    document.getElementById("terrein-voortgang-spoor");
  const resultatenLichaam =
    document.getElementById("terrein-resultaten-lichaam");
  const opslagStatus =
    document.getElementById(
      "terrein-opslag-resultaat-status",
    );
  const opslaanKnop =
    document.getElementById("terrein-resultaten-opslaan");
  const exporterenKnop =
    document.getElementById(
      "terrein-resultaten-exporteren",
    );
  const resultatenWissenKnop =
    document.getElementById(
      "terrein-resultaten-wissen",
    );
  const tellerTotaal =
    document.getElementById("terrein-teller-totaal");
  const tellerGeslaagd =
    document.getElementById("terrein-teller-geslaagd");
  const tellerMislukt =
    document.getElementById("terrein-teller-mislukt");

  if (
    !formulier ||
    !invoer ||
    !ophalenKnop ||
    !verwerkenKnop ||
    !stoppenKnop ||
    !invoerWissenKnop ||
    !statusElement ||
    !voortgangElement ||
    !voortgangTekst ||
    !voortgangBalk ||
    !voortgangSpoor ||
    !resultatenLichaam ||
    !opslagStatus ||
    !opslaanKnop ||
    !exporterenKnop ||
    !resultatenWissenKnop ||
    !tellerTotaal ||
    !tellerGeslaagd ||
    !tellerMislukt
  ) {
    console.error(
      "De terreincontrole-interface is niet volledig beschikbaar.",
    );
    return;
  }

  let resultaten = [];
  let verwerkingGestopt = false;
  let verwerkingActief = false;
  let opslagActief = false;

  function leesAttestIds(waarde) {
    return [
      ...new Set(
        String(waarde || "")
          .split(/[\n,;]+/)
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  function wacht(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  function toonStatus(bericht, soort = "") {
    statusElement.textContent = bericht;
    statusElement.className =
      `formulier-status status-blok ${soort}`;
  }

  function toonOpslagStatus(bericht, soort = "") {
    opslagStatus.textContent = bericht;
    opslagStatus.className =
      `opslag-resultaat-status status-blok ${soort}`;
    opslagStatus.hidden = false;
  }

  function wisOpslagStatus() {
    opslagStatus.textContent = "";
    opslagStatus.className =
      "opslag-resultaat-status status-blok";
    opslagStatus.hidden = true;
  }

  function werkVoortgangBij(verwerkt, totaal) {
    const percentage =
      totaal > 0
        ? Math.round((verwerkt / totaal) * 100)
        : 0;

    voortgangTekst.textContent =
      `${verwerkt} van ${totaal}`;
    voortgangBalk.style.width =
      `${percentage}%`;
    voortgangSpoor.setAttribute(
      "aria-valuenow",
      String(percentage),
    );
  }

  function statusInfo(resultaat) {
    if (!resultaat.geslaagd) {
      return {
        label: "Fout",
        klasse: "mislukt",
      };
    }

    switch (resultaat.status) {
      case "GEARCHIVEERD_ATTEST":
        return {
          label: "Gearchiveerd attest",
          klasse: "geen",
        };

      case "IN_OPMAAK":
        return {
          label: "In opmaak",
          klasse: "in-opmaak",
        };

      case "ACTUEEL_ATTEST":
        return {
          label: "Actueel attest",
          klasse: "geactualiseerd",
        };

      case null:
        return {
          label: "Geen status",
          klasse: "geen",
        };

      default:
        return {
          label: "Fout",
          klasse: "mislukt",
        };
    }
  }

  function maakAttestIdCel(attestId) {
    const cel = document.createElement("td");
    const houder = document.createElement("div");

    houder.className = "id-met-link";

    const tekst = document.createElement("span");
    tekst.textContent = attestId || "—";
    houder.append(tekst);

    if (
      typeof attestId === "string" &&
      UUID_PATROON.test(attestId)
    ) {
      const link = document.createElement("a");

      link.className = "id-link-knop";
      link.href =
        "https://asbestinventaris.ovam.be/" +
        "asbestinventaris/" +
        encodeURIComponent(attestId);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open";
      link.setAttribute(
        "aria-label",
        `Open attest ${attestId}`,
      );

      houder.append(link);
    }

    cel.append(houder);
    return cel;
  }

  function maakStatusCel(resultaat) {
    const cel = document.createElement("td");
    const badge = document.createElement("span");
    const informatie = statusInfo(resultaat);

    badge.className =
      `status-badge ${informatie.klasse}`;
    badge.textContent = informatie.label;

    cel.append(badge);
    return cel;
  }

  function toonResultaten() {
    resultatenLichaam.replaceChildren();

    if (resultaten.length === 0) {
      const rij = document.createElement("tr");
      const cel = document.createElement("td");

      rij.className = "lege-rij";
      cel.colSpan = 3;
      cel.textContent =
        "Nog geen resultaten beschikbaar.";

      rij.append(cel);
      resultatenLichaam.append(rij);
    } else {
      for (const resultaat of resultaten) {
        const rij = document.createElement("tr");
        const foutCel = document.createElement("td");

        foutCel.textContent =
          resultaat.fout || "—";

        rij.append(
          maakAttestIdCel(resultaat.attestId),
          maakStatusCel(resultaat),
          foutCel,
        );

        resultatenLichaam.append(rij);
      }
    }

    const geslaagd = resultaten.filter(
      (resultaat) => resultaat.geslaagd === true,
    ).length;

    tellerTotaal.textContent =
      String(resultaten.length);
    tellerGeslaagd.textContent =
      String(geslaagd);
    tellerMislukt.textContent =
      String(resultaten.length - geslaagd);

    const heeftResultaten =
      resultaten.length > 0;

    const heeftOpslaanbareResultaten =
      resultaten.some(
        (resultaat) =>
          resultaat.geslaagd === true &&
          (
            resultaat.status === null ||
            GELDIGE_STATUSSEN.has(
              resultaat.status,
            )
          ),
      );

    opslaanKnop.disabled =
      !heeftOpslaanbareResultaten ||
      verwerkingActief ||
      opslagActief;

    exporterenKnop.disabled =
      !heeftResultaten ||
      verwerkingActief ||
      opslagActief;

    resultatenWissenKnop.disabled =
      !heeftResultaten ||
      verwerkingActief ||
      opslagActief;
  }

  function verwerkAttestIdV2(attestId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "FETCH_TERREINCONTROLE_V2",
          ids: [attestId],
        },
        (antwoord) => {
          if (chrome.runtime.lastError) {
            resolve({
              attestId,
              status: null,
              geslaagd: false,
              fout:
                chrome.runtime.lastError.message ||
                "Communicatie met de achtergrondservice mislukt.",
            });
            return;
          }

          if (
            !antwoord ||
            antwoord.ok !== true ||
            antwoord.apiVersie !== 2 ||
            !Array.isArray(antwoord.data) ||
            antwoord.data.length !== 1
          ) {
            resolve({
              attestId,
              status: null,
              geslaagd: false,
              fout:
                antwoord?.error ||
                "Geen geldig Terreincontrole V2-antwoord ontvangen.",
            });
            return;
          }

          const item = antwoord.data[0];

          if (
            !item ||
            typeof item !== "object" ||
            item.geslaagd !== true
          ) {
            resolve({
              attestId,
              status: null,
              geslaagd: false,
              fout:
                item?.fout ||
                "De OVAM-opvraging is mislukt.",
            });
            return;
          }

          if (
            item.status !== null &&
            !GELDIGE_STATUSSEN.has(item.status)
          ) {
            resolve({
              attestId,
              status: null,
              geslaagd: false,
              fout:
                "OVAM gaf een onbekende terreincontrolestatus terug.",
            });
            return;
          }

          resolve({
            attestId,
            status: item.status,
            geslaagd: true,
            fout: "",
          });
        },
      );
    });
  }

  ophalenKnop.addEventListener("click", async () => {
    ophalenKnop.disabled = true;
    verwerkenKnop.disabled = true;
    invoerWissenKnop.disabled = true;

    toonStatus(
      "Openstaande terreincontroles worden opgehaald.",
    );

    try {
      const antwoord = await fetch(
        `${terreinRuntimeBasis}/api/webextensie/terreincontroles-openstaand`,
        {
          method: "GET",
          credentials: "include",
          mode: "cors",
          cache: "no-store",
          redirect: "error",
          headers: {
            "X-Webextensie-Id":
              chrome.runtime.id,
          },
        },
      );

      const inhoud =
        await antwoord.json().catch(() => null);

      if (!antwoord.ok) {
        throw new Error(
          inhoud?.fout ||
          `De runtime gaf status ${antwoord.status}.`,
        );
      }

      const attestIds = Array.isArray(
        inhoud?.attestIds,
      )
        ? [
            ...new Set(
              inhoud.attestIds
                .filter(
                  (attestId) =>
                    typeof attestId === "string" &&
                    UUID_PATROON.test(attestId),
                )
                .map((attestId) =>
                  attestId.toLowerCase(),
                ),
            ),
          ].slice(0, MAXIMAAL_AANTAL)
        : [];

      invoer.value = attestIds.join("\n");

      toonStatus(
        attestIds.length === 0
          ? "Geen openstaande terreincontroles gevonden."
          : `${attestIds.length} openstaande attest-ID’s opgehaald.`,
        "succes",
      );

      invoer.focus();
    } catch (fout) {
      const melding =
        fout instanceof Error
          ? fout.message
          : "Openstaande terreincontroles ophalen mislukt.";

      toonStatus(
        `Ophalen mislukt: ${melding}`,
        "fout",
      );

      console.error(
        "Openstaande terreincontroles ophalen mislukt.",
        fout instanceof Error
          ? fout.name
          : "Onbekende fout",
      );
    } finally {
      ophalenKnop.disabled = false;
      verwerkenKnop.disabled = false;
      invoerWissenKnop.disabled = false;
    }
  });

  formulier.addEventListener("submit", async (gebeurtenis) => {
    gebeurtenis.preventDefault();

    if (verwerkingActief || opslagActief) {
      return;
    }

    const attestIds =
      leesAttestIds(invoer.value);

    if (attestIds.length === 0) {
      toonStatus(
        "Voer minstens één attest-ID in.",
        "fout",
      );
      return;
    }

    if (attestIds.length > MAXIMAAL_AANTAL) {
      toonStatus(
        "Er kunnen maximaal 500 unieke attest-ID’s worden verwerkt.",
        "fout",
      );
      return;
    }

    verwerkingActief = true;
    verwerkingGestopt = false;
    resultaten = [];

    wisOpslagStatus();
    toonResultaten();

    verwerkenKnop.disabled = true;
    ophalenKnop.disabled = true;
    invoerWissenKnop.disabled = true;
    stoppenKnop.disabled = false;

    voortgangElement.hidden = false;
    werkVoortgangBij(0, attestIds.length);

    let verwerkt = 0;

    try {
      for (const attestId of attestIds) {
        if (verwerkingGestopt) {
          break;
        }

        toonStatus(
          `Bezig met attest-ID ${verwerkt + 1} van ${attestIds.length}.`,
        );

        const resultaat =
          await verwerkAttestIdV2(attestId);

        if (verwerkingGestopt) {
          break;
        }

        resultaten.push(resultaat);
        verwerkt += 1;

        werkVoortgangBij(
          verwerkt,
          attestIds.length,
        );
        toonResultaten();

        if (
          verwerkt < attestIds.length &&
          !verwerkingGestopt
        ) {
          await wacht(1000);
        }
      }

      const mislukt = resultaten.filter(
        (resultaat) =>
          resultaat.geslaagd !== true,
      ).length;

      if (verwerkingGestopt) {
        toonStatus(
          `Verwerking gestopt na ${verwerkt} van ${attestIds.length} attest-ID’s.`,
          "fout",
        );
      } else if (mislukt === 0) {
        toonStatus(
          `Alle ${attestIds.length} attest-ID’s zijn verwerkt.`,
          "succes",
        );
      } else {
        toonStatus(
          `${attestIds.length} attest-ID’s verwerkt; ${mislukt} mislukt.`,
          "fout",
        );
      }
    } finally {
      verwerkingActief = false;
      verwerkenKnop.disabled = false;
      ophalenKnop.disabled = false;
      invoerWissenKnop.disabled = false;
      stoppenKnop.disabled = true;
      toonResultaten();
    }
  });

  stoppenKnop.addEventListener("click", () => {
    verwerkingGestopt = true;
    stoppenKnop.disabled = true;

    toonStatus(
      "De verwerking wordt na de lopende aanvraag gestopt.",
    );
  });

  invoerWissenKnop.addEventListener("click", () => {
    invoer.value = "";
    invoer.focus();
    toonStatus("De invoer is gewist.");
  });

  resultatenWissenKnop.addEventListener("click", () => {
    resultaten = [];
    voortgangElement.hidden = true;
    wisOpslagStatus();
    toonResultaten();
    toonStatus("De resultaten zijn gewist.");
  });

  opslaanKnop.addEventListener("click", async () => {
    if (opslagActief || verwerkingActief) {
      return;
    }

    const perAttestId = new Map();
    let lokaalOvergeslagen = 0;

    for (const resultaat of resultaten) {
      if (
        resultaat.geslaagd !== true ||
        typeof resultaat.attestId !== "string" ||
        !UUID_PATROON.test(resultaat.attestId) ||
        (
          resultaat.status !== null &&
          !GELDIGE_STATUSSEN.has(
            resultaat.status,
          )
        )
      ) {
        lokaalOvergeslagen += 1;
        continue;
      }

      perAttestId.set(
        resultaat.attestId.toLowerCase(),
        {
          attestId:
            resultaat.attestId.toLowerCase(),
          status: resultaat.status,
          geslaagd: true,
        },
      );
    }

    const opTeSlaanResultaten = [
      ...perAttestId.values(),
    ];

    if (opTeSlaanResultaten.length === 0) {
      toonStatus(
        "Er zijn geen geldige terreincontrolestatussen om op te slaan.",
        "fout",
      );
      return;
    }

    opslagActief = true;
    opslaanKnop.textContent =
      "Bezig met opslaan";
    opslaanKnop.setAttribute(
      "aria-busy",
      "true",
    );
    toonResultaten();

    const bezig =
      `Bezig met opslaan van ${opTeSlaanResultaten.length} statussen. Sluit het sidepanel niet.`;

    toonStatus(bezig);
    toonOpslagStatus(bezig);

    try {
      const antwoord = await fetch(
        `${terreinRuntimeBasis}/api/webextensie/terreincontroles-statussen`,
        {
          method: "POST",
          credentials: "include",
          mode: "cors",
          cache: "no-store",
          redirect: "error",
          headers: {
            "X-Webextensie-Id":
              chrome.runtime.id,
            "Content-Type":
              "text/plain;charset=UTF-8",
          },
          body: JSON.stringify({
            resultaten:
              opTeSlaanResultaten,
          }),
        },
      );

      const inhoud =
        await antwoord.json().catch(() => null);

      if (!antwoord.ok) {
        throw new Error(
          inhoud?.fout ||
          `De runtime gaf status ${antwoord.status}.`,
        );
      }

      const bijgewerkt =
        Number(inhoud?.bijgewerkt) || 0;
      const ongewijzigd =
        Number(inhoud?.ongewijzigd) || 0;
      const nietGevonden =
        Number(inhoud?.nietGevonden) || 0;
      const conflict =
        Number(inhoud?.conflict) || 0;
      const beschermd =
        Number(inhoud?.beschermd) || 0;
      const mislukt =
        Number(inhoud?.mislukt) || 0;
      const overgeslagen =
        lokaalOvergeslagen +
        (Number(inhoud?.overgeslagenFout) || 0) +
        (Number(inhoud?.ongeldig) || 0);

      const aandachtspunten =
        nietGevonden +
        conflict +
        beschermd +
        mislukt +
        overgeslagen;

      const samenvatting =
        `${aandachtspunten === 0
          ? "Opslaan geslaagd"
          : "Opslaan voltooid met aandachtspunten"}: ` +
        `${bijgewerkt} bijgewerkt, ` +
        `${ongewijzigd} al correct, ` +
        `${nietGevonden} niet gevonden, ` +
        `${conflict} gelijktijdig gewijzigd, ` +
        `${beschermd} beschermd, ` +
        `${overgeslagen} foutresultaten overgeslagen, ` +
        `${mislukt} mislukt.`;

      toonStatus(
        samenvatting,
        aandachtspunten === 0
          ? "succes"
          : "fout",
      );
      toonOpslagStatus(
        samenvatting,
        aandachtspunten === 0
          ? "succes"
          : "fout",
      );
    } catch (fout) {
      const melding =
        fout instanceof Error
          ? `Opslaan mislukt: ${fout.message}`
          : "De statussen konden niet worden opgeslagen.";

      toonStatus(melding, "fout");
      toonOpslagStatus(melding, "fout");

      console.error(
        "Terreincontrolestatussen opslaan mislukt.",
        fout instanceof Error
          ? fout.name
          : "Onbekende fout",
      );
    } finally {
      opslagActief = false;
      opslaanKnop.textContent =
        "Statussen opslaan";
      opslaanKnop.removeAttribute(
        "aria-busy",
      );
      toonResultaten();
    }
  });

  function csvWaarde(waarde) {
    const tekst =
      waarde === null
        ? "NULL"
        : String(waarde ?? "");

    return `"${tekst.replaceAll('"', '""')}"`;
  }

  exporterenKnop.addEventListener("click", () => {
    if (resultaten.length === 0) {
      return;
    }

    const regels = [
      [
        "Attest-ID",
        "OVAM-status",
        "Geslaagd",
        "Foutmelding",
      ],
      ...resultaten.map((resultaat) => [
        resultaat.attestId,
        resultaat.geslaagd
          ? resultaat.status
          : "",
        resultaat.geslaagd
          ? "Ja"
          : "Nee",
        resultaat.fout,
      ]),
    ];

    const csv =
      "\uFEFF" +
      regels
        .map((regel) =>
          regel.map(csvWaarde).join(";"),
        )
        .join("\r\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);
    const nu = new Date();
    const datum =
      nowDatum(nu);
    const tijd = [
      String(nu.getHours()).padStart(2, "0"),
      String(nu.getMinutes()).padStart(2, "0"),
      String(nu.getSeconds()).padStart(2, "0"),
    ].join("-");

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `Terreincontrole_V2_${datum}_${tijd}.csv`;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      1000,
    );
  });

  function nowDatum(datum) {
    return [
      datum.getFullYear(),
      String(datum.getMonth() + 1).padStart(2, "0"),
      String(datum.getDate()).padStart(2, "0"),
    ].join("-");
  }

  toonResultaten();
})();

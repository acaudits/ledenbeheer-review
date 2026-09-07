"use strict";

const tabNamen = {
  deskcontrole: "Deskcontrole opvolging",
  terreincontrole: "Inplannen terreincontrole",

};

const tabKnoppen = [...document.querySelectorAll("[data-tab]")];
const panelen = [...document.querySelectorAll("[data-paneel]")];
const paginaTitel = document.getElementById("pagina-titel");

function geldigeTab(waarde) {
  return Object.prototype.hasOwnProperty.call(tabNamen, waarde);
}

function activeerTab(tab, wijzigHash = true) {
  const geldigeWaarde = geldigeTab(tab) ? tab : "deskcontrole";

  for (const knop of tabKnoppen) {
    const actief = knop.dataset.tab === geldigeWaarde;
    knop.classList.toggle("actief", actief);

    if (knop.getAttribute("role") === "tab") {
      knop.setAttribute("aria-selected", String(actief));
    }
  }

  for (const paneel of panelen) {
    const actief = paneel.dataset.paneel === geldigeWaarde;
    paneel.hidden = !actief;
    paneel.classList.toggle("actief", actief);
  }

  paginaTitel.textContent = tabNamen[geldigeWaarde];
  document.title = `${tabNamen[geldigeWaarde]} — Asbest CRM`;

  if (wijzigHash) {
    history.replaceState(null, "", `#${geldigeWaarde}`);
  }
}

for (const knop of tabKnoppen) {
  knop.addEventListener("click", () => activeerTab(knop.dataset.tab));
}

window.addEventListener("hashchange", () => {
  activeerTab(location.hash.slice(1), false);
});

activeerTab(location.hash.slice(1), false);

const runtimeBasis = (
  typeof RUNTIME_API_URL === "string" && RUNTIME_API_URL
    ? RUNTIME_API_URL
    : "https://asbestcrm.be"
).replace(/\/+$/, "");



function stelOptioneleLinkHrefIn(id, href) {
  const link = document.getElementById(id);

  if (link instanceof HTMLAnchorElement) {
    link.href = href;
  }
}

stelOptioneleLinkHrefIn(
  "link-terreincontrole",
  `${runtimeBasis}/terreincontroles-inplannen`,
);

const deskcontroleFormulier = document.getElementById("deskcontrole-form");
const attestIdInvoer = document.getElementById("attest-id-invoer");
const openstaandeAttestIdsKnop = document.getElementById(
  "openstaande-attest-ids-ophalen",
);
const verwerkenKnop = document.getElementById("verwerken");
const stoppenKnop = document.getElementById("verwerking-stoppen");
const invoerWissenKnop = document.getElementById("invoer-wissen");
const statusElement = document.getElementById("verwerking-status");
const voortgangElement = document.getElementById("voortgang");
const voortgangTekst = document.getElementById("voortgang-tekst");
const voortgangBalk = document.getElementById("voortgang-balk");
const voortgangSpoor = document.querySelector(".voortgang-spoor");
const resultatenLichaam = document.getElementById("resultaten-lichaam");
const opslagResultaatStatus = document.getElementById(
  "opslag-resultaat-status",
);
const resultatenOpslaanKnop = document.getElementById("resultaten-opslaan");
const resultatenExporterenKnop = document.getElementById("resultaten-exporteren");
const resultatenWissenKnop = document.getElementById("resultaten-wissen");
const tellerTotaal = document.getElementById("teller-totaal");
const tellerGeslaagd = document.getElementById("teller-geslaagd");
const tellerMislukt = document.getElementById("teller-mislukt");

let resultaten = [];
let verwerkingGestopt = false;
let statussenWordenOpgeslagen = false;

function leesAttestIds(invoer) {
  return [
    ...new Set(
      String(invoer)
        .split(/[\n,;]+/)
        .map((waarde) => waarde.trim())
        .filter(Boolean),
    ),
  ];
}

function toonDeskcontroleStatus(bericht, soort = "") {
  statusElement.textContent = bericht;
  statusElement.className = `formulier-status status-blok ${soort}`;
}

function toonOpslagResultaatStatus(
  bericht,
  soort = "",
) {
  opslagResultaatStatus.textContent =
    bericht;
  opslagResultaatStatus.className =
    `opslag-resultaat-status status-blok ${soort}`;
  opslagResultaatStatus.hidden = false;
}

function wisOpslagResultaatStatus() {
  opslagResultaatStatus.textContent = "";
  opslagResultaatStatus.className =
    "opslag-resultaat-status status-blok";
  opslagResultaatStatus.hidden = true;
}

function werkVoortgangBij(verwerkt, totaal) {
  const percentage =
    totaal > 0 ? Math.round((verwerkt / totaal) * 100) : 0;

  voortgangTekst.textContent = `${verwerkt} van ${totaal}`;
  voortgangBalk.style.width = `${percentage}%`;
  voortgangSpoor.setAttribute("aria-valuenow", String(percentage));
}

function maakTekstCel(waarde) {
  const cel = document.createElement("td");

  cel.textContent =
    waarde === null || waarde === undefined || waarde === ""
      ? "—"
      : String(waarde);

  return cel;
}

const uuidPatroon =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function maakIdCel(
  waarde,
  soort,
) {
  const cel =
    document.createElement("td");

  const tekst =
    waarde === null ||
    waarde === undefined
      ? ""
      : String(waarde).trim();

  if (!tekst) {
    cel.textContent = "—";
    return cel;
  }

  const inhoud =
    document.createElement("div");
  inhoud.className =
    "id-cel-inhoud";

  const tekstElement =
    document.createElement("span");
  tekstElement.className =
    "id-cel-waarde";
  tekstElement.textContent =
    tekst;

  inhoud.append(
    tekstElement,
  );

  /*
   * Maak uitsluitend een link voor een waarde met een geldige
   * UUID-vorm. De ID wordt aanvullend URL-gecodeerd.
   */
  if (uuidPatroon.test(tekst)) {
    const link =
      document.createElement("a");

    link.className =
      "id-link-knop";
    link.href =
      `https://asbestinventaris.ovam.be/asbestinventaris/${encodeURIComponent(tekst)}`;
    link.target =
      "_blank";
    link.rel =
      "noopener noreferrer";
    link.textContent =
      "Open";
    link.title =
      `${soort} openen in de OVAM-asbestinventaris`;
    link.setAttribute(
      "aria-label",
      `${soort} ${tekst} openen in de OVAM-asbestinventaris`,
    );

    inhoud.append(link);
  }

  cel.append(inhoud);

  return cel;
}

function statusInfo(status) {
  switch (status) {
    case "OK_GEA":
      return { label: "Geactualiseerd", klasse: "geactualiseerd" };
    case "OK_INOP":
      return { label: "In opmaak", klasse: "in-opmaak" };
    case "GEEN":
      return { label: "Geen", klasse: "geen" };
    default:
      return { label: "Fout", klasse: "mislukt" };
  }
}

function statusNaarTekst(status) {
  switch (status) {
    case "OK_GEA":
      return "Kopie gevonden met AIA-nummer.";
    case "OK_INOP":
      return "Kopie gevonden zonder AIA-nummer.";
    case "GEEN":
      return "Geen kopie gevonden voor dit attest-ID.";
    default:
      return "Onbekende OVAM-status.";
  }
}

function verwerkAttestId(attestId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "FETCH_INVENTARISSEN",
        ids: [attestId],
      },
      (antwoord) => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(
              chrome.runtime.lastError.message ||
                "Communicatie met de achtergrondpagina mislukt.",
            ),
          );
          return;
        }

        if (!antwoord || !antwoord.ok) {
          reject(
            new Error(
              antwoord?.error || "De OVAM-opvraging is mislukt.",
            ),
          );
          return;
        }

        const item =
          Array.isArray(antwoord.data) && antwoord.data.length > 0
            ? antwoord.data[0]
            : null;

        if (!item) {
          reject(
            new Error("De OVAM-runtime gaf geen resultaat terug."),
          );
          return;
        }

        const geslaagd =
          item.status === "OK_GEA" ||
          item.status === "OK_INOP" ||
          item.status === "GEEN";

        resolve({
          attestId: item.inputId ?? attestId,
          copyId: item.id ?? "",
          aiaNummer: item.aiaNummer ?? "",
          copyState: item.copyState ?? "",
          status: item.status,
          geslaagd,
          fout: geslaagd
            ? ""
            : item.error || statusNaarTekst(item.status),
        });
      },
    );
  });
}

function toonResultaten() {
  resultatenLichaam.replaceChildren();

  if (resultaten.length === 0) {
    const rij = document.createElement("tr");
    rij.className = "lege-rij";

    const cel = document.createElement("td");
    cel.colSpan = 5;
    cel.textContent = "Nog geen resultaten beschikbaar.";

    rij.append(cel);
    resultatenLichaam.append(rij);
  } else {
    for (const resultaat of resultaten) {
      const rij = document.createElement("tr");

      rij.append(
        maakIdCel(
          resultaat.attestId,
          "Attest-ID",
        ),
        maakIdCel(
          resultaat.copyId,
          "Copy-ID",
        ),
        maakTekstCel(resultaat.aiaNummer),
        maakTekstCel(resultaat.copyState),
      );

      const statusCel = document.createElement("td");
      const statusBadge = document.createElement("span");

      const status = statusInfo(resultaat.status);

      statusBadge.className = `resultaat-status ${status.klasse}`;
      statusBadge.textContent =
        resultaat.status === "ERROR"
          ? resultaat.fout || "Fout"
          : status.label;

      statusCel.append(statusBadge);
      rij.append(statusCel);

      resultatenLichaam.append(rij);
    }
  }

  const geslaagd = resultaten.filter(
    (resultaat) => resultaat.geslaagd,
  ).length;

  tellerTotaal.textContent = String(resultaten.length);
  tellerGeslaagd.textContent = String(geslaagd);
  tellerMislukt.textContent = String(resultaten.length - geslaagd);

  const heeftResultaten = resultaten.length > 0;

  const heeftOpslaanbareResultaten = resultaten.some(
    (resultaat) =>
      resultaat.status === "OK_GEA" ||
      resultaat.status === "OK_INOP" ||
      resultaat.status === "GEEN",
  );

  resultatenOpslaanKnop.disabled =
    !heeftOpslaanbareResultaten ||
    statussenWordenOpgeslagen;

  resultatenExporterenKnop.disabled =
    !heeftResultaten ||
    statussenWordenOpgeslagen;

  resultatenWissenKnop.disabled =
    !heeftResultaten ||
    statussenWordenOpgeslagen;
}

openstaandeAttestIdsKnop.addEventListener("click", async () => {
  openstaandeAttestIdsKnop.disabled = true;
  verwerkenKnop.disabled = true;
  invoerWissenKnop.disabled = true;

  toonDeskcontroleStatus(
    "Openstaande attest-ID’s worden uit Supabase opgehaald.",
  );

  try {
    const antwoord = await fetch(
      `${runtimeBasis}/api/webextensie/deskcontroles-openstaand`,
      {
        method: "GET",
        credentials: "include",
        mode: "cors",
        cache: "no-store",
        redirect: "error",
        headers: {
          "X-Webextensie-Id": chrome.runtime.id,
        },
      },
    );

    const inhoud = await antwoord.json().catch(() => null);

    if (!antwoord.ok) {
      throw new Error(
        inhoud?.fout ||
          `De runtime gaf status ${antwoord.status}.`,
      );
    }

    const attestIds = Array.isArray(inhoud?.attestIds)
      ? [
          ...new Set(
            inhoud.attestIds
              .filter((waarde) => typeof waarde === "string")
              .map((waarde) => waarde.trim())
              .filter(Boolean),
          ),
        ]
      : [];

    attestIdInvoer.value = attestIds.join("\n");

    if (attestIds.length === 0) {
      toonDeskcontroleStatus(
        "Geen actieve deskcontroles met status GEEN of IN_OPMAAK gevonden.",
      );
      attestIdInvoer.focus();
      return;
    }

    const afgekapt = inhoud?.afgekapt === true;

    toonDeskcontroleStatus(
      afgekapt
        ? `${attestIds.length} attest-ID’s ingevuld. De selectie is beperkt tot maximaal 500 records.`
        : `${attestIds.length} attest-ID’s uit Supabase ingevuld.`,
      "succes",
    );

    attestIdInvoer.focus();
  } catch (fout) {
    console.error(
      "Openstaande attest-ID’s ophalen mislukt.",
      fout,
    );

    toonDeskcontroleStatus(
      fout instanceof Error
        ? `Ophalen mislukt: ${fout.message}`
        : "Openstaande attest-ID’s konden niet worden opgehaald.",
      "fout",
    );
  } finally {
    openstaandeAttestIdsKnop.disabled = false;
    verwerkenKnop.disabled = false;
    invoerWissenKnop.disabled = false;
  }
});

deskcontroleFormulier.addEventListener("submit", async (gebeurtenis) => {
  gebeurtenis.preventDefault();

  wisOpslagResultaatStatus();

  const attestIds = leesAttestIds(attestIdInvoer.value);

  if (attestIds.length === 0) {
    toonDeskcontroleStatus("Voer minstens één attest-ID in.", "fout");
    attestIdInvoer.focus();
    return;
  }

  if (attestIds.length > 500) {
    toonDeskcontroleStatus(
      "Er kunnen maximaal 500 unieke attest-ID’s tegelijk worden verwerkt.",
      "fout",
    );
    return;
  }

  verwerkingGestopt = false;
  verwerkenKnop.disabled = true;
  stoppenKnop.disabled = false;
  invoerWissenKnop.disabled = true;
  voortgangElement.hidden = false;

  werkVoortgangBij(0, attestIds.length);

  toonDeskcontroleStatus(
    `${attestIds.length} attest-ID’s worden verwerkt.`,
  );

  let verwerkt = 0;

  try {
    for (const attestId of attestIds) {
      if (verwerkingGestopt) {
        break;
      }

      toonDeskcontroleStatus(
        `Bezig met attest-ID ${verwerkt + 1} van ${attestIds.length}.`,
      );

      try {
        const resultaat = await verwerkAttestId(attestId);

        if (verwerkingGestopt) {
          break;
        }

        resultaten.push(resultaat);
      } catch (fout) {
        if (verwerkingGestopt) {
          break;
        }

        resultaten.push({
          attestId,
          copyId: "",
          aiaNummer: "",
          copyState: "",
          geslaagd: false,
          fout: fout instanceof Error ? fout.message : "Onbekende fout",
        });
      }

      verwerkt += 1;

      werkVoortgangBij(verwerkt, attestIds.length);
      toonResultaten();
    }

    if (verwerkingGestopt) {
      toonDeskcontroleStatus(
        `Verwerking gestopt na ${verwerkt} van ${attestIds.length} attest-ID’s.`,
        "fout",
      );
    } else {
      const mislukt = resultaten
        .slice(-attestIds.length)
        .filter((resultaat) => !resultaat.geslaagd).length;

      toonDeskcontroleStatus(
        mislukt === 0
          ? `Alle ${attestIds.length} attest-ID’s zijn verwerkt.`
          : `${attestIds.length} attest-ID’s verwerkt; ${mislukt} mislukt.`,
        mislukt === 0 ? "succes" : "fout",
      );
    }
  } finally {
    verwerkenKnop.disabled = false;
    stoppenKnop.disabled = true;
    invoerWissenKnop.disabled = false;
  }
});

stoppenKnop.addEventListener("click", () => {
  verwerkingGestopt = true;
  stoppenKnop.disabled = true;

  toonDeskcontroleStatus(
    "De verwerking wordt gestopt; de lopende opvraging wordt niet meer toegevoegd.",
  );
});

invoerWissenKnop.addEventListener("click", () => {
  attestIdInvoer.value = "";
  attestIdInvoer.focus();
  toonDeskcontroleStatus("De invoer is gewist.");
});

resultatenWissenKnop.addEventListener("click", () => {
  resultaten = [];
  toonResultaten();
  voortgangElement.hidden = true;
  wisOpslagResultaatStatus();
  toonDeskcontroleStatus("De resultaten zijn gewist.");
});

function csvWaarde(waarde) {
  const tekst = String(waarde ?? "");

  return `"${tekst.replaceAll('"', '""')}"`;
}

resultatenOpslaanKnop.addEventListener("click", async () => {
  if (statussenWordenOpgeslagen) {
    return;
  }

  const toegestaneStatussen = new Set([
    "OK_GEA",
    "OK_INOP",
    "GEEN",
  ]);

  const perAttestId = new Map();
  let foutresultatenOvergeslagen = 0;

  for (const resultaat of resultaten) {
    if (
      typeof resultaat.attestId !== "string" ||
      !toegestaneStatussen.has(resultaat.status)
    ) {
      foutresultatenOvergeslagen += 1;
      continue;
    }

    const attestId = resultaat.attestId.trim();

    if (!attestId) {
      foutresultatenOvergeslagen += 1;
      continue;
    }

    /*
     * Bij een dubbel attest-ID wordt uitsluitend het nieuwste
     * weergegeven resultaat gebruikt.
     */
    perAttestId.set(attestId, {
      attestId,
      status: resultaat.status,
    });
  }

  const opTeSlaanResultaten = [...perAttestId.values()];

  if (opTeSlaanResultaten.length === 0) {
    toonDeskcontroleStatus(
      "Er zijn geen geldige resultaten om op te slaan. Foutresultaten worden overgeslagen.",
      "fout",
    );
    return;
  }

  if (opTeSlaanResultaten.length > 500) {
    toonDeskcontroleStatus(
      "Er kunnen maximaal 500 unieke statussen tegelijk worden opgeslagen.",
      "fout",
    );
    return;
  }

  statussenWordenOpgeslagen = true;

  resultatenOpslaanKnop.textContent =
    "Bezig met opslaan…";
  resultatenOpslaanKnop.setAttribute(
    "aria-busy",
    "true",
  );

  toonResultaten();

  const bezigMelding =
    `Bezig met opslaan van ${opTeSlaanResultaten.length} statussen. Sluit het sidepanel niet.`;

  toonDeskcontroleStatus(
    bezigMelding,
  );
  toonOpslagResultaatStatus(
    bezigMelding,
  );

  try {
    const antwoord = await fetch(
      `${runtimeBasis}/api/webextensie/deskcontroles-statussen`,
      {
        method: "POST",
        credentials: "include",
        mode: "cors",
        cache: "no-store",
        redirect: "error",
        headers: {
          "X-Webextensie-Id": chrome.runtime.id,
          /*
           * text/plain voorkomt een CORS-preflight voor gewone
           * webpagina's. De extensie heeft daarnaast expliciete
           * host-permissie voor de CRM-host.
           * valideert de JSON-inhoud en de exacte Origin alsnog.
           */
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify({
          resultaten: opTeSlaanResultaten,
        }),
      },
    );

    const inhoud = await antwoord.json().catch(() => null);

    if (!antwoord.ok) {
      throw new Error(
        inhoud?.fout ||
          inhoud?.message ||
          `De CRM-runtime gaf status ${antwoord.status}.`,
      );
    }

    const lokaalOvergeslagen =
      foutresultatenOvergeslagen;

    const serverOvergeslagen =
      Number(inhoud?.overgeslagenFout) || 0;

    const meldingen = [
      `${Number(inhoud?.bijgewerkt) || 0} bijgewerkt`,
      `${Number(inhoud?.ongewijzigd) || 0} al correct`,
      `${Number(inhoud?.nietGevonden) || 0} niet gevonden`,
      `${Number(inhoud?.conflict) || 0} gelijktijdig gewijzigd`,
      `${Number(inhoud?.beschermd) || 0} beschermd`,
      `${lokaalOvergeslagen + serverOvergeslagen} foutresultaten overgeslagen`,
    ];

    const mislukt =
      (Number(inhoud?.nietGevonden) || 0) +
        (Number(inhoud?.conflict) || 0) +
        (Number(inhoud?.mislukt) || 0) >
      0;

    const opslagMelding =
      mislukt
        ? `Opslaan voltooid met aandachtspunten: ${meldingen.join(", ")}.`
        : `Opslaan geslaagd: ${meldingen.join(", ")}.`;

    const opslagSoort =
      mislukt
        ? "fout"
        : "succes";

    toonDeskcontroleStatus(
      opslagMelding,
      opslagSoort,
    );
    toonOpslagResultaatStatus(
      opslagMelding,
      opslagSoort,
    );
  } catch (fout) {
    console.error(
      "Deskcontrolestatussen opslaan mislukt.",
      fout instanceof Error
        ? fout.message
        : "Onbekende fout",
    );

    const foutmelding =
      fout instanceof Error
        ? `Opslaan mislukt: ${fout.message}`
        : "De statussen konden niet worden opgeslagen.";

    toonDeskcontroleStatus(
      foutmelding,
      "fout",
    );
    toonOpslagResultaatStatus(
      foutmelding,
      "fout",
    );
  } finally {
    statussenWordenOpgeslagen = false;

    resultatenOpslaanKnop.textContent =
      "Statussen opslaan";
    resultatenOpslaanKnop.removeAttribute(
      "aria-busy",
    );

    toonResultaten();
  }
});

resultatenExporterenKnop.addEventListener("click", () => {
  if (resultaten.length === 0) {
    return;
  }

  const regels = [
    ["Attest-ID", "Copy-ID", "AIA-nummer", "Copy state", "Status", "Foutmelding"],
    ...resultaten.map((resultaat) => [
      resultaat.attestId,
      resultaat.copyId,
      resultaat.aiaNummer,
      resultaat.copyState,
      statusInfo(resultaat.status).label,
      resultaat.fout,
    ]),
  ];

  const csv =
    "\uFEFF" +
    regels.map((regel) => regel.map(csvWaarde).join(";")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const nu = new Date();
  const datum = [
    nu.getFullYear(),
    String(nu.getMonth() + 1).padStart(2, "0"),
    String(nu.getDate()).padStart(2, "0"),
  ].join("-");

  const tijd = [
    String(nu.getHours()).padStart(2, "0"),
    String(nu.getMinutes()).padStart(2, "0"),
    String(nu.getSeconds()).padStart(2, "0"),
  ].join("-");

  const link = document.createElement("a");
  link.href = url;
  link.download = `Deskcontrole_opvolging_${datum}_${tijd}.csv`;

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

toonResultaten();

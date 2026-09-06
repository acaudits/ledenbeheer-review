"use strict";

// =============================================================
// Deel 1: Sidepanel configuratie
// =============================================================

async function configureerSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    });
  } catch (fout) {
    console.error(
      "Het Asbest CRM-sidepanel kon niet worden geconfigureerd.",
      fout,
    );
  }
}

chrome.runtime.onInstalled.addListener(configureerSidePanel);
chrome.runtime.onStartup.addListener(configureerSidePanel);
configureerSidePanel();

// =============================================================
// Deel 2: OVAM Attest Kettingzoeker (voorheen background1.js)
// =============================================================
//
// Tokenstrategie:
// 1. Luistert naar OVAM Authorization: Bearer requests.
// 2. Synchroniseert met de bestaande OVAM Keycloak-sessie.
// 3. Leest de OVAM "oidc" sessie uit de OVAM-pagina.
// 4. Vernieuwt de Keycloak access token via refresh_token.
// 5. Slaat alleen de actuele access token lokaal in de extension op.
// 6. Bij 401 wordt de token opnieuw vernieuwd en de request opnieuw uitgevoerd.
//
// Voor chrome.scripting.executeScript is "scripting" nodig in manifest.json.

const ASBEST_HOST = 'https://asbestinventaris.ovam.be';
const API_BASE = `${ASBEST_HOST}/v1/services/asbestinv`;

const STORAGE_TOKEN_KEY = 'ovamAuthToken';

const OVAM_URL_PATTERN = `${ASBEST_HOST}/*`;

const REQUEST_DELAY_MS = 1000;

// Token minstens ongeveer 30 seconden geldig houden.
// Dit sluit aan bij OVAM's eigen updateToken(30).
const TOKEN_MIN_VALIDITY_SECONDS = 30;

// Niet oneindig blijven refreshen.
const MAX_REFRESH_ATTEMPTS = 2;

// ---------------------------------------------------------
// Runtime state
// ---------------------------------------------------------

let inMemoryToken = null;

let refreshPromise = null;

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  let value = token.trim();

  if (value.toLowerCase().startsWith('bearer ')) {
    value = value.substring(7).trim();
  }

  return value || null;
}

function decodeJwtPayload(token) {
  try {
    if (!token) return null;

    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    let payload = parts[1];

    payload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    while (payload.length % 4 !== 0) {
      payload += '=';
    }

    const json = atob(payload);

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTokenExpiry(token) {
  const payload = decodeJwtPayload(token);

  if (!payload || typeof payload.exp !== 'number') {
    return null;
  }

  return payload.exp;
}

function isTokenValid(token, minValiditySeconds = 30) {
  const expiry = getTokenExpiry(token);

  if (!expiry) {
    // Als we exp niet kunnen lezen, behandelen we hem
    // niet automatisch als verlopen.
    return !!token;
  }

  const now = Math.floor(Date.now() / 1000);

  return expiry - now > minValiditySeconds;
}

// ---------------------------------------------------------
// Token storage
// ---------------------------------------------------------

async function saveAccessToken(token, source = 'unknown') {
  const normalized = normalizeToken(token);

  if (!normalized) {
    return false;
  }

  const previous = inMemoryToken?.token || null;

  const tokenMeta = {
    tokenLastSeenAt: new Date().toISOString(),
    source,
    changed: !!previous && previous !== normalized,
    expiresAt: getTokenExpiry(normalized),
  };

  const data = {
    token: normalized,
    tokenMeta,
  };

  inMemoryToken = data;

  await chrome.storage.local.set({
    [STORAGE_TOKEN_KEY]: data,
  });

  console.log(
    '[Kettingzoeker] OVAM access token bijgewerkt.',
    tokenMeta.changed ? 'Nieuwe token.' : 'Token opgeslagen.',
  );

  return true;
}

async function loadStoredToken() {
  const data = await chrome.storage.local.get(STORAGE_TOKEN_KEY);

  const stored = data[STORAGE_TOKEN_KEY];

  if (!stored || !stored.token) {
    return null;
  }

  const token = normalizeToken(stored.token);

  if (!token) {
    return null;
  }

  return {
    token,
    tokenMeta: stored.tokenMeta || null,
  };
}

async function initTokenCache() {
  try {
    const stored = await loadStoredToken();

    if (stored) {
      inMemoryToken = stored;
    }
  } catch (error) {
    console.error(
      '[Kettingzoeker] Token cache initialiseren mislukt:',
      error,
    );
  }
}

// ---------------------------------------------------------
// Bearer-token onderscheppen
// ---------------------------------------------------------
//
// Wanneer de normale OVAM-app zelf een token refreshed,
// zien we de nieuwe Authorization-header hier ook.
//
// De OVAM-app gebruikt:
//   Vg.updateToken(30)
//   Authorization: Bearer <Vg.token>

if (chrome.webRequest && chrome.webRequest.onBeforeSendHeaders) {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      try {
        if (!details.requestHeaders) {
          return {};
        }

        const authorizationHeader = details.requestHeaders.find(
          (header) =>
            header &&
            typeof header.name === 'string' &&
            header.name.toLowerCase() === 'authorization',
        );

        if (
          !authorizationHeader ||
          typeof authorizationHeader.value !== 'string'
        ) {
          return {};
        }

        const value = authorizationHeader.value.trim();

        if (!value.toLowerCase().startsWith('bearer ')) {
          return {};
        }

        const token = normalizeToken(value);

        if (!token) {
          return {};
        }

        saveAccessToken(token, 'webRequest').catch((error) => {
          console.error(
            '[Kettingzoeker] Bearer-token opslaan mislukt:',
            error,
          );
        });
      } catch (error) {
        console.error(
          '[Kettingzoeker] webRequest token capture error:',
          error,
        );
      }

      return {};
    },
    { urls: [OVAM_URL_PATTERN] },
    ['requestHeaders', 'extraHeaders'],
  );
}

// ---------------------------------------------------------
// OVAM-tab vinden
// ---------------------------------------------------------

async function findOvAMTab() {
  const tabs = await chrome.tabs.query({ url: OVAM_URL_PATTERN });

  if (!tabs || tabs.length === 0) {
    return null;
  }

  // Eerst actieve OVAM-tab proberen.
  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab && activeTab.id) {
    return activeTab;
  }

  return tabs.find((tab) => tab.id) || null;
}

// ---------------------------------------------------------
// Keycloak refresh IN de OVAM-pagina uitvoeren
// ---------------------------------------------------------
//
// De OVAM-app bewaart:
//   localStorage["oidc"] = { token, refreshToken, idToken }
//
// De extension leest de refreshToken niet uit haar eigen storage.
// Ze laat de refresh uitvoeren vanuit de OVAM-origin:
//   POST <authServerUrl>/realms/ovam/protocol/openid-connect/token
//   grant_type=refresh_token

async function refreshTokenFromOvAMPage() {
  if (!chrome.scripting || !chrome.scripting.executeScript) {
    throw new Error(
      'chrome.scripting is niet beschikbaar. ' +
        'Voeg "scripting" toe aan manifest.json.',
    );
  }

  const tab = await findOvAMTab();

  if (!tab || !tab.id) {
    throw new Error(
      'Geen actieve OVAM-tab gevonden. ' +
        'Open eerst asbestinventaris.ovam.be en log in.',
    );
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    // MAIN = uitvoeren in de context van de OVAM-pagina.
    world: 'MAIN',
    func: async () => {
      try {
        // OVAM configuratie
        const config = window.APP_CONFIG;

        if (!config) {
          return { ok: false, error: 'window.APP_CONFIG niet gevonden.' };
        }

        const authServerUrl = config.authServerUrl;
        const clientId = config.authClientId;

        if (!authServerUrl || !clientId) {
          return {
            ok: false,
            error: 'OVAM authServerUrl of authClientId ontbreekt.',
          };
        }

        // Bestaande OVAM OIDC-sessie
        const raw = localStorage.getItem('oidc');

        if (!raw) {
          return { ok: false, error: 'Geen OVAM OIDC-sessie gevonden.' };
        }

        let oidc;

        try {
          oidc = JSON.parse(raw);
        } catch {
          return {
            ok: false,
            error: 'OVAM OIDC-sessie kon niet worden gelezen.',
          };
        }

        if (!oidc || !oidc.refreshToken) {
          return {
            ok: false,
            error: 'Geen refresh token aanwezig in de OVAM-sessie.',
          };
        }

        // Keycloak token endpoint
        const baseUrl = String(authServerUrl).replace(/\/+$/, '');
        const tokenEndpoint =
          `${baseUrl}/realms/ovam` + `/protocol/openid-connect/token`;

        // Refresh request
        const body = new URLSearchParams();

        body.set('grant_type', 'refresh_token');
        body.set('refresh_token', oidc.refreshToken);
        body.set('client_id', clientId);

        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: body.toString(),
        });

        let json = null;

        try {
          json = await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          return {
            ok: false,
            status: response.status,
            error:
              json?.error_description ||
              json?.error ||
              `Keycloak refresh HTTP ${response.status}`,
          };
        }

        if (!json || !json.access_token) {
          return {
            ok: false,
            error: 'Keycloak gaf geen nieuwe access token terug.',
          };
        }

        // Nieuwe OIDC-state opslaan
        const updatedOidc = {
          ...oidc,
          token: json.access_token,
          refreshToken: json.refresh_token || oidc.refreshToken,
          idToken: json.id_token || oidc.idToken,
        };

        localStorage.setItem('oidc', JSON.stringify(updatedOidc));

        // Alleen de access token teruggeven.
        // De refresh token wordt NIET naar de extension storage gestuurd.
        return {
          ok: true,
          accessToken: json.access_token,
          expiresIn: json.expires_in || null,
        };
      } catch (error) {
        return {
          ok: false,
          error: error?.message || String(error),
        };
      }
    },
  });

  const result = results?.[0]?.result;

  if (!result || !result.ok) {
    throw new Error(result?.error || 'OVAM-token refresh mislukt.');
  }

  if (!result.accessToken) {
    throw new Error('OVAM gaf geen access token terug.');
  }

  await saveAccessToken(result.accessToken, 'keycloak-refresh');

  return result.accessToken;
}

// ---------------------------------------------------------
// Actuele token ophalen
// ---------------------------------------------------------

async function getCurrentToken({ forceRefresh = false } = {}) {
  // Eerst memory.
  let token = inMemoryToken?.token || null;

  // Daarna storage.
  if (!token) {
    const stored = await loadStoredToken();

    if (stored) {
      inMemoryToken = stored;
      token = stored.token;
    }
  }

  // Als we geen token hebben, direct synchroniseren met OVAM.
  if (!token) {
    return refreshTokenFromOvAMPage();
  }

  // Als de JWT bijna verlopen is, Keycloak refresh uitvoeren.
  // Dit bootst OVAM's updateToken(30) na.
  if (forceRefresh || !isTokenValid(token, TOKEN_MIN_VALIDITY_SECONDS)) {
    try {
      return await refreshTokenFromOvAMPage();
    } catch (error) {
      // Als refresh niet lukt maar token nog bruikbaar is,
      // houden we hem nog even aan.
      if (isTokenValid(token, 0)) {
        console.warn(
          '[Kettingzoeker] Token-refresh mislukt; bestaande token is nog geldig.',
          error,
        );

        return token;
      }

      throw error;
    }
  }

  return token;
}

// ---------------------------------------------------------
// Centrale refresh (single flight)
// ---------------------------------------------------------

async function refreshTokenSingleFlight() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      return await refreshTokenFromOvAMPage();
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------------------------------------------------------
// Fetch JSON met automatische refresh
// ---------------------------------------------------------

async function fetchJson(url, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
    let token;

    try {
      token = await getCurrentToken({ forceRefresh: attempt > 0 });
    } catch (error) {
      lastError = error;
      break;
    }

    const headers = new Headers(options.headers || {});

    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');

    let response;

    try {
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      lastError = error;

      if (attempt < MAX_REFRESH_ATTEMPTS) {
        await sleep(1000);
        continue;
      }

      break;
    }

    // Success
    if (response.ok) {
      return response.json();
    }

    // 401 = token niet meer geldig
    if (response.status === 401) {
      console.warn(
        '[Kettingzoeker] OVAM API gaf 401. Token opnieuw vernieuwen...',
      );

      try {
        await refreshTokenSingleFlight();

        // Volgende loop gebruikt nieuwe token.
        continue;
      } catch (refreshError) {
        lastError = new Error(
          'OVAM-token verlopen en vernieuwen mislukt: ' +
            (refreshError?.message || refreshError),
        );

        break;
      }
    }

    // Andere HTTP-fout
    const text = await response.text().catch(() => '');

    lastError = new Error(
      `API-fout ${response.status}: ` + `${text || response.statusText}`,
    );

    break;
  }

  throw lastError || new Error('Onbekende fout bij OVAM API-request.');
}

// ---------------------------------------------------------
// OVAM /copies
// ---------------------------------------------------------

async function fetchCopiesById(inventarisId) {
  const id = String(inventarisId || '').trim();

  if (!id) {
    throw new Error('Geen inventaris-ID opgegeven.');
  }

  const url =
    `${API_BASE}/asbestinventaris/` + `${encodeURIComponent(id)}/copies`;

  return fetchJson(url);
}

// ---------------------------------------------------------
// OVAM terreincontrole versie 2
// GET /asbestinventaris/{id}
// ---------------------------------------------------------

const TERREINCONTROLE_V2_STATUSSEN = new Set([
  'GEARCHIVEERD_ATTEST',
  'IN_OPMAAK',
  'ACTUEEL_ATTEST',
]);

const UUID_PATROON =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchInventarisById(inventarisId) {
  const id = String(inventarisId || '').trim().toLowerCase();

  if (!UUID_PATROON.test(id)) {
    throw new Error('Ongeldig attest-ID.');
  }

  const url =
    `${API_BASE}/asbestinventaris/` +
    encodeURIComponent(id);

  return fetchJson(url);
}

async function fetchTerreincontroleV2Summary(ids) {
  const uniekeIds = [
    ...new Set(
      ids
        .map((waarde) =>
          String(waarde || '').trim().toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];

  if (uniekeIds.length > 500) {
    throw new Error(
      'Er kunnen maximaal 500 unieke attest-ID’s worden verwerkt.',
    );
  }

  const resultaten = [];

  for (let index = 0; index < uniekeIds.length; index += 1) {
    const inputId = uniekeIds[index];

    const item = {
      inputId,
      status: null,
      geslaagd: false,
      fout: '',
      apiVersie: 2,
    };

    if (!UUID_PATROON.test(inputId)) {
      item.fout = 'Ongeldig attest-ID.';
      resultaten.push(item);
      continue;
    }

    try {
      const json = await fetchInventarisById(inputId);

      if (
        !json ||
        typeof json !== 'object' ||
        Array.isArray(json)
      ) {
        throw new Error(
          'OVAM gaf geen geldig inventarisobject terug.',
        );
      }

      /*
       * Een ontbrekend statusveld is een responsefout.
       * Dit mag niet als database-NULL worden behandeld.
       */
      if (
        !Object.prototype.hasOwnProperty.call(
          json,
          'status',
        )
      ) {
        throw new Error(
          'Het OVAM-inventarisobject bevat geen statusveld.',
        );
      }

      if (json.status === null) {
        /*
         * Alleen een expliciete status:null van een succesvol
         * OVAM-object wordt als geldige NULL-status behandeld.
         */
        item.status = null;
        item.geslaagd = true;
      } else if (
        typeof json.status === 'string' &&
        TERREINCONTROLE_V2_STATUSSEN.has(
          json.status,
        )
      ) {
        item.status = json.status;
        item.geslaagd = true;
      } else {
        throw new Error(
          'OVAM gaf een onbekende terreincontrolestatus terug.',
        );
      }
    } catch (fout) {
      item.status = null;
      item.geslaagd = false;
      item.fout =
        fout instanceof Error
          ? fout.message
          : 'Onbekende fout bij de OVAM-opvraging.';
    }

    resultaten.push(item);

    /*
     * Behoud maximaal één OVAM-aanvraag per seconde.
     */
    if (index < uniekeIds.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return resultaten;
}

// ---------------------------------------------------------
// Meerdere IDs verwerken
// ---------------------------------------------------------

async function fetchCopiesSummary(ids) {
  const results = [];

  for (let idx = 0; idx < ids.length; idx++) {
    const rawId = ids[idx];

    const inputId = String(rawId || '').trim();

    if (!inputId) {
      continue;
    }

    const item = {
      inputId,
      id: null,
      aiaNummer: null,
      copyState: null,
      status: 'GEEN',
    };

    try {
      const json = await fetchCopiesById(inputId);

      if (!Array.isArray(json) || json.length === 0) {
        item.status = 'GEEN';
      } else {
        const rec = json[0] || {};

        item.id = rec.id || null;

        item.aiaNummer =
          rec.aiaNummer !== undefined && rec.aiaNummer !== null
            ? String(rec.aiaNummer)
            : null;

        item.copyState = rec.copyState || null;

        if (item.id && item.aiaNummer) {
          item.status = 'OK_GEA';
        } else if (item.id && item.aiaNummer === null) {
          item.status = 'OK_INOP';
        } else {
          item.status = 'ERROR';
          item.error =
            'Onverwachte combinatie van velden in /copies-response';
        }
      }
    } catch (error) {
      item.status = 'ERROR';
      item.error = error?.message || String(error);
    }

    results.push(item);

    // Behoud bestaande limiet: maximaal 1 request per seconde.
    if (idx < ids.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}

// ---------------------------------------------------------
// Messages vanuit sidepanel
// ---------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      // Token info
      if (msg?.type === 'GET_TOKEN_INFO') {
        const stored = await loadStoredToken();

        if (!stored) {
          sendResponse({ ok: true, token: null, tokenMeta: null });
          return;
        }

        sendResponse({
          ok: true,
          token: stored.token,
          tokenMeta: stored.tokenMeta || null,
        });

        return;
      }

      // Handmatig token refresh
      if (msg?.type === 'REFRESH_OVAM_TOKEN') {
        const token = await refreshTokenSingleFlight();

        sendResponse({ ok: true, token });

        return;
      }

      // Fetch attest-kopien
      if (msg?.type === 'FETCH_INVENTARISSEN') {
        const ids = Array.isArray(msg.ids) ? msg.ids : [];

        if (ids.length === 0) {
          sendResponse({
            ok: false,
            error: 'Geen attest-ID\'s ontvangen.',
          });

          return;
        }

        const data = await fetchCopiesSummary(ids);

        sendResponse({ ok: true, data });

        return;
      }

      // Terreincontrole versie 2:
      // GET /asbestinventaris/{id}, dus zonder /copies.
      if (msg?.type === 'FETCH_TERREINCONTROLE_V2') {
        const ids =
          Array.isArray(msg.ids)
            ? msg.ids
            : [];

        if (ids.length === 0) {
          sendResponse({
            ok: false,
            error: 'Geen attest-ID’s ontvangen.',
          });
          return;
        }

        if (ids.length > 500) {
          sendResponse({
            ok: false,
            error:
              'Er kunnen maximaal 500 attest-ID’s worden verwerkt.',
          });
          return;
        }

        const data =
          await fetchTerreincontroleV2Summary(ids);

        sendResponse({
          ok: true,
          apiVersie: 2,
          data,
        });
        return;
      }

      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (error) {
      console.error('[Kettingzoeker] Message error:', error);

      sendResponse({
        ok: false,
        error: error?.message || String(error),
      });
    }
  })();

  // Async response.
  return true;
});

// ---------------------------------------------------------
// Sidepanel openen (fallback; bij openPanelOnActionClick
// opent het icoon het panel al)
// ---------------------------------------------------------

chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) {
    return;
  }

  chrome.sidePanel
    .open({ tabId: tab.id })
    .catch((error) => {
      console.error(
        '[Kettingzoeker] Sidepanel openen mislukt:',
        error,
      );
    });
});

// ---------------------------------------------------------
// Startup
// ---------------------------------------------------------

initTokenCache().catch((error) =>
  console.error('[Kettingzoeker] initTokenCache error:', error),
);

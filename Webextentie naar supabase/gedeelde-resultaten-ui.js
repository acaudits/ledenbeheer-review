"use strict";

(() => {
  const OPSLAG_STATUS_IDS = [
    "opslag-resultaat-status",
    "terrein-opslag-resultaat-status",
  ];

  const EXPORT_CONFIGURATIES = [
    {
      knopId: "resultaten-exporteren",
      lichaamId: "resultaten-lichaam",
      bestandsnaam: "Deskcontrole",
      werkblad: "Deskcontrole",
    },
    {
      knopId: "terrein-resultaten-exporteren",
      lichaamId: "terrein-resultaten-lichaam",
      bestandsnaam: "Terreincontrole_V2",
      werkblad: "Terreincontrole",
    },
  ];

  const OPSLAG_VELDEN = [
    {
      sleutel: "bijgewerkt",
      label: "Bijgewerkt",
      patroon: /(\d+)\s+bijgewerkt/i,
      type: "succes",
    },
    {
      sleutel: "ongewijzigd",
      label: "Al correct",
      patroon: /(\d+)\s+(?:al correct|ongewijzigd)/i,
      type: "",
    },
    {
      sleutel: "nietGevonden",
      label: "Niet gevonden",
      patroon: /(\d+)\s+niet gevonden/i,
      type: "aandachtspunt",
    },
    {
      sleutel: "conflict",
      label: "Gelijktijdig gewijzigd",
      patroon: /(\d+)\s+(?:gelijktijdig gewijzigd|conflict)/i,
      type: "aandachtspunt",
    },
    {
      sleutel: "beschermd",
      label: "Beschermd",
      patroon: /(\d+)\s+beschermd/i,
      type: "aandachtspunt",
    },
    {
      sleutel: "overgeslagen",
      label: "Foutresultaten overgeslagen",
      patroon: /(\d+)\s+(?:foutresultaten\s+)?overgeslagen/i,
      type: "aandachtspunt",
    },
    {
      sleutel: "mislukt",
      label: "Mislukt",
      patroon: /(\d+)\s+mislukt/i,
      type: "fout",
    },
  ];

  function kopieerDeskcontroleOpmaak() {
    const terreinSectie =
      document.getElementById("tab-terreincontrole");

    if (!terreinSectie) {
      return;
    }


    terreinSectie
      .querySelectorAll("[id^='terrein-']")
      .forEach((terreinElement) => {
        const deskId =
          terreinElement.id.replace(/^terrein-/, "");

        const deskElement =
          document.getElementById(deskId);

        if (deskElement) {
          terreinElement.className =
            deskElement.className;
        }
      });
  }

  function leesAantal(tekst, patroon) {
    const resultaat = tekst.match(patroon);

    return resultaat
      ? Number.parseInt(resultaat[1], 10) || 0
      : 0;
  }

  function leesOpslagResultaat(tekst) {
    if (!tekst || !/opslaan (?:voltooid|geslaagd)/i.test(tekst)) {
      return null;
    }

    return Object.fromEntries(
      OPSLAG_VELDEN.map((veld) => [
        veld.sleutel,
        leesAantal(tekst, veld.patroon),
      ]),
    );
  }

  function heeftAandachtspunten(waarden) {
    return (
      waarden.nietGevonden > 0 ||
      waarden.conflict > 0 ||
      waarden.beschermd > 0 ||
      waarden.overgeslagen > 0 ||
      waarden.mislukt > 0
    );
  }

  function toonOpslagSamenvatting(element, waarden) {
    const aandachtspunten =
      heeftAandachtspunten(waarden);

    const container = document.createElement("div");
    container.className = "opslag-samenvatting";

    const kop = document.createElement("p");
    kop.className = [
      "opslag-samenvatting-kop",
      aandachtspunten ? "aandachtspunt" : "",
    ]
      .filter(Boolean)
      .join(" ");

    kop.textContent = aandachtspunten
      ? "Opslaan geslaagd met aandachtspunten"
      : "Opslaan geslaagd";

    const grid = document.createElement("div");
    grid.className = "opslag-samenvatting-grid";

    OPSLAG_VELDEN.forEach((veld) => {
      const aantal = waarden[veld.sleutel] || 0;
      const item = document.createElement("div");
      const type = aantal > 0 ? veld.type : "";

      item.className = [
        "opslag-samenvatting-item",
        type,
      ]
        .filter(Boolean)
        .join(" ");

      const label = document.createElement("span");
      label.textContent = veld.label;

      const teller = document.createElement("strong");
      teller.textContent = String(aantal);

      item.append(label, teller);
      grid.append(item);
    });

    container.append(kop, grid);
    element.replaceChildren(container);
  }

  function verwerkOpslagElement(element) {
    if (
      !element ||
      element.querySelector(".opslag-samenvatting")
    ) {
      return;
    }

    const waarden =
      leesOpslagResultaat(element.textContent);

    if (waarden) {
      toonOpslagSamenvatting(element, waarden);
    }
  }

  function observeerOpslagElement(element) {
    if (!element) {
      return;
    }

    verwerkOpslagElement(element);

    new MutationObserver(() => {
      verwerkOpslagElement(element);
    }).observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function vindFoutkolomIndex(tabel) {
    const koppen = Array.from(
      tabel.querySelectorAll("thead th"),
    );

    return koppen.findIndex((kop) =>
      /fout|melding/i.test(kop.textContent),
    );
  }

  function maakFoutkolomCompact(lichaam) {
    const tabel = lichaam?.closest("table");

    if (!tabel) {
      return;
    }

    const kolomIndex = vindFoutkolomIndex(tabel);

    if (kolomIndex < 0) {
      return;
    }

    const koppen =
      tabel.querySelectorAll("thead th");

    koppen[kolomIndex]?.classList.add(
      "resultaten-foutkolom",
    );

    lichaam.querySelectorAll("tr").forEach((rij) => {
      const cel = rij.children[kolomIndex];

      if (!cel) {
        return;
      }

      cel.classList.add("resultaten-foutcel");

      const volledigeMelding =
        cel.textContent.trim();

      if (volledigeMelding) {
        cel.title = volledigeMelding;
      } else {
        cel.removeAttribute("title");
      }
    });
  }

  function observeerResultaten(lichaam) {
    if (!lichaam) {
      return;
    }

    maakFoutkolomCompact(lichaam);

    new MutationObserver(() => {
      maakFoutkolomCompact(lichaam);
    }).observe(lichaam, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function tabelNaarRijen(tabel) {
    return Array.from(tabel.querySelectorAll("tr"))
      .map((rij) =>
        Array.from(
          rij.querySelectorAll(":scope > th, :scope > td"),
        ).map((cel) =>
          cel.innerText.replace(/\s+/g, " ").trim(),
        ),
      )
      .filter((rij) => rij.length > 0);
  }

  function kolombreedtes(rijen) {
    const aantalKolommen = Math.max(
      0,
      ...rijen.map((rij) => rij.length),
    );

    return Array.from(
      { length: aantalKolommen },
      (_, index) => {
        const langste = Math.max(
          0,
          ...rijen.map((rij) =>
            String(rij[index] ?? "").length,
          ),
        );

        return {
          wch:
            index === aantalKolommen - 1
              ? Math.min(Math.max(langste, 18), 35)
              : Math.min(Math.max(langste, 12), 32),
        };
      },
    );
  }

  function datumBestandsnaam() {
    const datum = new Date();

    const delen = [
      datum.getFullYear(),
      String(datum.getMonth() + 1).padStart(2, "0"),
      String(datum.getDate()).padStart(2, "0"),
    ];

    const tijd = [
      String(datum.getHours()).padStart(2, "0"),
      String(datum.getMinutes()).padStart(2, "0"),
      String(datum.getSeconds()).padStart(2, "0"),
    ];

    return `${delen.join("-")}_${tijd.join("-")}`;
  }

  function exporteerXlsx(configuratie) {
    if (
      typeof globalThis.XLSX === "undefined" ||
      !globalThis.XLSX.utils
    ) {
      throw new Error(
        "De Excel-bibliotheek is niet beschikbaar.",
      );
    }

    const lichaam =
      document.getElementById(configuratie.lichaamId);

    const tabel = lichaam?.closest("table");

    if (!tabel) {
      throw new Error(
        "De resultatentabel werd niet gevonden.",
      );
    }

    const rijen = tabelNaarRijen(tabel);

    if (rijen.length < 2) {
      throw new Error(
        "Er zijn geen resultaten om te exporteren.",
      );
    }

    const werkblad =
      XLSX.utils.aoa_to_sheet(rijen);

    werkblad["!cols"] = kolombreedtes(rijen);

    if (werkblad["!ref"]) {
      werkblad["!autofilter"] = {
        ref: werkblad["!ref"],
      };
    }

    const werkmap =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      werkmap,
      werkblad,
      configuratie.werkblad.slice(0, 31),
    );

    XLSX.writeFile(
      werkmap,
      `${configuratie.bestandsnaam}_${datumBestandsnaam()}.xlsx`,
      {
        bookType: "xlsx",
        compression: true,
      },
    );
  }

  function koppelXlsxExport(configuratie) {
    const knop =
      document.getElementById(configuratie.knopId);

    if (!knop) {
      return;
    }

    knop.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        try {
          exporteerXlsx(configuratie);
        } catch (fout) {
          const terrein =
            configuratie.knopId.startsWith("terrein-");

          const statusId = terrein
            ? "terrein-opslag-resultaat-status"
            : "opslag-resultaat-status";

          const status =
            document.getElementById(statusId);

          if (status) {
            status.textContent =
              fout instanceof Error
                ? fout.message
                : "Exporteren naar Excel is mislukt.";
          }
        }
      },
      true,
    );
  }

  function zoekOverzichtKop(zoektekst) {
    return Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).find((kop) =>
      kop.textContent
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .includes(zoektekst.toLowerCase()),
    );
  }

  function vindKopEnKnoppenContainer(kop) {
    if (!kop) {
      return null;
    }

    let element = kop;

    for (let niveau = 0; niveau < 4; niveau += 1) {
      const ouder = element.parentElement;

      if (!ouder) {
        break;
      }

      const bevatKnop = Boolean(
        ouder.querySelector("button, a[role='button']"),
      );

      const bevatTabel = Boolean(
        ouder.querySelector("table"),
      );

      if (bevatKnop && !bevatTabel) {
        return ouder;
      }

      element = ouder;
    }

    return kop;
  }

  function verplaatsOpslagStatus(
    statusId,
    overzichtTitel,
  ) {
    const status = document.getElementById(statusId);
    const kop = zoekOverzichtKop(overzichtTitel);

    if (!status || !kop) {
      return;
    }

    const anker = vindKopEnKnoppenContainer(kop);

    if (!anker || anker.nextElementSibling === status) {
      status.classList.add("overzicht-opslag-status");
      return;
    }

    status.classList.add("overzicht-opslag-status");
    anker.insertAdjacentElement("afterend", status);
  }

  function initialiseer() {
    kopieerDeskcontroleOpmaak();

    verplaatsOpslagStatus(
      "opslag-resultaat-status",
      "Deskcontroleoverzicht",
    );

    verplaatsOpslagStatus(
      "terrein-opslag-resultaat-status",
      "Terreincontroleoverzicht",
    );

    OPSLAG_STATUS_IDS.forEach((id) => {
      observeerOpslagElement(
        document.getElementById(id),
      );
    });

    EXPORT_CONFIGURATIES.forEach((configuratie) => {
      const lichaam =
        document.getElementById(
          configuratie.lichaamId,
        );

      observeerResultaten(lichaam);
      koppelXlsxExport(configuratie);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialiseer,
      { once: true },
    );
  } else {
    initialiseer();
  }
})();

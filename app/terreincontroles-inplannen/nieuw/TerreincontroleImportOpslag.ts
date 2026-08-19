import type {
  TerreincontroleExcelRij,
  TerreincontroleExcelState,
} from "../planning-import-actions";

const DATABASE_NAAM =
  "asbestcrm-terreincontrole-import";
const DATABASE_VERSIE = 1;
const OPSLAG_NAAM = "imports";
const IMPORT_SLEUTEL =
  "laatste-succesvolle-import";

export type BewaardeTerreincontroleImport = {
  versie: 1;
  importState: TerreincontroleExcelState;
  rijen: TerreincontroleExcelRij[];
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const verzoek =
        window.indexedDB.open(
          DATABASE_NAAM,
          DATABASE_VERSIE,
        );

      verzoek.onupgradeneeded =
        () => {
          const database =
            verzoek.result;

          if (
            !database.objectStoreNames.contains(
              OPSLAG_NAAM,
            )
          ) {
            database.createObjectStore(
              OPSLAG_NAAM,
            );
          }
        };

      verzoek.onsuccess =
        () => {
          resolve(
            verzoek.result,
          );
        };

      verzoek.onerror =
        () => {
          reject(
            verzoek.error ??
              new Error(
                "De lokale importopslag kon niet worden geopend.",
              ),
          );
        };
    },
  );
}

export async function leesBewaardeTerreincontroleImport():
  Promise<BewaardeTerreincontroleImport | null> {
  if (
    typeof window === "undefined" ||
    !window.indexedDB
  ) {
    return null;
  }

  const database =
    await openDatabase();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transactie =
          database.transaction(
            OPSLAG_NAAM,
            "readonly",
          );

        const verzoek =
          transactie
            .objectStore(
              OPSLAG_NAAM,
            )
            .get(
              IMPORT_SLEUTEL,
            );

        verzoek.onsuccess =
          () => {
            const waarde =
              verzoek.result;

            if (
              !waarde ||
              waarde.versie !== 1 ||
              !Array.isArray(
                waarde.rijen,
              )
            ) {
              resolve(null);
              return;
            }

            resolve(
              waarde as
                BewaardeTerreincontroleImport,
            );
          };

        verzoek.onerror =
          () => {
            reject(
              verzoek.error ??
                new Error(
                  "De bewaarde import kon niet worden gelezen.",
                ),
            );
          };
      },
    );
  } finally {
    database.close();
  }
}

export async function bewaarTerreincontroleImport(
  waarde: BewaardeTerreincontroleImport,
): Promise<void> {
  if (
    typeof window === "undefined" ||
    !window.indexedDB
  ) {
    return;
  }

  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transactie =
          database.transaction(
            OPSLAG_NAAM,
            "readwrite",
          );

        transactie
          .objectStore(
            OPSLAG_NAAM,
          )
          .put(
            waarde,
            IMPORT_SLEUTEL,
          );

        transactie.oncomplete =
          () => {
            resolve();
          };

        transactie.onerror =
          () => {
            reject(
              transactie.error ??
                new Error(
                  "De import kon niet lokaal worden bewaard.",
                ),
            );
          };

        transactie.onabort =
          () => {
            reject(
              transactie.error ??
                new Error(
                  "Het bewaren van de import werd afgebroken.",
                ),
            );
          };
      },
    );
  } finally {
    database.close();
  }
}

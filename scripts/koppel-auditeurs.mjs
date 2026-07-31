import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const toegestaneNamen = [
  "Ismail El Mourabet",
  "Koen De Boel",
  "Youssef Bechana",
  "Stef Dierckx",
  "Omer Ekinci",
  "Kimberly Velders",
  "Demis Casaert",
];

function sleutel(waarde) {
  return String(waarde ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase("nl-BE")
    .replace(/[^a-z0-9]/g, "");
}

const toegestaneSleutels =
  new Set(
    toegestaneNamen.map(sleutel),
  );

const uitvoeren =
  process.argv.includes(
    "--uitvoeren",
  );

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL ontbreekt.",
  );
}

const client =
  new Client({
    connectionString:
      process.env.DATABASE_URL,
  });

await client.connect();

try {
  const gebruikersResultaat =
    await client.query(`
      SELECT
        id,
        naam,
        voornaam,
        achternaam,
        rol::text AS rol
      FROM toegestane_gebruikers
      WHERE actief = true
        AND rol::text IN ('AUDITEUR', 'BEHEERDER')
      ORDER BY id
    `);

  const gebruikersPerSleutel =
    new Map();

  for (
    const gebruiker of
    gebruikersResultaat.rows
  ) {
    const volledigeNaam =
      [
        gebruiker.voornaam,
        gebruiker.achternaam,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      String(
        gebruiker.naam ?? "",
      ).trim();

    const naamSleutel =
      sleutel(volledigeNaam);

    if (
      !toegestaneSleutels.has(
        naamSleutel,
      )
    ) {
      continue;
    }

    const bestaande =
      gebruikersPerSleutel.get(
        naamSleutel,
      ) ?? [];

    bestaande.push({
      id: gebruiker.id,
      naam: volledigeNaam,
      rol: gebruiker.rol,
    });

    gebruikersPerSleutel.set(
      naamSleutel,
      bestaande,
    );
  }

  const dubbeleGebruikers =
    [
      ...gebruikersPerSleutel.entries(),
    ].filter(
      ([, gebruikers]) =>
        gebruikers.length !== 1,
    );

  if (
    dubbeleGebruikers.length >
    0
  ) {
    console.error(
      "Niet-unieke gebruikersnamen:",
    );

    for (
      const [
        naamSleutel,
        gebruikers,
      ] of dubbeleGebruikers
    ) {
      console.error(
        naamSleutel,
        gebruikers,
      );
    }

    throw new Error(
      "Koppeling gestopt wegens niet-unieke gebruikers.",
    );
  }

  const ontbrekendeGebruikers =
    toegestaneNamen.filter(
      (naam) =>
        !gebruikersPerSleutel.has(
          sleutel(naam),
        ),
    );

  console.log(
    "Gevonden gebruikers:",
  );

  for (
    const naam of
    toegestaneNamen
  ) {
    const gevonden =
      gebruikersPerSleutel.get(
        sleutel(naam),
      )?.[0];

    console.log(
      gevonden
        ? `  OK  ${naam} -> gebruiker ${gevonden.id} (${gevonden.rol})`
        : `  NIET GEVONDEN  ${naam}`,
    );
  }

  async function laadControles(
    tabel,
  ) {
    const resultaat =
      await client.query(`
        SELECT id, auditeur
        FROM ${tabel}
        WHERE auditeur IS NOT NULL
          AND BTRIM(auditeur) <> ''
          AND auditeur_gebruiker_id IS NULL
        ORDER BY id
      `);

    return resultaat.rows;
  }

  const deskcontroles =
    await laadControles(
      "deskcontroles",
    );

  const terreincontroles =
    await laadControles(
      "terreincontroles",
    );

  function planKoppelingen(
    controles,
  ) {
    const koppelingen = [];
    const nietHerkend =
      new Map();

    for (
      const controle of controles
    ) {
      const auditeurSleutel =
        sleutel(
          controle.auditeur,
        );

      const gebruiker =
        gebruikersPerSleutel.get(
          auditeurSleutel,
        )?.[0];

      if (
        gebruiker &&
        toegestaneSleutels.has(
          auditeurSleutel,
        )
      ) {
        koppelingen.push({
          controleId:
            controle.id,
          gebruikerId:
            gebruiker.id,
          auditeur:
            controle.auditeur,
          gebruikerNaam:
            gebruiker.naam,
        });
      } else {
        const naam =
          String(
            controle.auditeur,
          ).trim();

        nietHerkend.set(
          naam,
          (
            nietHerkend.get(
              naam,
            ) ?? 0
          ) + 1,
        );
      }
    }

    return {
      koppelingen,
      nietHerkend,
    };
  }

  const deskPlan =
    planKoppelingen(
      deskcontroles,
    );

  const terreinPlan =
    planKoppelingen(
      terreincontroles,
    );

  function toonPlan(
    titel,
    plan,
  ) {
    console.log(`\n${titel}:`);
    console.log(
      `  Te koppelen: ${plan.koppelingen.length}`,
    );

    if (
      plan.nietHerkend.size >
      0
    ) {
      console.log(
        "  Niet herkende namen:",
      );

      for (
        const [naam, aantal] of
        [
          ...plan.nietHerkend.entries(),
        ].sort()
      ) {
        console.log(
          `    ${naam}: ${aantal}`,
        );
      }
    }
  }

  toonPlan(
    "Deskcontroles",
    deskPlan,
  );

  toonPlan(
    "Terreincontroles",
    terreinPlan,
  );

  if (!uitvoeren) {
    console.log(
      "\nDroge controle: er is niets gewijzigd.",
    );

    console.log(
      "Gebruik --uitvoeren nadat de bovenstaande koppelingen correct zijn.",
    );

    if (
      ontbrekendeGebruikers.length >
      0
    ) {
      console.log(
        "\nNiet alle zeven gebruikers bestaan al. Alleen gevonden accounts kunnen gekoppeld worden.",
      );
    }

    process.exitCode = 0;
  } else {
    await client.query("BEGIN");

    try {
      for (
        const koppeling of
        deskPlan.koppelingen
      ) {
        await client.query(
          `
            UPDATE deskcontroles
            SET auditeur_gebruiker_id = $1
            WHERE id = $2
              AND auditeur_gebruiker_id IS NULL
          `,
          [
            koppeling.gebruikerId,
            koppeling.controleId,
          ],
        );
      }

      for (
        const koppeling of
        terreinPlan.koppelingen
      ) {
        await client.query(
          `
            UPDATE terreincontroles
            SET auditeur_gebruiker_id = $1
            WHERE id = $2
              AND auditeur_gebruiker_id IS NULL
          `,
          [
            koppeling.gebruikerId,
            koppeling.controleId,
          ],
        );
      }

      await client.query(
        "COMMIT",
      );

      console.log(
        `\nUitgevoerd: ${deskPlan.koppelingen.length} deskcontroles en ${terreinPlan.koppelingen.length} terreincontroles gekoppeld.`,
      );
    } catch (fout) {
      await client.query(
        "ROLLBACK",
      );

      throw fout;
    }
  }
} finally {
  await client.end();
}

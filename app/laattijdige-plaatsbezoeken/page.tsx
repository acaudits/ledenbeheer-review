import {
  LaattijdigePlaatsbezoekenTabel,
  type LaattijdigPlaatsbezoekRij,
} from "@/components/LaattijdigePlaatsbezoekenTabel";
import {
  PageHeader,
} from "@/components/PageHeader";
import {
  vereisMachtiging,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatteerDatum(
  datum: Date,
) {
  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(datum);
}

function formatteerTijd(
  tijd: Date,
) {
  return tijd
    .toISOString()
    .slice(11, 16);
}

function formatteerAanmelding(
  datum: Date,
) {
  return new Intl.DateTimeFormat(
    "nl-BE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Brussels",
    },
  ).format(datum);
}

function belgischMomentNaarUtc({
  datum,
  tijd,
}: {
  datum: Date;
  tijd: Date;
}) {
  const jaar =
    datum.getUTCFullYear();
  const maand =
    datum.getUTCMonth() + 1;
  const dag =
    datum.getUTCDate();
  const uur =
    tijd.getUTCHours();
  const minuut =
    tijd.getUTCMinutes();

  const gewenst = Date.UTC(
    jaar,
    maand - 1,
    dag,
    uur,
    minuut,
  );

  let kandidaat = gewenst;

  for (
    let poging = 0;
    poging < 3;
    poging += 1
  ) {
    const onderdelen =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Brussels",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        },
      ).formatToParts(
        new Date(kandidaat),
      );

    const waarden =
      Object.fromEntries(
        onderdelen.map(
          (onderdeel) => [
            onderdeel.type,
            onderdeel.value,
          ],
        ),
      );

    const weergegeven =
      Date.UTC(
        Number(waarden.year),
        Number(waarden.month) - 1,
        Number(waarden.day),
        Number(waarden.hour),
        Number(waarden.minute),
      );

    kandidaat +=
      gewenst - weergegeven;
  }

  return new Date(kandidaat);
}

export default async function LaattijdigePlaatsbezoekenPage() {
  await vereisMachtiging(
    "TERREINCONTROLES_BEKIJKEN",
  );

  const [tijdResultaat] =
    await prisma.$queryRaw<
      Array<{ nu: Date }>
    >`SELECT CURRENT_TIMESTAMP AS nu`;

  if (!tijdResultaat?.nu) {
    throw new Error(
      "De huidige databasetijd kon niet worden bepaald.",
    );
  }

  const referentieTijd =
    tijdResultaat.nu.getTime();

  const meldingen =
    await prisma
      .laattijdigePlaatsbezoekMelding
      .findMany({
        orderBy: {
          aangemeldOp: "desc",
        },
        include: {
          bezoeken: {
            orderBy: [
              {
                datumPlaatsbezoek:
                  "asc",
              },
              {
                tijdstip: "asc",
              },
            ],
          },
        },
      });

  const rijen:
    LaattijdigPlaatsbezoekRij[] =
    meldingen.flatMap(
      (melding) =>
        melding.bezoeken.map(
          (bezoek) => ({
            id: bezoek.id,
            startMomentIso:
              belgischMomentNaarUtc({
                datum:
                  bezoek.datumPlaatsbezoek,
                tijd:
                  bezoek.tijdstip,
              }).toISOString(),
            naamAdi:
              melding.naamAdi,
            bedrijfsnaam:
              melding.bedrijfsnaam,
            inspectielocatie:
              bezoek.inspectielocatie,
            latitude:
              bezoek.latitude === null
                ? null
                : Number(
                    bezoek.latitude,
                  ),
            longitude:
              bezoek.longitude === null
                ? null
                : Number(
                    bezoek.longitude,
                  ),
            datum:
              formatteerDatum(
                bezoek.datumPlaatsbezoek,
              ),
            tijdstip:
              formatteerTijd(
                bezoek.tijdstip,
              ),
            reden: bezoek.reden,
            gemeenschappelijkeDelen:
              bezoek
                .gemeenschappelijkeDelen
                ? "Ja"
                : "Nee",
            extraAdresdetails:
              bezoek
                .extraAdresdetails ??
              "",
            aangemeldOp:
              formatteerAanmelding(
                melding.aangemeldOp,
              ),
          }),
        ),
    );

  return (
    <div>
      <PageHeader
        compact
        titel="Laattijdige plaatsbezoeken"
        beschrijving={`${rijen.length} gemelde plaatsbezoeken in ${meldingen.length} meldingen`}
      />

      <LaattijdigePlaatsbezoekenTabel
        rijen={rijen}
        referentieTijd={
          referentieTijd
        }
      />
    </div>
  );
}

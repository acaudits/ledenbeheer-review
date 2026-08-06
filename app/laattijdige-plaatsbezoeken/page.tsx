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
      timeZone: "Europe/Brussels",
    },
  ).format(datum);
}

export default async function LaattijdigePlaatsbezoekenPage() {
  await vereisMachtiging(
    "TERREINCONTROLES_BEKIJKEN",
  );

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

  const rijen =
    meldingen.flatMap(
      (melding) =>
        melding.bezoeken.map(
          (bezoek) => ({
            id: bezoek.id,
            naamAdi:
              melding.naamAdi,
            bedrijfsnaam:
              melding.bedrijfsnaam,
            inspectielocatie:
              bezoek.inspectielocatie,
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
              bezoek.gemeenschappelijkeDelen
                ? "Ja"
                : "Nee",
            extraAdresdetails:
              bezoek.extraAdresdetails ?? "",
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rijen.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-black text-slate-900">
              Nog geen meldingen
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Er werden nog geen laattijdige
              plaatsbezoeken aangemeld.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    ADI
                  </th>
                  <th className="px-4 py-3">
                    Bedrijf
                  </th>
                  <th className="px-4 py-3">
                    Inspectielocatie
                  </th>
                  <th className="px-4 py-3">
                    Datum
                  </th>
                  <th className="px-4 py-3">
                    Tijdstip
                  </th>
                  <th className="px-4 py-3">
                    Gemeenschappelijke delen
                  </th>
                  <th className="px-4 py-3">
                    Extra adresdetails
                  </th>
                  <th className="px-4 py-3">
                    Reden
                  </th>
                  <th className="px-4 py-3">
                    Aangemeld op
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rijen.map(
                  (rij) => (
                    <tr
                      key={rij.id}
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {rij.naamAdi}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {rij.bedrijfsnaam}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {rij.inspectielocatie}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {rij.datum}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {rij.tijdstip}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {rij.gemeenschappelijkeDelen}
                      </td>
                      <td className="max-w-xs whitespace-pre-wrap px-4 py-4 text-slate-700">
                        {rij.extraAdresdetails || "—"}
                      </td>
                      <td className="max-w-md whitespace-pre-wrap px-4 py-4 text-slate-700">
                        {rij.reden}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {rij.aangemeldOp}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

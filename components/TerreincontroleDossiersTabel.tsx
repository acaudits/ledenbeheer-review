"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TerreincontroleDossierRij = {
  id: number;
  auditeur: string;
  naamAdi: string;
  linkAttest: string;
  attestnummer: string;
  status: string;
  certificatiePlatform: string;
  opmerkingen: string;
  datumControle: string;
  adres: string;
  persoonsId: string;
  bedrijfsnaam: string;
  ondernemingsnummer: string;
  persoonscertificaat: string;
  procescertificaat: string;
  attestId: string;
};

type Props = {
  rijen: TerreincontroleDossierRij[];
};

const kolommen: Array<{
  sleutel: keyof TerreincontroleDossierRij;
  label: string;
}> = [
  { sleutel: "auditeur", label: "Auditeur" },
  { sleutel: "naamAdi", label: "Naam ADI" },
  { sleutel: "linkAttest", label: "Link Attest" },
  { sleutel: "attestnummer", label: "Attestnummer" },
  { sleutel: "status", label: "Status" },
  {
    sleutel: "certificatiePlatform",
    label: "Certificatieplatform",
  },
  { sleutel: "opmerkingen", label: "Opmerkingen" },
  { sleutel: "datumControle", label: "Datum controle" },
  { sleutel: "adres", label: "Adres" },
  { sleutel: "persoonsId", label: "PersoonsID" },
  { sleutel: "bedrijfsnaam", label: "Bedrijfsnaam" },
  {
    sleutel: "ondernemingsnummer",
    label: "Ondernemingsnummer",
  },
  {
    sleutel: "persoonscertificaat",
    label: "Persoonscertificaat",
  },
  {
    sleutel: "procescertificaat",
    label: "Procescertificaat",
  },
  { sleutel: "attestId", label: "ID" },
];

function statusStijl(status: string) {
  if (status === "Afgerond") {
    return "bg-green-100 text-green-900";
  }

  if (status === "Geactualiseerd") {
    return "bg-emerald-100 text-emerald-900";
  }

  if (status === "In opmaak") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

export function TerreincontroleDossiersTabel({
  rijen,
}: Props) {
  const router = useRouter();
  const [zoekterm, setZoekterm] =
    useState("");

  const zichtbareRijen =
    useMemo(() => {
      const term = zoekterm
        .trim()
        .toLocaleLowerCase("nl-BE");

      if (!term) {
        return rijen;
      }

      return rijen.filter((rij) =>
        Object.values(rij)
          .join(" ")
          .toLocaleLowerCase("nl-BE")
          .includes(term),
      );
    }, [rijen, zoekterm]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <label className="block max-w-xl">
          <span className="text-sm font-semibold text-slate-700">
            Zoeken
          </span>

          <input
            value={zoekterm}
            onChange={(event) =>
              setZoekterm(
                event.target.value,
              )
            }
            placeholder="Zoek in alle kolommen..."
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {zichtbareRijen.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Geen terreincontroles gevonden.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[3300px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {kolommen.map((kolom) => (
                  <th
                    key={kolom.sleutel}
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-bold"
                  >
                    {kolom.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {zichtbareRijen.map((rij) => (
                <tr
                  key={rij.id}
                  tabIndex={0}
                  onClick={() =>
                    router.push(
                      `/terreincontroles/${rij.id}`,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      router.push(
                        `/terreincontroles/${rij.id}`,
                      );
                    }
                  }}
                  className="cursor-pointer border-b border-slate-100 align-top text-slate-700 transition hover:bg-emerald-50/60"
                >
                  {kolommen.map((kolom) => {
                    const waarde =
                      rij[kolom.sleutel];

                    if (
                      kolom.sleutel ===
                      "linkAttest"
                    ) {
                      return (
                        <td
                          key={kolom.sleutel}
                          className="max-w-72 px-4 py-3"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <a
                            href={String(waarde)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-emerald-700 underline"
                          >
                            Open attest
                          </a>
                        </td>
                      );
                    }

                    if (
                      kolom.sleutel ===
                      "certificatiePlatform" &&
                      waarde
                    ) {
                      return (
                        <td
                          key={kolom.sleutel}
                          className="max-w-72 px-4 py-3"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <a
                            href={String(waarde)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-emerald-700 underline"
                          >
                            Open platform
                          </a>
                        </td>
                      );
                    }

                    if (
                      kolom.sleutel ===
                      "status"
                    ) {
                      return (
                        <td
                          key={kolom.sleutel}
                          className="whitespace-nowrap px-4 py-3"
                        >
                          <span
                            className={`rounded-full px-3 py-1 font-bold ${statusStijl(
                              String(waarde),
                            )}`}
                          >
                            {waarde}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={kolom.sleutel}
                        className="max-w-80 whitespace-pre-wrap break-words px-4 py-3"
                      >
                        {waarde || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        {zichtbareRijen.length} van{" "}
        {rijen.length} terreincontroles
      </div>
    </section>
  );
}

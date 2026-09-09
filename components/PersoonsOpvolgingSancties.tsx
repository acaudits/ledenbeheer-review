import {
  ncCategorieLabel,
  opvolgingBronLabel,
} from "@/lib/opvolging-sancties";
import { prisma } from "@/lib/prisma";

function formatteerDatum(
  datum: Date | null,
) {
  if (!datum) {
    return "—";
  }

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

function toonTekst(
  waarde: string | null | undefined,
) {
  return waarde?.trim() || "—";
}

function doorgezetLabel(
  waarde: boolean | null,
) {
  if (waarde === true) {
    return "Ja";
  }

  if (waarde === false) {
    return "Nee";
  }

  return "Niet van toepassing";
}

function DetailWaarde({
  label,
  waarde,
  breed = false,
}: {
  label: string;
  waarde: string | number;
  breed?: boolean;
}) {
  return (
    <div
      className={
        breed
          ? "sm:col-span-2 lg:col-span-3"
          : ""
      }
    >
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
        {waarde}
      </dd>
    </div>
  );
}

export async function PersoonsOpvolgingSancties({
  lidId,
}: {
  lidId: number;
}) {
  /*
   * Eerst wordt uitsluitend het OVAM-ID van het reeds
   * toegankelijke persoonscertificaat opgehaald.
   * De browser ontvangt geen losse databasequery.
   */
  const lid = await prisma.lid.findFirst({
    where: {
      id: lidId,
      verwijderdOp: null,
    },
    select: {
      ovamId: true,
    },
  });

  if (!lid) {
    return null;
  }

  const registraties =
    await prisma.opvolgingSanctie.findMany({
      where: {
        verwijderdOp: null,
        ovamId: {
          equals: lid.ovamId,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        bronType: true,
        opvolgingAfgerond: true,
        datumAfgerond: true,
        attestnummer: true,
        reden: true,
        datumVaststelling: true,
        opmerkingen: true,
        ncCategorie: true,
        sanctieBegindatum: true,
        sanctieEinddatum: true,
        sanctieDoorgezet: true,
        redenNietDoorzetten: true,
        aangemaaktOp: true,
      },
      orderBy: [
        {
          opvolgingAfgerond: "asc",
        },
        {
          datumVaststelling: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  const aantalOpen =
    registraties.filter(
      (registratie) =>
        !registratie.opvolgingAfgerond,
    ).length;

  const aantalAfgerond =
    registraties.length - aantalOpen;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <dl className="grid grid-cols-3 gap-2">
            <div className="min-w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Totaal
              </dt>

              <dd className="mt-1 text-xl font-black text-slate-950">
                {registraties.length}
              </dd>
            </div>

            <div
              className={`min-w-24 rounded-xl border px-3 py-2 text-center ${
                aantalOpen > 0
                  ? "border-[#92400e] bg-[#fff7ed]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <dt
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  aantalOpen > 0
                    ? "text-[#78350f]"
                    : "text-slate-500"
                }`}
              >
                Open
              </dt>

              <dd
                className={`mt-1 text-xl font-black ${
                  aantalOpen > 0
                    ? "text-[#451a03]"
                    : "text-slate-950"
                }`}
              >
                {aantalOpen}
              </dd>
            </div>

            <div className="min-w-24 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Afgerond
              </dt>

              <dd className="mt-1 text-xl font-black text-emerald-950">
                {aantalAfgerond}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {registraties.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-7">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
            ✓
          </div>

          <h3 className="mt-3 font-bold text-slate-900">
            Geen opvolging of sanctie
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Voor dit OVAM-ID zijn geen actieve registraties
            voor opvolging of sancties gevonden.
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-3 sm:p-4">
          {registraties.map(
            (registratie) => {
              const open =
                !registratie.opvolgingAfgerond;

              return (
                <details
                  key={registratie.id}
                  className={`group overflow-hidden rounded-2xl border transition ${
                    open
                      ? "border-[#d6a46f] bg-[#fffaf5]"
                      : "border-emerald-200 bg-emerald-50/60"
                  }`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            open
                              ? "border-[#92400e] bg-[#f5e6d3] text-[#78350f]"
                              : "border-emerald-200 bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {open
                            ? "In opvolging"
                            : "Afgerond"}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {opvolgingBronLabel(
                            registratie.bronType,
                          )}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {ncCategorieLabel(
                            registratie.ncCategorie,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 truncate text-sm font-bold text-slate-950">
                        {toonTekst(
                          registratie.attestnummer,
                        ) !== "—"
                          ? `Attest ${registratie.attestnummer}`
                          : `Registratie ${registratie.id}`}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Vastgesteld op{" "}
                        {formatteerDatum(
                          registratie.datumVaststelling,
                        )}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 transition group-open:rotate-180"
                    >
                      ↓
                    </span>
                  </summary>

                  <div
                    className={`border-t px-4 py-4 sm:px-5 ${
                      open
                        ? "border-[#ead1b5] bg-white/70"
                        : "border-emerald-200 bg-white/70"
                    }`}
                  >
                    <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailWaarde
                        label="Bron"
                        waarde={opvolgingBronLabel(
                          registratie.bronType,
                        )}
                      />

                      <DetailWaarde
                        label="Opvolging afgerond"
                        waarde={
                          registratie.opvolgingAfgerond
                            ? "Ja"
                            : "Nee"
                        }
                      />

                      <DetailWaarde
                        label="Datum afgerond"
                        waarde={formatteerDatum(
                          registratie.datumAfgerond,
                        )}
                      />

                      <DetailWaarde
                        label="Datum vaststelling"
                        waarde={formatteerDatum(
                          registratie.datumVaststelling,
                        )}
                      />

                      <DetailWaarde
                        label="NC-categorie"
                        waarde={ncCategorieLabel(
                          registratie.ncCategorie,
                        )}
                      />

                      <DetailWaarde
                        label="Sanctie doorgezet"
                        waarde={doorgezetLabel(
                          registratie.sanctieDoorgezet,
                        )}
                      />

                      <DetailWaarde
                        label="Sanctie begindatum"
                        waarde={formatteerDatum(
                          registratie.sanctieBegindatum,
                        )}
                      />

                      <DetailWaarde
                        label="Sanctie einddatum"
                        waarde={formatteerDatum(
                          registratie.sanctieEinddatum,
                        )}
                      />

                      <DetailWaarde
                        label="Aangemaakt"
                        waarde={formatteerDatum(
                          registratie.aangemaaktOp,
                        )}
                      />

                      <DetailWaarde
                        label="Reden"
                        waarde={toonTekst(
                          registratie.reden,
                        )}
                        breed
                      />

                      <DetailWaarde
                        label="Opmerkingen"
                        waarde={toonTekst(
                          registratie.opmerkingen,
                        )}
                        breed
                      />

                      {registratie.sanctieDoorgezet ===
                      false ? (
                        <DetailWaarde
                          label="Reden niet doorzetten"
                          waarde={toonTekst(
                            registratie.redenNietDoorzetten,
                          )}
                          breed
                        />
                      ) : null}
                    </dl>
                  </div>
                </details>
              );
            },
          )}
        </div>
      )}

      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500 sm:px-7">
        {registraties.length}{" "}
        {registraties.length === 1
          ? "gekoppelde registratie"
          : "gekoppelde registraties"}
        , waarvan {aantalOpen}{" "}
        {aantalOpen === 1
          ? "open opvolging"
          : "open opvolgingen"}.
      </footer>
    </section>
  );
}

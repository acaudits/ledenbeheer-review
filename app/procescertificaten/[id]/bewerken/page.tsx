import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  notFound,
  redirect,
} from "next/navigation";
import { vereisIngelogdeGebruiker } from "@/lib/auth";
import {
  isGeldigOndernemingsnummer,
  normaliseerOndernemingsnummer,
  ondernemingsnummerFoutmelding,
} from "@/lib/ondernemingsnummer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PaginaProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    fout?: string;
  }>;
};

function tekst(
  formData: FormData,
  naam: string,
) {
  return String(
    formData.get(naam) ?? "",
  ).trim();
}

function optioneleTekst(
  formData: FormData,
  naam: string,
) {
  return (
    tekst(formData, naam) || null
  );
}

function datumVoorInput(
  datum: Date | null,
) {
  return datum
    ? datum.toISOString().slice(0, 10)
    : "";
}

function leesDatum(
  waarde: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      waarde,
    )
  ) {
    return null;
  }

  const datum = new Date(
    `${waarde}T00:00:00.000Z`,
  );

  return datum
    .toISOString()
    .slice(0, 10) === waarde
    ? datum
    : null;
}

export default async function BewerkProcescertificaatPage({
  params,
  searchParams,
}: PaginaProps) {
  await vereisIngelogdeGebruiker();

  const { id: idTekst } =
    await params;

  const parameters =
    await searchParams;

  const id = Number(idTekst);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  const certificaat =
    await prisma.procescertificaat.findUnique(
      {
        where: {
          id,
        },
      },
    );

  if (!certificaat) {
    notFound();
  }

  async function opslaan(
    formData: FormData,
  ) {
    "use server";

    await vereisIngelogdeGebruiker();

    const naamBedrijf = tekst(
      formData,
      "naamBedrijf",
    );

    const kboNummer =
      normaliseerOndernemingsnummer(
        tekst(
          formData,
          "kboNummer",
        ),
      );

    const certificaatnummer = tekst(
      formData,
      "certificaatnummer",
    ).toUpperCase();

    const datumWaarde = tekst(
      formData,
      "uitgereiktOp",
    );

    const oneDrive =
      optioneleTekst(
        formData,
        "oneDrive",
      );

    const opmerking =
      optioneleTekst(
        formData,
        "opmerking",
      );

    const ondernemingstypeWaarde =
      tekst(
        formData,
        "ondernemingstype",
      );

    const foutUrl = (
      melding: string,
    ) =>
      `/procescertificaten/${id}/bewerken?fout=${encodeURIComponent(
        melding,
      )}`;

    if (
      !naamBedrijf ||
      !kboNummer ||
      !certificaatnummer
    ) {
      redirect(
        foutUrl(
          "Vul alle verplichte velden in.",
        ),
      );
    }

    if (
      !isGeldigOndernemingsnummer(
        kboNummer,
      )
    ) {
      redirect(
        foutUrl(
          ondernemingsnummerFoutmelding(),
        ),
      );
    }

    if (
      ondernemingstypeWaarde !==
        "EENMANSZAAK" &&
      ondernemingstypeWaarde !==
        "BEDRIJF"
    ) {
      redirect(
        foutUrl(
          "Kies eenmanszaak of bedrijf.",
        ),
      );
    }

    if (oneDrive) {
      try {
        const url =
          new URL(oneDrive);

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          throw new Error(
            "Ongeldig protocol",
          );
        }
      } catch {
        redirect(
          foutUrl(
            "Vul een geldige OneDrive-URL in.",
          ),
        );
      }
    }

    let uitgereiktOp:
      Date | null = null;

    if (datumWaarde) {
      uitgereiktOp =
        leesDatum(datumWaarde);

      if (!uitgereiktOp) {
        redirect(
          foutUrl(
            "Vul een geldige uitgiftedatum in.",
          ),
        );
      }
    }

    const dubbel =
      await prisma.procescertificaat.findFirst(
        {
          where: {
            id: {
              not: id,
            },
            OR: [
              {
                kboNummer,
              },
              {
                certificaatnummer,
              },
            ],
          },
          select: {
            kboNummer: true,
            certificaatnummer: true,
          },
        },
      );

    if (
      dubbel?.kboNummer ===
      kboNummer
    ) {
      redirect(
        foutUrl(
          "Dit ondernemingsnummer bestaat al.",
        ),
      );
    }

    if (
      dubbel?.certificaatnummer ===
      certificaatnummer
    ) {
      redirect(
        foutUrl(
          "Dit certificaatnummer bestaat al.",
        ),
      );
    }

    try {
      await prisma.procescertificaat.update(
        {
          where: {
            id,
          },
          data: {
            naamBedrijf,
            kboNummer,
            certificaatnummer,
            uitgereiktOp,
            oneDrive,
            opmerking,
            ondernemingstype:
              ondernemingstypeWaarde,
          },
        },
      );
    } catch (fout) {
      if (
        typeof fout === "object" &&
        fout !== null &&
        "code" in fout &&
        fout.code === "P2002"
      ) {
        redirect(
          foutUrl(
            "Het ondernemingsnummer of certificaatnummer bestaat al.",
          ),
        );
      }

      console.error(
        "Procescertificaat wijzigen mislukt:",
        fout,
      );

      redirect(
        foutUrl(
          "Er is een technische fout opgetreden.",
        ),
      );
    }

    revalidatePath("/");
    revalidatePath(
      "/procescertificaten",
    );
    revalidatePath(
      `/procescertificaten/${id}/bewerken`,
    );
    revalidatePath(
      "/deskcontroles",
    );

    redirect(
      "/procescertificaten",
    );
  }

  const invoerStijl =
    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";

  const labelStijl =
    "block text-sm font-semibold text-slate-700";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/procescertificaten"
        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
      >
        ← Terug naar
        procescertificaten
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-100">
            Procescertificaten
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Procescertificaat
            bewerken
          </h1>

          <p className="mt-2 text-emerald-100">
            Pas de gegevens van{" "}
            {certificaat.naamBedrijf}{" "}
            aan.
          </p>
        </div>

        <form
          action={opslaan}
          className="space-y-8 p-6 sm:p-8"
        >
          {parameters.fout ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {parameters.fout}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="naamBedrijf"
                className={labelStijl}
              >
                Bedrijf *
              </label>

              <input
                id="naamBedrijf"
                name="naamBedrijf"
                required
                defaultValue={
                  certificaat.naamBedrijf
                }
                className={invoerStijl}
              />
            </div>

            <div>
              <label
                htmlFor="kboNummer"
                className={labelStijl}
              >
                Ondernemingsnummer /
                EU-btw-nummer *
              </label>

              <input
                id="kboNummer"
                name="kboNummer"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={20}
                placeholder="0803487622 of NL004737565B84"
                required
                defaultValue={
                  certificaat.kboNummer
                }
                className={invoerStijl}
              />
            </div>

            <div>
              <label
                htmlFor="certificaatnummer"
                className={labelStijl}
              >
                Certificaatnummer *
              </label>

              <input
                id="certificaatnummer"
                name="certificaatnummer"
                required
                autoCapitalize="characters"
                defaultValue={
                  certificaat.certificaatnummer
                }
                className={invoerStijl}
              />
            </div>

            <div>
              <label
                htmlFor="uitgereiktOp"
                className={labelStijl}
              >
                Uitgereikt op
              </label>

              <input
                id="uitgereiktOp"
                name="uitgereiktOp"
                type="date"
                defaultValue={datumVoorInput(
                  certificaat.uitgereiktOp,
                )}
                className={invoerStijl}
              />
            </div>

            <div>
              <label
                htmlFor="oneDrive"
                className={labelStijl}
              >
                OneDrive-URL
              </label>

              <input
                id="oneDrive"
                name="oneDrive"
                type="url"
                defaultValue={
                  certificaat.oneDrive ??
                  ""
                }
                className={invoerStijl}
              />
            </div>

            <div className="md:col-span-2">
              <span
                className={labelStijl}
              >
                Type onderneming *
              </span>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="rounded-xl border border-slate-300 p-4">
                  <input
                    type="radio"
                    name="ondernemingstype"
                    value="EENMANSZAAK"
                    required
                    defaultChecked={
                      certificaat.ondernemingstype ===
                      "EENMANSZAAK"
                    }
                    className="mr-3 accent-emerald-700"
                  />
                  Eenmanszaak
                </label>

                <label className="rounded-xl border border-slate-300 p-4">
                  <input
                    type="radio"
                    name="ondernemingstype"
                    value="BEDRIJF"
                    required
                    defaultChecked={
                      certificaat.ondernemingstype ===
                      "BEDRIJF"
                    }
                    className="mr-3 accent-emerald-700"
                  />
                  Bedrijf
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="opmerking"
                className={labelStijl}
              >
                Opmerking
              </label>

              <textarea
                id="opmerking"
                name="opmerking"
                rows={5}
                maxLength={5000}
                defaultValue={
                  certificaat.opmerking ??
                  ""
                }
                className={invoerStijl}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/procescertificaten"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Annuleren
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              Wijzigingen opslaan
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

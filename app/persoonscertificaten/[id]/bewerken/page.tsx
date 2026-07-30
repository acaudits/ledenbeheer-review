import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { vereisMachtiging } from "@/lib/auth";
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

function tekst(formData: FormData, naam: string) {
  return String(formData.get(naam) ?? "").trim();
}

function optioneleTekst(formData: FormData, naam: string) {
  return tekst(formData, naam) || null;
}

function datumVoorInput(datum: Date | null) {
  return datum ? datum.toISOString().slice(0, 10) : "";
}

export default async function BewerkPersoonscertificaatPage({
  params,
  searchParams,
}: PaginaProps) {
  await vereisMachtiging("CERTIFICATEN_BEHEREN");

  const { id: idTekst } = await params;
  const parameters = await searchParams;
  const id = Number(idTekst);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [lid, bedrijfsResultaten] = await Promise.all([
    prisma.lid.findUnique({
      where: {
        id,
      },
    }),
    prisma.procescertificaat.findMany({
      select: {
        naamBedrijf: true,
      },
      orderBy: {
        naamBedrijf: "asc",
      },
    }),
  ]);

  if (!lid) {
    notFound();
  }

  const bedrijven = Array.from(
    new Set(
      bedrijfsResultaten
        .map((resultaat) => resultaat.naamBedrijf.trim())
        .filter(Boolean),
    ),
  );

  async function opslaan(formData: FormData) {
    "use server";

    await vereisMachtiging("CERTIFICATEN_BEHEREN");

    const naamPersoon = tekst(formData, "naamPersoon");
    const telefoonnummer = optioneleTekst(
      formData,
      "telefoonnummer",
    );
    const mailadres =
      optioneleTekst(formData, "mailadres")?.toLowerCase() ?? null;
    const ovamId = tekst(formData, "ovamId").toUpperCase();
    const certificaatnummer = tekst(
      formData,
      "certificaatnummer",
    ).toUpperCase();
    const datumWaarde = tekst(formData, "uitgereiktOp");
    const bedrijf = optioneleTekst(formData, "bedrijf");
    const aansluiting = optioneleTekst(formData, "aansluiting");
    const opmerking = optioneleTekst(formData, "opmerking");
    const certificatiePlatform = optioneleTekst(
      formData,
      "certificatiePlatform",
    );

    if (!naamPersoon || !ovamId || !certificaatnummer) {
      redirect(
        `/persoonscertificaten/${id}/bewerken?fout=${encodeURIComponent(
          "Naam, OVAM-ID en certificaatnummer zijn verplicht.",
        )}`,
      );
    }

    if (
      mailadres &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailadres)
    ) {
      redirect(
        `/persoonscertificaten/${id}/bewerken?fout=${encodeURIComponent(
          "Vul een geldig e-mailadres in.",
        )}`,
      );
    }

    if (certificatiePlatform) {
      try {
        const url = new URL(certificatiePlatform);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Ongeldig protocol");
        }
      } catch {
        redirect(
          `/persoonscertificaten/${id}/bewerken?fout=${encodeURIComponent(
            "Vul een geldige certificatieplatform-URL in.",
          )}`,
        );
      }
    }

    const dubbel = await prisma.lid.findFirst({
      where: {
        id: {
          not: id,
        },
        OR: [
          {
            ovamId,
          },
          {
            certificaatnummer,
          },
        ],
      },
      select: {
        ovamId: true,
        certificaatnummer: true,
      },
    });

    if (dubbel?.ovamId === ovamId) {
      redirect(
        `/persoonscertificaten/${id}/bewerken?fout=${encodeURIComponent(
          "Dit OVAM-ID bestaat al.",
        )}`,
      );
    }

    if (dubbel?.certificaatnummer === certificaatnummer) {
      redirect(
        `/persoonscertificaten/${id}/bewerken?fout=${encodeURIComponent(
          "Dit certificaatnummer bestaat al.",
        )}`,
      );
    }

    const uitgereiktOp = datumWaarde
      ? new Date(`${datumWaarde}T00:00:00.000Z`)
      : null;

    await prisma.lid.update({
      where: {
        id,
      },
      data: {
        naamPersoon,
        telefoonnummer,
        mailadres,
        ovamId,
        certificaatnummer,
        uitgereiktOp,
        bedrijf,
        aansluiting,
        opmerking,
        certificatiePlatform,
      },
    });

    revalidatePath("/");
    revalidatePath("/persoonscertificaten");

    redirect("/persoonscertificaten");
  }

  const invoerStijl =
    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";

  const labelStijl = "block text-sm font-semibold text-slate-700";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/persoonscertificaten"
        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
      >
        ← Terug naar persoonscertificaten
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#073c34] to-emerald-700 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-100">
            Persoonscertificaten
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Persoonscertificaat bewerken
          </h1>
          <p className="mt-2 text-emerald-100">
            Pas de gegevens van {lid.naamPersoon} aan.
          </p>
        </div>

        <form action={opslaan} className="space-y-8 p-6 sm:p-8">
          {parameters.fout && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {parameters.fout}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="naamPersoon" className={labelStijl}>
                Naam persoon *
              </label>
              <input
                id="naamPersoon"
                name="naamPersoon"
                required
                defaultValue={lid.naamPersoon}
                className={invoerStijl}
              />
            </div>

            <div>
              <label htmlFor="telefoonnummer" className={labelStijl}>
                Telefoonnummer
              </label>
              <input
                id="telefoonnummer"
                name="telefoonnummer"
                type="tel"
                defaultValue={lid.telefoonnummer ?? ""}
                className={invoerStijl}
              />
            </div>

            <div>
              <label htmlFor="mailadres" className={labelStijl}>
                Mailadres
              </label>
              <input
                id="mailadres"
                name="mailadres"
                type="email"
                defaultValue={lid.mailadres ?? ""}
                className={invoerStijl}
              />
            </div>

            <div>
              <label htmlFor="ovamId" className={labelStijl}>
                OVAM-ID *
              </label>
              <input
                id="ovamId"
                name="ovamId"
                required
                defaultValue={lid.ovamId}
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
                defaultValue={lid.certificaatnummer}
                className={invoerStijl}
              />
            </div>

            <div>
              <label htmlFor="uitgereiktOp" className={labelStijl}>
                Uitgereikt op
              </label>
              <input
                id="uitgereiktOp"
                name="uitgereiktOp"
                type="date"
                defaultValue={datumVoorInput(lid.uitgereiktOp)}
                className={invoerStijl}
              />
            </div>

            <div>
              <label htmlFor="bedrijf" className={labelStijl}>
                Bedrijf
              </label>
              <input
                id="bedrijf"
                name="bedrijf"
                list="bedrijven-lijst"
                autoComplete="off"
                defaultValue={lid.bedrijf ?? ""}
                className={invoerStijl}
              />
              <datalist id="bedrijven-lijst">
                {bedrijven.map((bedrijf) => (
                  <option key={bedrijf} value={bedrijf} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="aansluiting" className={labelStijl}>
                Aansluiting
              </label>
              <input
                id="aansluiting"
                name="aansluiting"
                defaultValue={lid.aansluiting ?? ""}
                className={invoerStijl}
              />
            </div>

            <div>
              <label
                htmlFor="certificatiePlatform"
                className={labelStijl}
              >
                Certificatieplatform
              </label>
              <input
                id="certificatiePlatform"
                name="certificatiePlatform"
                type="url"
                defaultValue={lid.certificatiePlatform ?? ""}
                className={invoerStijl}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="opmerking" className={labelStijl}>
                Opmerking
              </label>
              <textarea
                id="opmerking"
                name="opmerking"
                rows={5}
                defaultValue={lid.opmerking ?? ""}
                className={invoerStijl}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/persoonscertificaten"
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

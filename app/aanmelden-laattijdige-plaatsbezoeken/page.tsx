import Image from "next/image";

import {
  LaattijdigePlaatsbezoekenFormulier,
} from "@/components/LaattijdigePlaatsbezoekenFormulier";

export const metadata = {
  title:
    "Laattijdig of gewijzigd plaatsbezoek melden",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AanmeldenLaattijdigePlaatsbezoekenPage() {
  return (
    <main className="min-h-screen bg-[#f4f8f7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 text-center">
          <Image
            src="/skh-logo.svg"
            alt="SKH"
            width={150}
            height={72}
            priority
            className="mx-auto h-auto w-36"
          />

          <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Laattijdig of gewijzigd plaatsbezoek melden
          </h1>

          <div className="mx-auto mt-5 max-w-3xl space-y-5 text-left text-sm leading-6 text-slate-700 sm:text-base">
            <section>
              <h2 className="font-bold text-slate-950">
                Gebruik het onderstaande formulier wanneer:
              </h2>

              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>
                  u een plaatsbezoek niet minstens 24 uur vóór de geplande aanvang in de OVAM-databank hebt kunnen registreren; of
                </li>

                <li>
                  de gegevens van een reeds aangemeld plaatsbezoek minder dan 24 uur vóór de geplande aanvang zijn gewijzigd.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-slate-950">
                Wat moet u doen?
              </h2>

              <ol className="mt-2 list-decimal space-y-2 pl-6">
                <li>
                  Registreer het plaatsbezoek of corrigeer de gegevens in de OVAM-databank.
                </li>

                <li>
                  Meld de laattijdige aanmelding of wijziging via het onderstaande formulier aan de CI.
                </li>
              </ol>
            </section>

            <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <p>
                <strong>Opgelet:</strong>{" "}
                Het niet of niet tijdig melden van een plaatsbezoek wordt beschouwd als een categorie III-non-conformiteit en kan aanleiding geven tot een voorwaardelijke opheffing van uw persoonscertificaat.
              </p>
            </aside>
          </div>
        </header>

        <LaattijdigePlaatsbezoekenFormulier />
      </div>
    </main>
  );
}

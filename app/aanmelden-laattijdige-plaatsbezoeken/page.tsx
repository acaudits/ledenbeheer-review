import Image from "next/image";

import {
  LaattijdigePlaatsbezoekenFormulier,
} from "@/components/LaattijdigePlaatsbezoekenFormulier";

export const metadata = {
  title:
    "Aanmelden laattijdige plaatsbezoeken",
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
            Aanmelden laattijdige
            plaatsbezoeken
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Meld hier één of meerdere
            plaatsbezoeken die niet tijdig werden
            aangemeld. Vul de geplande datum,
            het tijdstip en de reden van de
            laattijdige melding in.
          </p>
        </header>

        <LaattijdigePlaatsbezoekenFormulier />
      </div>
    </main>
  );
}

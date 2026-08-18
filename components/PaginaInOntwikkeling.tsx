import { PageHeader } from "@/components/PageHeader";

type PaginaInOntwikkelingProps = {
  titel: string;
};

export function PaginaInOntwikkeling({
  titel,
}: PaginaInOntwikkelingProps) {
  return (
    <div className="space-y-4">
      <PageHeader
        titel={titel}
        beschrijving="Deze module wordt momenteel voorbereid."
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            In ontwikkeling
          </p>

          <h2 className="mt-3 text-2xl font-bold text-slate-950">
            Deze pagina is nog in ontwikkeling
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            De inhoud en functionaliteiten van deze module worden later
            toegevoegd.
          </p>
        </div>
      </section>
    </div>
  );
}

import {
  BeheerActieLink,
  BeheerOverzichtHeader,
} from "@/components/BeheerOverzichtHeader";

import {
  NaFinalisatieTabel,
  type NaFinalisatieRij,
} from "@/components/NaFinalisatieTabel";
import {
  vereisMachtiging,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export default async function VerwijderdeNaFinalisatiePage() {
  await vereisMachtiging(
    "TERREINCONTROLES_BEHEREN",
  );

  const registraties =
    await prisma.naFinalisatie.findMany({
      where: {
        verwijderdOp: {
          not: null,
        },
      },
      orderBy: [
        {
          verwijderdOp: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  const rijen:
    NaFinalisatieRij[] =
    registraties.map(
      (registratie) => ({
        id: registratie.id,
        auditeur:
          registratie.auditeur,
        naamAdi:
          registratie.naamAdi,
        geregistreerd:
          registratie.geregistreerd,
        linkAttest:
          registratie.linkAttest,
        attestnummer:
          registratie.attestnummer,
        datumNaFinalisatie:
          registratie.datumNaFinalisatie.toISOString(),
        plaatsbezoek:
          registratie.plaatsbezoek,
        typeControle:
          registratie.typeControle,
        reden:
          registratie.reden,
        opmerking:
          registratie.opmerking,
        inspectielocatie:
          registratie.inspectielocatie,
        naamBedrijf:
          registratie.naamBedrijf,
        persoonsId:
          registratie.persoonsId,
        attestId:
          registratie.attestId,
        verwijderdOp:
          registratie.verwijderdOp?.toISOString() ??
          null,
      }),
    );

  return (
    <div className="space-y-4">
      <BeheerOverzichtHeader
        bovenTitel="Controlebeheer"
        titel="Verwijderde registraties"
        omschrijving={
          <>
            {registraties.length}{" "}
            {registraties.length === 1
              ? "verwijderde registratie"
              : "verwijderde registraties"}
          </>
        }
        acties={
          <BeheerActieLink
            href="/na-finalisatie"
            variant="neutraal"
            kinderen="← Terug naar Na finalisatie"
          />
        }
      />

      <div className="rounded-2xl ring-1 ring-slate-200">
        <NaFinalisatieTabel
          rijen={rijen}
          magBeheren
          verwijderd
        />
      </div>
    </div>
  );
}

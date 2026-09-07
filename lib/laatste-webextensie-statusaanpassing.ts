import "server-only";

import {
  prisma,
} from "@/lib/prisma";

export type Statusoverzicht =
  | "DESKCONTROLE"
  | "TERREINCONTROLE";

const ACTIE_PER_OVERZICHT:
  Record<Statusoverzicht, string> = {
    DESKCONTROLE:
      "DESKCONTROLES_STATUSSYNCHRONISATIE_WEBEXTENSIE",
    TERREINCONTROLE:
      "TERREINCONTROLES_STATUSSYNCHRONISATIE_WEBEXTENSIE",
  };

export async function haalLaatsteWebextensieStatusaanpassing(
  overzicht: Statusoverzicht,
) {
  const laatsteAuditregel =
    await prisma.auditlog.findFirst({
      where: {
        actie:
          ACTIE_PER_OVERZICHT[
            overzicht
          ],
      },
      orderBy: [
        {
          aangemaaktOp: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        aangemaaktOp: true,
      },
    });

  return (
    laatsteAuditregel
      ?.aangemaaktOp ?? null
  );
}

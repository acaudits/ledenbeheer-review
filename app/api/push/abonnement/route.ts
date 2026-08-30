import {
  NextResponse,
} from "next/server";

import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  prisma,
} from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PushAbonnementInvoer = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function magPushOntvangen(
  rollen: readonly string[],
) {
  return (
    rollen.includes(
      "BEHEERDER",
    ) ||
    rollen.includes(
      "AUDITEUR",
    )
  );
}

function isZelfdeHerkomst(
  verzoek: Request,
) {
  const herkomst =
    verzoek.headers.get("origin");

  if (!herkomst) {
    return false;
  }

  return (
    herkomst ===
    new URL(verzoek.url).origin
  );
}

function isToegelatenPushEndpoint(
  endpoint: string,
) {
  try {
    const url = new URL(endpoint);

    if (url.protocol !== "https:") {
      return false;
    }

    const host =
      url.hostname.toLowerCase();

    return (
      host === "fcm.googleapis.com" ||
      host.endsWith(".googleapis.com") ||
      host ===
        "updates.push.services.mozilla.com" ||
      host.endsWith(
        ".push.services.mozilla.com",
      ) ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(
        ".notify.windows.com",
      )
    );
  } catch {
    return false;
  }
}

async function haalBevoegdeGebruikerOp() {
  const gebruiker =
    await haalIngelogdeGebruikerOp();

  if (
    !gebruiker?.actief ||
    !magPushOntvangen(
      gebruiker.rollen,
    )
  ) {
    return null;
  }

  return gebruiker;
}

export async function POST(
  verzoek: Request,
) {
  if (!isZelfdeHerkomst(verzoek)) {
    return NextResponse.json(
      {
        fout: "Ongeldige herkomst.",
      },
      {
        status: 403,
      },
    );
  }

  const gebruiker =
    await haalBevoegdeGebruikerOp();

  if (!gebruiker) {
    return NextResponse.json(
      {
        fout:
          "Je hebt geen toegang tot pushmeldingen.",
      },
      {
        status: 403,
      },
    );
  }

  let invoer: PushAbonnementInvoer;

  try {
    invoer =
      (await verzoek.json()) as
        PushAbonnementInvoer;
  } catch {
    return NextResponse.json(
      {
        fout:
          "Het abonnement is ongeldig.",
      },
      {
        status: 400,
      },
    );
  }

  const endpoint =
    typeof invoer.endpoint ===
    "string"
      ? invoer.endpoint.trim()
      : "";

  const p256dh =
    typeof invoer.keys?.p256dh ===
    "string"
      ? invoer.keys.p256dh.trim()
      : "";

  const auth =
    typeof invoer.keys?.auth ===
    "string"
      ? invoer.keys.auth.trim()
      : "";

  if (
    !endpoint ||
    endpoint.length > 2048 ||
    !p256dh ||
    p256dh.length > 255 ||
    !auth ||
    auth.length > 255 ||
    !isToegelatenPushEndpoint(
      endpoint,
    )
  ) {
    return NextResponse.json(
      {
        fout:
          "Het pushabonnement bevat ongeldige gegevens.",
      },
      {
        status: 400,
      },
    );
  }

  const userAgent =
    verzoek.headers
      .get("user-agent")
      ?.slice(0, 500) ?? null;

  await prisma.pushAbonnement.upsert({
    where: {
      endpoint,
    },
    create: {
      gebruikerId: gebruiker.id,
      endpoint,
      p256dh,
      auth,
      userAgent,
    },
    update: {
      gebruikerId: gebruiker.id,
      p256dh,
      auth,
      userAgent,
    },
  });

  return NextResponse.json({
    succes: true,
  });
}

export async function DELETE(
  verzoek: Request,
) {
  if (!isZelfdeHerkomst(verzoek)) {
    return NextResponse.json(
      {
        fout: "Ongeldige herkomst.",
      },
      {
        status: 403,
      },
    );
  }

  const gebruiker =
    await haalBevoegdeGebruikerOp();

  if (!gebruiker) {
    return NextResponse.json(
      {
        fout:
          "Je hebt geen toegang tot pushmeldingen.",
      },
      {
        status: 403,
      },
    );
  }

  let invoer: {
    endpoint?: unknown;
  };

  try {
    invoer =
      (await verzoek.json()) as {
        endpoint?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        fout:
          "Het abonnement is ongeldig.",
      },
      {
        status: 400,
      },
    );
  }

  const endpoint =
    typeof invoer.endpoint ===
    "string"
      ? invoer.endpoint.trim()
      : "";

  if (!endpoint) {
    return NextResponse.json(
      {
        fout:
          "Het endpoint ontbreekt.",
      },
      {
        status: 400,
      },
    );
  }

  await prisma.pushAbonnement.deleteMany({
    where: {
      gebruikerId: gebruiker.id,
      endpoint,
    },
  });

  return NextResponse.json({
    succes: true,
  });
}

import webpush from "web-push";
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

function isZelfdeHerkomst(
  verzoek: Request,
) {
  const herkomst =
    verzoek.headers.get("origin");

  return (
    Boolean(herkomst) &&
    herkomst ===
      new URL(verzoek.url).origin
  );
}

function foutstatus(
  fout: unknown,
) {
  if (
    typeof fout === "object" &&
    fout !== null &&
    "statusCode" in fout &&
    typeof fout.statusCode ===
      "number"
  ) {
    return fout.statusCode;
  }

  return null;
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
    await haalIngelogdeGebruikerOp();

  if (
    !gebruiker?.actief ||
    (
      !gebruiker.rollen.includes("BEHEERDER") &&
      !gebruiker.rollen.includes("AUDITEUR")
    )
  ) {
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

  const publiekeSleutel =
    process.env
      .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const privateSleutel =
    process.env.VAPID_PRIVATE_KEY;

  const onderwerp =
    process.env.VAPID_SUBJECT;

  if (
    !publiekeSleutel ||
    !privateSleutel ||
    !onderwerp
  ) {
    return NextResponse.json(
      {
        fout:
          "Web Push is niet volledig geconfigureerd.",
      },
      {
        status: 503,
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
          "Het testverzoek is ongeldig.",
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

  const abonnement =
    await prisma.pushAbonnement.findFirst({
      where: {
        gebruikerId: gebruiker.id,
        endpoint,
      },
    });

  if (!abonnement) {
    return NextResponse.json(
      {
        fout:
          "Dit toestel is niet geregistreerd.",
      },
      {
        status: 404,
      },
    );
  }

  webpush.setVapidDetails(
    onderwerp,
    publiekeSleutel,
    privateSleutel,
  );

  try {
    await webpush.sendNotification(
      {
        endpoint:
          abonnement.endpoint,
        keys: {
          p256dh:
            abonnement.p256dh,
          auth: abonnement.auth,
        },
      },
      JSON.stringify({
        title:
          "SKH-testmelding",
        body:
          "Pushmeldingen werken op dit toestel.",
        url: "/mijn-profiel",
        tag:
          `push-test-${gebruiker.id}`,
        renotify: true,
      }),
      {
        TTL: 60,
        urgency: "high",
      },
    );
  } catch (fout) {
    const status =
      foutstatus(fout);

    if (
      status === 404 ||
      status === 410
    ) {
      await prisma.pushAbonnement.delete({
        where: {
          id: abonnement.id,
        },
      });
    }

    return NextResponse.json(
      {
        fout:
          status === 404 ||
          status === 410
            ? "Het abonnement is verlopen. Schakel pushmeldingen opnieuw in."
            : "De testmelding kon niet worden verstuurd.",
      },
      {
        status: 502,
      },
    );
  }

  return NextResponse.json({
    succes: true,
  });
}

import {
  timingSafeEqual,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(
  request: Request,
) {
  const origin =
    request.headers.get(
      "origin",
    ) ?? "";

  const toegestaneOrigin =
    origin.startsWith(
      "chrome-extension://",
    )
      ? origin
      : "null";

  return {
    "Access-Control-Allow-Origin":
      toegestaneOrigin,
    "Access-Control-Allow-Headers":
      "content-type, x-webextensie-token",
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
    "Access-Control-Max-Age":
      "600",
    Vary: "Origin",
  };
}

function antwoord(
  request: Request,
  gegevens: unknown,
  status: number,
) {
  return Response.json(
    gegevens,
    {
      status,
      headers:
        corsHeaders(request),
    },
  );
}

function tokensZijnGelijk(
  ontvangen: string,
  verwacht: string,
) {
  const ontvangenBuffer =
    Buffer.from(ontvangen);

  const verwachtBuffer =
    Buffer.from(verwacht);

  return (
    ontvangenBuffer.length ===
      verwachtBuffer.length &&
    timingSafeEqual(
      ontvangenBuffer,
      verwachtBuffer,
    )
  );
}

export async function OPTIONS(
  request: Request,
) {
  return new Response(
    null,
    {
      status: 204,
      headers:
        corsHeaders(request),
    },
  );
}

export async function POST(
  request: Request,
) {
  const verwachtToken =
    process.env
      .WEBEXTENSIE_TEST_TOKEN ??
    "";

  const ontvangenToken =
    request.headers.get(
      "x-webextensie-token",
    ) ?? "";

  if (
    !verwachtToken ||
    !ontvangenToken ||
    !tokensZijnGelijk(
      ontvangenToken,
      verwachtToken,
    )
  ) {
    return antwoord(
      request,
      {
        fout:
          "Geen toegang tot de tijdelijke test-API.",
      },
      401,
    );
  }

  let invoer: unknown;

  try {
    invoer =
      await request.json();
  } catch {
    return antwoord(
      request,
      {
        fout:
          "De aanvraag bevat geen geldige JSON.",
      },
      400,
    );
  }

  if (
    !invoer ||
    typeof invoer !== "object"
  ) {
    return antwoord(
      request,
      {
        fout:
          "Naam en klas ontbreken.",
      },
      400,
    );
  }

  const record =
    invoer as Record<
      string,
      unknown
    >;

  const naam =
    typeof record.naam === "string"
      ? record.naam.trim()
      : "";

  const klas =
    typeof record.klas === "string"
      ? record.klas.trim()
      : "";

  if (
    naam.length < 1 ||
    naam.length > 100
  ) {
    return antwoord(
      request,
      {
        fout:
          "Naam moet tussen 1 en 100 tekens bevatten.",
      },
      400,
    );
  }

  if (
    klas.length < 1 ||
    klas.length > 100
  ) {
    return antwoord(
      request,
      {
        fout:
          "Klas moet tussen 1 en 100 tekens bevatten.",
      },
      400,
    );
  }

  try {
    await prisma.$queryRaw`
      select public.voeg_test_toe(
        ${naam},
        ${klas}
      )::text as resultaat
    `;
  } catch (fout) {
    console.error(
      "Testinvoer kon niet worden opgeslagen.",
      fout instanceof Error
        ? fout.message
        : "Onbekende databasefout",
    );

    return antwoord(
      request,
      {
        fout:
          "De testgegevens konden niet worden opgeslagen.",
      },
      500,
    );
  }

  return antwoord(
    request,
    {
      geslaagd: true,
    },
    201,
  );
}

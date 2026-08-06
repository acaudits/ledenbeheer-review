import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  zoekBusnummers,
  zoekGemeenten,
  zoekHuisnummers,
  zoekStraten,
} from "@/lib/geopunt";
import {
  controleerPubliekeRateLimit,
} from "@/lib/publieke-rate-limit";

export const dynamic = "force-dynamic";

function clientSleutel(
  request: NextRequest,
) {
  return (
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    request.headers.get("x-real-ip") ||
    "onbekend"
  );
}

export async function GET(
  request: NextRequest,
) {
  if (
    !controleerPubliekeRateLimit({
      sleutel: `adres:${clientSleutel(
        request,
      )}`,
      maximum: 60,
      vensterMs: 60_000,
    })
  ) {
    return NextResponse.json(
      {
        fout:
          "Te veel adresopzoekingen.",
      },
      {
        status: 429,
      },
    );
  }

  const params =
    request.nextUrl.searchParams;

  const type = params.get("type");
  const q = params.get("q")?.trim() ?? "";
  const gemeente =
    params.get("gemeente")?.trim() ?? "";
  const straat =
    params.get("straat")?.trim() ?? "";
  const huisnummer =
    params.get("huisnummer")?.trim() ?? "";

  try {
    if (type === "gemeente") {
      return NextResponse.json({
        opties:
          await zoekGemeenten(q),
      });
    }

    if (type === "straat") {
      return NextResponse.json({
        opties: await zoekStraten({
          gemeente,
          zoektekst: q,
        }),
      });
    }

    if (type === "huisnummer") {
      return NextResponse.json({
        opties:
          await zoekHuisnummers({
            gemeente,
            straat,
            zoektekst: q,
          }),
      });
    }

    if (type === "busnummer") {
      return NextResponse.json({
        opties:
          await zoekBusnummers({
            gemeente,
            straat,
            huisnummer,
          }),
      });
    }

    return NextResponse.json(
      {
        fout: "Ongeldig adrestype.",
      },
      {
        status: 400,
      },
    );
  } catch {
    return NextResponse.json(
      {
        fout:
          "De adresdienst is momenteel niet bereikbaar.",
        opties: [],
      },
      {
        status: 502,
      },
    );
  }
}

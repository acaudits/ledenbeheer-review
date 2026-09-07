import {
  haalIngelogdeGebruikerOp,
} from "@/lib/auth";
import {
  heeftRol,
} from "@/lib/autorisatie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toegestaneOrigin() {
  const origin =
    process.env
      .WEBEXTENSIE_TOEGESTANE_ORIGIN
      ?.trim() ?? "";

  if (
    !/^chrome-extension:\/\/[a-p]{32}$/.test(
      origin,
    )
  ) {
    return "";
  }

  return origin;
}

function aanvraagKomtVanToegestaneExtensie(
  request: Request,
) {
  const verwachtOrigin =
    toegestaneOrigin();

  if (!verwachtOrigin) {
    return false;
  }

  const ontvangenOrigin =
    request.headers.get("origin") ?? "";

  if (ontvangenOrigin) {
    return ontvangenOrigin === verwachtOrigin;
  }

  const verwachtId =
    verwachtOrigin.replace(
      "chrome-extension://",
      "",
    );

  const ontvangenId =
    request.headers.get(
      "x-webextensie-id",
    ) ?? "";

  return (
    ontvangenId === verwachtId &&
    request.headers.get(
      "sec-fetch-site",
    ) === "none" &&
    request.headers.get(
      "sec-fetch-mode",
    ) === "cors" &&
    request.headers.get(
      "sec-fetch-dest",
    ) === "empty"
  );
}

function responseHeaders(
  request: Request,
) {
  const headers: Record<string, string> = {
    "Cache-Control":
      "no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Origin",
    "X-Content-Type-Options":
      "nosniff",
    "Referrer-Policy":
      "no-referrer",
  };

  const origin =
    request.headers.get("origin");

  if (
    origin &&
    origin === toegestaneOrigin()
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;

    headers[
      "Access-Control-Allow-Credentials"
    ] = "true";
  }

  return headers;
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
      headers: responseHeaders(request),
    },
  );
}

export async function OPTIONS(
  request: Request,
) {
  if (
    !aanvraagKomtVanToegestaneExtensie(
      request,
    )
  ) {
    return new Response(null, {
      status: 403,
      headers: responseHeaders(request),
    });
  }

  const headers =
    responseHeaders(request);

  headers["Access-Control-Allow-Methods"] =
    "GET, OPTIONS";

  headers["Access-Control-Allow-Headers"] =
    "Content-Type, X-Webextensie-Id";

  headers["Access-Control-Max-Age"] =
    "600";

  return new Response(null, {
    status: 204,
    headers,
  });
}

export async function GET(
  request: Request,
) {
  if (
    !aanvraagKomtVanToegestaneExtensie(
      request,
    )
  ) {
    return antwoord(
      request,
      {
        ingelogd: false,
        beheerder: false,
        fout:
          "Deze aanvraag is niet toegestaan.",
      },
      403,
    );
  }

  try {
    const gebruiker =
      await haalIngelogdeGebruikerOp();

    if (!gebruiker?.actief) {
      return antwoord(
        request,
        {
          ingelogd: false,
          beheerder: false,
          fout:
            "Je bent niet ingelogd bij Asbest CRM.",
        },
        401,
      );
    }

    if (
      !heeftRol(
        gebruiker.rollen,
        "BEHEERDER",
      )
    ) {
      return antwoord(
        request,
        {
          ingelogd: true,
          beheerder: false,
          fout:
            "De webextensie is alleen beschikbaar voor beheerders.",
        },
        403,
      );
    }

    return antwoord(
      request,
      {
        ingelogd: true,
        beheerder: true,
      },
      200,
    );
  } catch (fout) {
    console.error(
      "Webextensie-sessiecontrole mislukt:",
      fout instanceof Error
        ? fout.name
        : "Onbekende sessiefout",
    );

    return antwoord(
      request,
      {
        ingelogd: false,
        beheerder: false,
        fout:
          "De aanmelding kon niet worden gecontroleerd.",
      },
      500,
    );
  }
}

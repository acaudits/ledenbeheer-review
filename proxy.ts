import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isPubliekeRoute(pathname: string) {
  return (
    pathname === "/inloggen" ||
    pathname === "/wachtwoord-vergeten" ||
    pathname === "/wachtwoord-instellen" ||
    pathname.startsWith("/auth/")
  );
}

function maakLoginUrl(request: NextRequest, fout?: string) {
  const url = request.nextUrl.clone();

  url.pathname = "/inloggen";
  url.search = "";

  if (fout) {
    url.searchParams.set("fout", fout);
  }

  return url;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "De publieke Supabase-omgevingsvariabelen ontbreken.",
    );

    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          message:
            "De authenticatie is niet geconfigureerd.",
        },
        { status: 500 },
      );
    }

    return NextResponse.redirect(
      maakLoginUrl(request, "configuratie"),
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(name, value, options);
            },
          );
        },
      },
    },
  );

  /*
   * Valideer de Supabase-sessie en ververs indien nodig
   * de authenticatiecookies.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * Login, wachtwoordherstel en callbacks moeten ook zonder
   * actieve sessie bereikbaar zijn.
   */
  if (isPubliekeRoute(request.nextUrl.pathname)) {
    return response;
  }

  /*
   * Alle overige pagina's en API-routes vereisen een sessie.
   */
  if (!user?.email) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          message: "Je moet ingelogd zijn.",
        },
        { status: 401 },
      );
    }

    return NextResponse.redirect(
      maakLoginUrl(request),
    );
  }

  const email = user.email.trim().toLowerCase();

  try {
    const toegestaneGebruiker =
      await prisma.toegestaneGebruiker.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          actief: true,
          authUserId: true,
          wachtwoordWijzigen: true,
        },
      });

    /*
     * Alleen gebruikers die in de database bestaan en actief
     * zijn, mogen toegang krijgen tot het CRM.
     */
    if (!toegestaneGebruiker?.actief) {
      await supabase.auth.signOut();

      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            message:
              "Je account heeft geen toegang.",
          },
          { status: 403 },
        );
      }

      return NextResponse.redirect(
        maakLoginUrl(request, "geen-toegang"),
      );
    }

    /*
     * Deze API-route moet bereikbaar blijven terwijl
     * wachtwoordWijzigen nog true is. De route zet het veld
     * na een geslaagde wachtwoordwijziging op false.
     */
    const isWachtwoordStatusRoute =
      request.nextUrl.pathname ===
      "/api/auth/wachtwoord-gewijzigd";

    /*
     * Blokkeer alle CRM-pagina's totdat de gebruiker het
     * tijdelijke wachtwoord heeft gewijzigd.
     */
    if (
      toegestaneGebruiker.wachtwoordWijzigen &&
      !isWachtwoordStatusRoute
    ) {
      /*
       * API-routes krijgen JSON terug in plaats van een
       * redirect naar een HTML-pagina.
       */
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            message:
              "Je moet eerst je tijdelijke wachtwoord wijzigen.",
            wachtwoordWijzigen: true,
          },
          { status: 403 },
        );
      }

      const wachtwoordUrl =
        request.nextUrl.clone();

      wachtwoordUrl.pathname =
        "/wachtwoord-instellen";

      wachtwoordUrl.search = "";

      return NextResponse.redirect(
        wachtwoordUrl,
      );
    }

    /*
     * Koppel na een geldige login het Supabase-ID aan de
     * toegestane gebruiker.
     */
    if (
      !toegestaneGebruiker.authUserId ||
      toegestaneGebruiker.authUserId !== user.id
    ) {
      await prisma.toegestaneGebruiker.update({
        where: {
          id: toegestaneGebruiker.id,
        },
        data: {
          authUserId: user.id,
        },
      });
    }
  } catch (error) {
    console.error(
      "Controle van toegestane gebruiker mislukt:",
      error,
    );

    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          message:
            "Toegangscontrole is mislukt.",
        },
        { status: 500 },
      );
    }

    return NextResponse.redirect(
      maakLoginUrl(
        request,
        "controle-mislukt",
      ),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

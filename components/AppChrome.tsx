"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";

type AppChromeProps = {
  children: React.ReactNode;
};

function isPubliekeRoute(pathname: string) {
  return (
    pathname === "/inloggen" ||
    pathname === "/wachtwoord-vergeten" ||
    pathname === "/wachtwoord-instellen" ||
    pathname === "/profiel-voltooien" ||
    pathname.startsWith("/auth/")
  );
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();

  if (isPubliekeRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />

      <main className="min-h-screen bg-[#f4f8f7] lg:pl-72">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </>
  );
}

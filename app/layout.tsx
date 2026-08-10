import type {
  Metadata,
  Viewport,
} from "next";
import { AppChrome } from "@/components/AppChrome";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: 1280,
};

export const metadata: Metadata = {
  title: {
    default: "SKH Certificaten CRM",
    template: "%s | SKH Certificaten CRM",
  },
  description:
    "Beheer van persoonscertificaten en procescertificaten.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SKH CRM",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <QueryProvider>
          <AppChrome>
            {children}
          </AppChrome>
        </QueryProvider>
      </body>
    </html>
  );
}

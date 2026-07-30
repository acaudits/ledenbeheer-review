import type { Metadata } from "next";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SKH Certificaten CRM",
    template: "%s | SKH Certificaten CRM",
  },
  description:
    "Beheer van persoonscertificaten en procescertificaten.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

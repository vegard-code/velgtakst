import type { Metadata } from "next";
import Link from "next/link";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelgTakst - Velg en sertifisert takstmann",
  description:
    "Finn sertifiserte takstmenn i hele Norge. Søk etter takstmenn i ditt fylke for boligtaksering, tilstandsrapporter og verditakster.",
  metadataBase: new URL("https://www.velgtakst.no"),
  openGraph: {
    title: "VelgTakst - Velg en sertifisert takstmann",
    description:
      "Finn sertifiserte takstmenn i hele Norge. Søk etter takstmenn i ditt fylke for boligtaksering, tilstandsrapporter og verditakster.",
    url: "https://www.velgtakst.no",
    siteName: "VelgTakst",
    locale: "nb_NO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className="h-full antialiased">
      <head>
        <meta name="google-site-verification" content="4Ig1-eNP19cN_ZAjorv7Xw4BeoPtqx89fku953BPAaQ" />
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}

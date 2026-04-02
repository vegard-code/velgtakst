import type { Metadata } from "next";
import { cookies } from "next/headers";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "takstmann.net - Velg en sertifisert takstmann",
  description:
    "Finn sertifiserte takstmenn i hele Norge. Søk etter takstmenn i ditt fylke for tilstandsrapporter, verditakster og skadetakster.",
  metadataBase: new URL("https://www.takstmann.net"),
  openGraph: {
    title: "takstmann.net - Velg en sertifisert takstmann",
    description:
      "Finn sertifiserte takstmenn i hele Norge. Søk etter takstmenn i ditt fylke for tilstandsrapporter, verditakster og skadetakster.",
    url: "https://www.takstmann.net",
    siteName: "takstmann.net",
    locale: "nb_NO",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const consentCookie = cookieStore.get("cookie_consent");
  const hasConsent = consentCookie?.value === "granted" ? true : null;

  return (
    <html lang="no" className="h-full antialiased">
      <head>
        <meta name="google-site-verification" content="4Ig1-eNP19cN_ZAjorv7Xw4BeoPtqx89fku953BPAaQ" />
      </head>
      <body className="min-h-full flex flex-col">
        <CookieConsent initialConsent={hasConsent} />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelgTakst - Velg en sertifisert takstmann",
  description:
    "Finn sertifiserte takstmenn i hele Norge. Søk etter takstmenn i ditt fylke for boligtaksering, tilstandsrapporter og verditakster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}

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
    <html
      lang="no"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-card-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
                VT
              </div>
              <span className="text-lg font-semibold text-white">
                VelgTakst
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Hjem
              </Link>
              <Link
                href="/#fylker"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Fylker
              </Link>
              <Link
                href="/#blogg"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Blogg
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-card-border bg-surface mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
                    VT
                  </div>
                  <span className="text-lg font-semibold text-white">
                    VelgTakst
                  </span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Norges ledende portal for å finne sertifiserte takstmenn i ditt
                  fylke. Vi gjør det enkelt å finne riktig ekspert for din
                  eiendom.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Hurtiglenker</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Hjem
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#fylker"
                      className="hover:text-white transition-colors"
                    >
                      Finn takstmann
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#blogg"
                      className="hover:text-white transition-colors"
                    >
                      Blogg
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Kontakt</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>post@velgtakst.no</li>
                  <li>Tlf: 22 33 44 55</li>
                  <li>Storgata 1, 0155 Oslo</li>
                </ul>
              </div>
            </div>
            <div className="gradient-line mt-8 mb-6"></div>
            <p className="text-center text-xs text-gray-500">
              &copy; {new Date().getFullYear()} VelgTakst. Alle rettigheter
              reservert.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

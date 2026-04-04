import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <header className="border-b border-card-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
              VT
            </div>
            <span className="text-lg font-semibold text-white">takstmann.net</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/#fylker"
              className="text-gray-400 hover:text-white transition-colors hidden sm:block"
            >
              Finn takstmann
            </Link>
            <Link
              href="/blogg"
              className="text-gray-400 hover:text-white transition-colors hidden sm:block"
            >
              Blogg
            </Link>
            {user ? (
              <Link
                href="/portal"
                className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Min portal
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/logg-inn"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Logg inn
                </Link>
                <Link
                  href="/logg-inn"
                  className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Kom i gang
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-card-border bg-surface mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <span className="text-lg font-semibold text-white">takstmann.net</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Norges portal for å finne sertifiserte takstmenn i ditt fylke.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-gray-500 text-xs">Alltid tilgjengelig</span>
              </div>
            </div>

            {/* For kunder */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">For kunder</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <Link href="/#fylker" className="hover:text-white transition-colors">
                    Finn takstmann
                  </Link>
                </li>
                <li>
                  <Link href="/blogg/tilstandsrapport-guide" className="hover:text-white transition-colors">
                    Om tilstandsrapport
                  </Link>
                </li>
                <li>
                  <Link href="/blogg/hva-koster-takst" className="hover:text-white transition-colors">
                    Hva koster takst?
                  </Link>
                </li>
                <li>
                  <Link href="/blogg" className="hover:text-white transition-colors">
                    Blogg
                  </Link>
                </li>
              </ul>
            </div>

            {/* For takstmenn */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">For takstmenn</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <Link href="/registrer/takstmann" className="hover:text-white transition-colors">
                    Registrer deg
                  </Link>
                </li>
                <li>
                  <Link href="/logg-inn" className="hover:text-white transition-colors">
                    Logg inn
                  </Link>
                </li>
                <li>
                  <Link href="/portal" className="hover:text-white transition-colors">
                    Min portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Info */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Informasjon</h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>
                  <Link href="/vilkar" className="hover:text-white transition-colors">
                    Salgsvilkår
                  </Link>
                </li>
                <li>
                  <Link href="/personvern" className="hover:text-white transition-colors">
                    Personvernerklæring
                  </Link>
                </li>
                <li>
                  <a href="mailto:post@takstmann.net" className="hover:text-white transition-colors">
                    post@takstmann.net
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="gradient-line mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} takstmann.net. Alle rettigheter reservert.
            </p>
            <p className="text-xs text-gray-600">
              Laget med omhu for norske boligkjøpere og selgere
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

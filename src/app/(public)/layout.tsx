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
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              VT
            </div>
            <span className="text-lg font-semibold text-slate-900">takstmann.net</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/#fylker"
              className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
            >
              Finn takstmann
            </Link>
            <Link
              href="/blogg"
              className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
            >
              Blogg
            </Link>
            {user ? (
              <Link
                href="/portal"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Min portal
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/logg-inn"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Logg inn
                </Link>
                <Link
                  href="/logg-inn"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Kom i gang
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-slate-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4 w-fit">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <span className="text-lg font-bold text-white">takstmann.net</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Norges portal for å finne sertifiserte takstmenn. Velg fylke, sammenlign profiler og få hjelp til tilstandsrapport, verditakst og mer.
              </p>
            </div>

            {/* Tjenester */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Tjenester</h3>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "/#fylker", label: "Finn takstmann" },
                  { href: "/blogg/tilstandsrapport-guide", label: "Tilstandsrapport" },
                  { href: "/blogg/verditakst-hva-er-det", label: "Verditakst" },
                  { href: "/blogg/hva-er-skadetakst", label: "Skadetakst" },
                  { href: "/blogg", label: "Blogg" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-slate-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Om oss */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Om oss</h3>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "/registrer/takstmann", label: "Bli takstmann-partner" },
                  { href: "/logg-inn", label: "Logg inn" },
                  { href: "/vilkar", label: "Salgsvilkår" },
                  { href: "/personvern", label: "Personvernerklæring" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-slate-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li className="text-slate-600 text-xs pt-1">post@takstmann.net</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>&copy; 2026 takstmann.net. Alle rettigheter reservert.</p>
            <p>Bygget for sertifiserte takstmenn i Norge</p>
          </div>
        </div>
      </footer>
    </>
  );
}

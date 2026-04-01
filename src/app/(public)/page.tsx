import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import data from "@/data/takstmenn.json";

export const metadata: Metadata = {
  title: "VelgTakst | Finn sertifisert takstmann i ditt fylke",
  description:
    "Finn sertifiserte takstmenn i hele Norge. Velg fylke, sammenlign takstmenn og få hjelp til tilstandsrapport, verditakst, skadetakst og andre taksttjenester.",
  openGraph: {
    title: "VelgTakst | Finn sertifisert takstmann i ditt fylke",
    description:
      "Finn sertifiserte takstmenn i hele Norge. Velg fylke, sammenlign takstmenn og få hjelp til tilstandsrapport, verditakst, skadetakst og andre taksttjenester.",
    url: "https://www.takstmann.net",
  },
};

export const revalidate = 900;

async function hentFylkeStatistikk() {
  try {
    const supabase = await createClient();
    const { data: synligheter } = await supabase
      .from("fylke_synlighet")
      .select("fylke_id")
      .eq("er_aktiv", true);

    const tellerPerFylke: Record<string, number> = {};
    for (const s of (synligheter ?? []) as { fylke_id: string }[]) {
      tellerPerFylke[s.fylke_id] = (tellerPerFylke[s.fylke_id] ?? 0) + 1;
    }
    return tellerPerFylke;
  } catch {
    return {};
  }
}

// Velg 6 strategiske bloggposter for forsiden
const forsidePoster = [
  "nye-regler-tilstandsrapport-2026",
  "hva-koster-takst",
  "tilstandsgrader-tg0-tg3",
  "hva-er-skadetakst",
  "kjope-bolig-unnga-feller",
  "finn-takstmann-i-ditt-fylke",
];

export default async function Home() {
  const fylkeStatistikk = await hentFylkeStatistikk();
  const totalAktive = Object.values(fylkeStatistikk).reduce((a, b) => a + b, 0);
  const bloggposter = data.bloggposter.filter((p) => forsidePoster.includes(p.id));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 glow-text">
            Finn sertifisert takstmann i ditt fylke
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-4">
            VelgTakst gjør det enklere å finne sertifiserte takstmenn i Norge.
            Velg fylke, sammenlign aktuelle takstmenn og finn riktig fagperson
            til tilstandsrapport, verditakst, skadetakst og andre taksttjenester.
          </p>
          <div className="gradient-line max-w-xs mx-auto mt-8 mb-4" />
          <p className="text-sm text-gray-500">
            {FYLKER.length} fylker
            {totalAktive > 0 && (
              <> &middot; {totalAktive} aktive takstmenn</>
            )}
          </p>
        </div>
      </section>

      {/* Fylker grid */}
      <section id="fylker" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          Velg fylke
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {FYLKER.map((fylke) => {
            const antall = fylkeStatistikk[fylke.id] ?? 0;
            return (
              <Link
                key={fylke.id}
                href={`/${fylke.id}`}
                className="card-hover block bg-card-bg border border-card-border rounded-xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-1">{fylke.navn}</h3>
                <p className="text-xs text-gray-500">
                  {antall > 0 ? `${antall} takstmenn` : "Ingen registrert ennå"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Hva kan en takstmann hjelpe med? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Hva kan en takstmann hjelpe med?
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8 text-center">
            En takstmann kan hjelpe med blant annet{" "}
            <Link href="/blogg/tilstandsrapport-guide" className="text-accent hover:underline">tilstandsrapport ved boligsalg</Link>,{" "}
            <Link href="/blogg/verditakst-hva-er-det" className="text-accent hover:underline">verditakst ved refinansiering eller arv</Link>,{" "}
            <Link href="/blogg/hva-er-skadetakst" className="text-accent hover:underline">skadetakst ved forsikringssaker</Link>{" "}
            og vurdering av byggteknisk tilstand. På VelgTakst samler vi takstmenn etter fylke, slik
            at det blir enklere å finne riktig kompetanse der du bor.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { tittel: "Tilstandsrapport", beskrivelse: "Obligatorisk ved boligsalg. Dokumenterer boligens tekniske tilstand med tilstandsgrader.", href: "/blogg/tilstandsrapport-guide" },
              { tittel: "Verditakst", beskrivelse: "Profesjonell verdivurdering ved refinansiering, arv, skifte eller generell oversikt.", href: "/blogg/verditakst-hva-er-det" },
              { tittel: "Skadetakst", beskrivelse: "Dokumenterer skadeomfang og beregner reparasjonskostnader for forsikringsoppgjør.", href: "/blogg/hva-er-skadetakst" },
              { tittel: "Næringstakst", beskrivelse: "Verdivurdering av kontorer, butikker, lager og andre kommersielle eiendommer.", href: "/blogg/naeringstakst-bedrifter" },
            ].map((tjeneste) => (
              <Link
                key={tjeneste.tittel}
                href={tjeneste.href}
                className="card-hover bg-card-bg border border-card-border rounded-xl p-5 block"
              >
                <h3 className="text-white font-semibold mb-2">{tjeneste.tittel}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{tjeneste.beskrivelse}</p>
                <span className="text-accent text-xs font-medium mt-2 inline-block">Les mer &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Slik bruker du VelgTakst */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-card-bg border border-card-border rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Slik bruker du VelgTakst
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { steg: "1", tittel: "Velg fylket ditt", beskrivelse: "Bla gjennom alle 15 fylker og finn ditt område." },
              { steg: "2", tittel: "Se takstmenn", beskrivelse: "Se tilgjengelige takstmenn med fagområder og erfaring." },
              { steg: "3", tittel: "Sammenlign", beskrivelse: "Les profiler, sertifiseringer og vurderinger." },
              { steg: "4", tittel: "Ta kontakt", beskrivelse: "Kontakt takstmannen som passer oppdraget ditt best." },
            ].map((s) => (
              <div key={s.steg} className="text-center">
                <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center mx-auto mb-3 text-accent font-bold text-sm">
                  {s.steg}
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{s.tittel}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.beskrivelse}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blogg – strategisk utvalg */}
      <section id="blogg" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Fra bloggen</h2>
          <Link href="/blogg" className="text-accent text-sm font-medium hover:underline">
            Se alle innlegg &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bloggposter.map((post) => (
            <Link
              key={post.id}
              href={`/blogg/${post.id}`}
              className="card-hover block bg-card-bg border border-card-border rounded-xl overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-accent to-blue-400" />
              <div className="p-6">
                <time className="text-xs text-gray-500 mb-2 block">
                  {new Date(post.dato).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <h3 className="text-white font-semibold mb-3 leading-snug">
                  {post.tittel}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                  {post.ingress}
                </p>
                <span className="inline-block mt-4 text-accent text-sm font-medium">
                  Les mer &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA for takstmenn */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/20 rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">
            Er du takstmann?
          </h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            Bli synlig på VelgTakst og gjør det enklere for kunder i ditt fylke
            å finne deg. Registrer deg, aktiver profilen din og start å motta
            henvendelser fra relevante oppdrag.
          </p>
          <Link
            href="/registrer/takstmann"
            className="inline-block bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Registrer deg som takstmann
          </Link>
        </div>
      </section>

      {/* Structured Data: Organization + WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.takstmann.net/#organization",
                name: "VelgTakst",
                url: "https://www.takstmann.net",
                description: "Norges portal for å finne sertifiserte takstmenn.",
              },
              {
                "@type": "WebSite",
                "@id": "https://www.takstmann.net/#website",
                url: "https://www.takstmann.net",
                name: "VelgTakst",
                publisher: { "@id": "https://www.takstmann.net/#organization" },
                inLanguage: "nb-NO",
              },
            ],
          }),
        }}
      />
    </>
  );
}

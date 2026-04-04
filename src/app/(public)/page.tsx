import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import data from "@/data/takstmenn.json";

export const metadata: Metadata = {
  title: "takstmann.net | Finn sertifisert takstmann i ditt fylke",
  description:
    "Finn sertifiserte takstmenn i hele Norge. Velg fylke, sammenlign takstmenn og få hjelp til tilstandsrapport, verditakst, skadetakst og andre taksttjenester.",
  openGraph: {
    title: "takstmann.net | Finn sertifisert takstmann i ditt fylke",
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
            takstmann.net gjør det enklere å finne sertifiserte takstmenn i Norge.
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
                className="group block bg-card-bg border border-card-border rounded-xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 transition-colors group-hover:bg-accent/20 group-hover:border-accent/40">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-1 group-hover:text-accent transition-colors">{fylke.navn}</h3>
                <p className="text-xs text-gray-500">
                  {antall > 0 ? `${antall} takstmenn` : "Ingen registrert ennå"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Slik fungerer det */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-3 text-center">
          Slik fungerer det
        </h2>
        <p className="text-gray-400 text-center mb-10 max-w-xl mx-auto">
          Finn riktig takstmann på tre enkle steg — helt gratis for deg som kunde.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              steg: "1",
              icon: (
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              tittel: "Velg fylke",
              beskrivelse: "Bla gjennom alle fylker og finn takstmenn som opererer i ditt område.",
            },
            {
              steg: "2",
              icon: (
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              tittel: "Finn takstmann",
              beskrivelse: "Se profiler, sertifiseringer og tjenester. Sammenlign og velg den som passer best.",
            },
            {
              steg: "3",
              icon: (
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              tittel: "Be om tilbud",
              beskrivelse: "Send en forespørsel direkte til takstmannen og få tilbud på ditt oppdrag.",
            },
          ].map((s, i) => (
            <div key={s.steg} className="relative bg-card-bg border border-card-border rounded-2xl p-6 text-center">
              {/* Connector line between steps */}
              {i < 2 && (
                <div className="hidden md:block absolute top-10 -right-3 w-6 h-px bg-gradient-to-r from-accent/40 to-transparent z-10" />
              )}
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                {s.icon}
              </div>
              <div className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center mx-auto -mt-1 mb-3">
                {s.steg}
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{s.tittel}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.beskrivelse}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hvorfor bruke takstmann.net */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-br from-card-bg to-surface border border-card-border rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-white mb-3 text-center">
            Hvorfor bruke takstmann.net?
          </h2>
          <p className="text-gray-400 text-center mb-10 max-w-xl mx-auto">
            Vi gjør det enkelt å finne sertifiserte fagfolk du kan stole på.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                tittel: "Sertifiserte takstmenn",
                beskrivelse: "Alle takstmenn på portalen er verifiserte fagfolk med godkjente sertifiseringer.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                tittel: "Enkel bestilling",
                beskrivelse: "Send forespørsel direkte fra profilen — ingen telefon-ping-pong eller mellomleddet.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                tittel: "Rask respons",
                beskrivelse: "Takstmennene svarer raskt på forespørsler slik at du kommer i gang uten unødig venting.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                tittel: "Trygg prosess",
                beskrivelse: "Transparent kommunikasjon og klar prising. Du vet hva du får — ingen overraskelser.",
              },
            ].map((f) => (
              <div key={f.tittel} className="flex flex-col items-start">
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold mb-1.5 text-sm">{f.tittel}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.beskrivelse}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hva kan en takstmann hjelpe med? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Hva kan en takstmann hjelpe med?
          </h2>
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
            Bli synlig på takstmann.net og gjør det enklere for kunder i ditt fylke
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
                name: "takstmann.net",
                url: "https://www.takstmann.net",
                description: "Norges portal for å finne sertifiserte takstmenn.",
              },
              {
                "@type": "WebSite",
                "@id": "https://www.takstmann.net/#website",
                url: "https://www.takstmann.net",
                name: "takstmann.net",
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

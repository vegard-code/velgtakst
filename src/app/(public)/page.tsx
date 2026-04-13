import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import data from "@/data/takstmenn.json";
import FylkeSøk from "@/components/FylkeSøk";

export const metadata: Metadata = {
  title: "takstmann.net | Finn takstmann. Enkelt og trygt.",
  description:
    "Finn sertifiserte takstmenn i hele Norge. Velg fylke, sammenlign takstmenn og få hjelp til tilstandsrapport, verditakst, skadetakst og andre taksttjenester.",
  alternates: {
    canonical: "https://www.takstmann.net",
  },
  openGraph: {
    title: "takstmann.net | Finn takstmann. Enkelt og trygt.",
    description:
      "Finn sertifiserte takstmenn i hele Norge. Velg fylke, sammenlign takstmenn og få hjelp til tilstandsrapport, verditakst, skadetakst og andre taksttjenester.",
    url: "https://www.takstmann.net",
  },
};

export const revalidate = 3600;

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
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-slate-50 border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.07)_0%,_transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 text-center relative">
          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[
              { label: "Verifisert med Vipps", color: "bg-orange-50 text-orange-700 border-orange-200" },
              { label: "Sertifiserte fagfolk", color: "bg-green-50 text-green-700 border-green-200" },
              { label: "Gratis tilbud", color: "bg-blue-50 text-blue-700 border-blue-200" },
            ].map((pill) => (
              <span
                key={pill.label}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${pill.color}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {pill.label}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 tracking-tight">
            Finn takstmann.{" "}
            <span className="text-blue-600">Enkelt og trygt.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Sammenlign sertifiserte takstmenn i hele Norge og få gratis tilbud på
            tilstandsrapport, verditakst og mer.
          </p>

          <FylkeSøk fylker={FYLKER} />

          <p className="text-sm text-slate-400 mt-4">
            {FYLKER.length} fylker
            {totalAktive > 0 && <> &middot; {totalAktive} aktive takstmenn</>}
          </p>
        </div>
      </section>

      {/* Fylker grid */}
      <section id="fylker" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Velg ditt fylke
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Finn sertifiserte takstmenn i ditt nærområde
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {FYLKER.map((fylke) => {
            const antall = fylkeStatistikk[fylke.id] ?? 0;
            return (
              <Link
                key={fylke.id}
                href={`/${fylke.id}`}
                className="group block bg-white border border-slate-200 rounded-xl p-4 text-center transition-all duration-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/60 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-2.5 transition-all group-hover:bg-blue-600 group-hover:border-blue-600">
                  <svg
                    className="w-4 h-4 text-blue-500 group-hover:text-white transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-slate-800 font-semibold text-sm mb-0.5 group-hover:text-blue-600 transition-colors">
                  {fylke.navn}
                </h3>
                <p className="text-xs text-slate-400">
                  {antall > 0 ? `${antall} takstmenn` : "Ingen ennå"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Slik fungerer det */}
      <section className="bg-slate-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Slik fungerer det
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Tre enkle steg til riktig takstmann
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                tittel: "Velg fylke",
                beskrivelse:
                  "Velg ditt fylke og se alle tilgjengelige sertifiserte takstmenn i ditt område.",
              },
              {
                num: "02",
                tittel: "Finn takstmann",
                beskrivelse:
                  "Sammenlign profiler, fagområder, sertifiseringer og vurderinger fra andre kunder.",
              },
              {
                num: "03",
                tittel: "Be om tilbud",
                beskrivelse:
                  "Send en henvendelse direkte og få tilbud på ditt oppdrag raskt og enkelt.",
              },
            ].map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+3rem)] right-0 h-px bg-gradient-to-r from-blue-500/30 to-transparent" />
                )}
                <div className="text-7xl font-black text-blue-500/15 leading-none mb-3 select-none">
                  {s.num}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.tittel}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.beskrivelse}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistikk */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { tall: "100%", label: "Verifiserte", sub: "via Vipps ID" },
              { tall: "~2t", label: "Responstid", sub: "i snitt" },
              { tall: "0 kr", label: "Gratis tilbud", sub: "ingen skjulte gebyrer" },
              { tall: "Vipps", label: "Sikker ID", sub: "BankID-nivå" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                  {stat.tall}
                </div>
                <div className="text-sm font-semibold text-slate-700">{stat.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hva kan en takstmann hjelpe med? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            Hva kan en takstmann hjelpe med?
          </h2>
          <p className="text-slate-500 text-center mb-8">De vanligste oppdragene</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                tittel: "Tilstandsrapport",
                beskrivelse:
                  "Vanlig og sterkt anbefalt ved boligsalg. Dokumenterer boligens tekniske tilstand med tilstandsgrader.",
                href: "/blogg/tilstandsrapport-guide",
              },
              {
                tittel: "Verditakst",
                beskrivelse:
                  "Profesjonell verdivurdering ved refinansiering, arv, skifte eller generell oversikt.",
                href: "/blogg/verditakst-hva-er-det",
              },
              {
                tittel: "Skadetakst",
                beskrivelse:
                  "Dokumenterer skadeomfang og beregner reparasjonskostnader for forsikringsoppgjør.",
                href: "/blogg/hva-er-skadetakst",
              },
              {
                tittel: "Næringstakst",
                beskrivelse:
                  "Verdivurdering av kontorer, butikker, lager og andre kommersielle eiendommer.",
                href: "/blogg/naeringstakst-bedrifter",
              },
            ].map((tjeneste) => (
              <Link
                key={tjeneste.tittel}
                href={tjeneste.href}
                className="card-hover bg-white border border-slate-200 rounded-xl p-5 block"
              >
                <h3 className="text-slate-900 font-semibold mb-2">{tjeneste.tittel}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{tjeneste.beskrivelse}</p>
                <span className="text-blue-600 text-xs font-medium mt-2 inline-block">
                  Les mer &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Blogg */}
      <section id="blogg" className="bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Fra bloggen</h2>
            <Link href="/blogg" className="text-blue-600 text-sm font-medium hover:underline">
              Se alle innlegg &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bloggposter.map((post) => (
              <Link
                key={post.id}
                href={`/blogg/${post.id}`}
                className="card-hover block bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
                <div className="p-6">
                  <time className="text-xs text-slate-400 mb-2 block">
                    {new Date(post.dato).toLocaleDateString("nb-NO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <h3 className="text-slate-900 font-semibold mb-3 leading-snug">
                    {post.tittel}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                    {post.ingress}
                  </p>
                  <span className="inline-block mt-4 text-blue-600 text-sm font-medium">
                    Les mer &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Klar til å finne din takstmann?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8 max-w-xl mx-auto">
            Velg ditt fylke, sammenlign sertifiserte takstmenn og få gratis tilbud –
            helt uten forpliktelser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/#fylker"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors"
            >
              Finn takstmann nå
            </Link>
            <Link
              href="/registrer/takstmann"
              className="inline-block bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-3.5 rounded-lg font-semibold transition-colors"
            >
              Er du takstmann?
            </Link>
          </div>
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

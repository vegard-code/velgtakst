import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import type { TakstmannMedFylker } from "@/lib/supabase/types";
import { getKommunerForFylke } from "@/data/kommuner";
import RandomSpinnerWrapper from "@/components/RandomSpinnerWrapper";
import SertifiseringBadge from "@/components/SertifiseringBadge";
import data from "@/data/takstmenn.json";

export const revalidate = 900;

interface Props {
  params: Promise<{ fylke: string }>;
}

export async function generateStaticParams() {
  return FYLKER.map((f) => ({ fylke: f.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fylke: fylkeId } = await params;
  const fylke = FYLKER.find((f) => f.id === fylkeId);
  if (!fylke) return {};
  return {
    title: `Takstmann i ${fylke.navn} | Finn sertifisert takstmann | takstmann.net`,
    description: `Finn sertifiserte takstmenn i ${fylke.navn}. Sammenlign erfarne takstmenn for tilstandsrapport, verditakst, skadetakst og andre taksttjenester i ${fylke.navn}.`,
    openGraph: {
      title: `Takstmann i ${fylke.navn} | takstmann.net`,
      description: `Finn sertifiserte takstmenn i ${fylke.navn}. Tilstandsrapport, verditakst, skadetakst og mer.`,
      url: `https://www.takstmann.net/${fylkeId}`,
    },
  };
}

// Fylkebeskrivelser for SEO-innhold
const FYLKE_INTRO: Record<string, string> = {
  oslo: "Oslo er Norges mest folkerike fylke med et aktivt boligmarked. Høy omsetning av leiligheter, rekkehus og eneboliger gjør at behovet for kvalifiserte takstmenn er stort hele året.",
  rogaland: "Rogaland har et variert boligmarked fra Stavanger-regionen til mindre tettsteder langs kysten. Oljebyen Stavanger skaper stor etterspørsel etter både bolig- og næringstakster.",
  vestland: "Vestland fylke, med Bergen som sentrum, har et mangfoldig boligmarked preget av både bymessig bebyggelse og spredt bosetting. Fukt og klima gjør tilstandsvurderinger ekstra viktige her.",
  trondelag: "Trøndelag, med Trondheim som regionhovedstad, har et voksende boligmarked. Studentbyen skaper høy etterspørsel etter utleieboliger og tilhørende taksttjenester.",
  akershus: "Akershus omringer Oslo og har noen av landets mest attraktive boligområder. Stor tilflytting og høye boligpriser gjør at profesjonell takst er ekstra viktig ved kjøp og salg.",
  innlandet: "Innlandet er Norges største fylke i areal, med et variert boligmarked fra byene Hamar og Lillehammer til hytteområder i fjellheimen. Både bolig- og fritidstakst er etterspurt.",
  vestfold: "Vestfold har en blanding av kystbyer som Tønsberg, Sandefjord og Larvik, med et aktivt boligmarked særlig i sommersesongen. Mange eldre boliger krever grundig tilstandsvurdering.",
  telemark: "Telemark byr på alt fra bymessig bebyggelse i Skien og Porsgrunn til hytter og fritidsboliger i fjellområdene. Variert boligmasse gir behov for bred takstkompetanse.",
  agder: "Agder strekker seg langs Sørlandskysten med populære byer som Kristiansand og Arendal. Kystklima og eldre trehusbebyggelse gjør grundig tilstandsvurdering viktig.",
  "more-og-romsdal": "Møre og Romsdal har et variert boligmarked fra byer som Ålesund og Molde til spredt bosetting langs fjorder og på øyer. Maritime forhold stiller krav til bygningsvern.",
  nordland: "Nordland strekker seg over en lang kystlinje med byer som Bodø og Mo i Rana. Arktisk klima og krevende værforhold gjør grundig tilstandsvurdering av bygninger ekstra viktig.",
  troms: "Troms, med Tromsø som Nordens Paris, har et aktivt boligmarked tross nordlig beliggenhet. Kulde, snølast og fukt gjør at takstmenn med lokal kompetanse er avgjørende.",
  finnmark: "Finnmark er Norges nordligste og østligste fylke med unike klimautfordringer. Ekstreme temperaturer og værforhold gjør profesjonell tilstandsvurdering helt nødvendig.",
  buskerud: "Buskerud spenner fra Drammen og nærhet til Oslo til fjellbygder og hytteområder rundt Geilo og Hemsedal. Stort bolig- og hyttemarked gir jevn etterspørsel etter takst.",
  ostfold: "Østfold ligger nær Oslo og svenskegrensen, med byer som Fredrikstad, Sarpsborg og Moss. Regionens vekst og mange eldre boliger gir stort behov for tilstandsrapporter og verditakster.",
};

// FAQ-spørsmål tilpasset hvert fylke
function getFAQ(fylkeNavn: string) {
  return [
    {
      sporsmal: `Hva koster en takstmann i ${fylkeNavn}?`,
      svar: `Prisen for takst i ${fylkeNavn} varierer etter type oppdrag. En tilstandsrapport for en enebolig koster typisk mellom 10 000 og 20 000 kroner, mens en verditakst ofte ligger på 3 000–8 000 kroner. Prisen avhenger av boligens størrelse, beliggenhet og kompleksitet. Be alltid om tilbud fra flere takstmenn for å sammenligne.`,
    },
    {
      sporsmal: `Trenger jeg tilstandsrapport ved boligsalg i ${fylkeNavn}?`,
      svar: `Det er ikke lovpålagt, men i praksis er det nærmest nødvendig. Endringene i avhendingslova fra 1. januar 2022 fjernet selgers mulighet til å selge bolig «som den er» til forbrukere. Uten tilstandsrapport sitter selger med all risikoen for skjulte feil og mangler. Fra 1. juli 2026 gjelder den nye standarden NS 3600:2025, som stiller strengere krav til innholdet i rapporten. En sertifisert takstmann i ${fylkeNavn} sikrer at rapporten oppfyller gjeldende krav.`,
    },
    {
      sporsmal: `Hvordan finner jeg en god takstmann i ${fylkeNavn}?`,
      svar: `På takstmann.net kan du se tilgjengelige takstmenn i ${fylkeNavn}, sammenligne fagområder og sertifiseringer, og velge den som passer ditt oppdrag best. Se etter takstmenn med relevant erfaring, godkjente sertifiseringer og tydelig spesialisering innen det du trenger hjelp med.`,
    },
    {
      sporsmal: `Hva er forskjellen mellom verditakst og tilstandsrapport?`,
      svar: `En verditakst fastsetter markedsverdien på en eiendom og brukes ved refinansiering, arv eller skifte. En tilstandsrapport dokumenterer den tekniske tilstanden på boligen med tilstandsgrader (TG0–TG3) og er i praksis nødvendig ved boligsalg etter lovendringene i 2022. Mange takstmenn i ${fylkeNavn} tilbyr begge tjenestene.`,
    },
  ];
}

// Relevante bloggposter for fylkesider
const relevantePoster = [
  "hva-koster-takst",
  "tilstandsrapport-guide",
  "nye-regler-tilstandsrapport-2026",
  "tilstandsgrader-tg0-tg3",
  "verditakst-hva-er-det",
  "finn-takstmann-i-ditt-fylke",
];

interface TakstmannKort extends TakstmannMedFylker {
  tjenester: string[]
  snittKarakter: number | null
  antallVurderinger: number
  company?: { navn: string } | null
}

async function hentTakstmennIFylke(fylkeId: string): Promise<TakstmannKort[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fylke_synlighet")
    .select(
      `
      takstmann_id,
      takstmann_profiler!inner (
        id, navn, tittel, spesialitet, spesialitet_2, bio, telefon, epost, bilde_url, sertifiseringer, sertifisering, sertifisering_annet, tjenester, created_at, updated_at, user_id, company_id,
        company:companies(navn)
      )
    `
    )
    .eq("fylke_id", fylkeId)
    .eq("er_aktiv", true);

  if (error || !data) return [];

  const takstmenn = (data as unknown as { takstmann_profiler: TakstmannKort }[]).map((row) => ({
    ...row.takstmann_profiler,
    fylke_synlighet: [],
    snittKarakter: null as number | null,
    antallVurderinger: 0,
  }));

  // Hent vurderinger for alle takstmenn
  if (takstmenn.length > 0) {
    const ids = takstmenn.map((t) => t.id);
    const { data: vurderinger } = await supabase
      .from("megler_vurderinger")
      .select("takstmann_id, karakter")
      .in("takstmann_id", ids);

    if (vurderinger) {
      const vurderingMap = new Map<string, number[]>();
      for (const v of vurderinger) {
        if (!vurderingMap.has(v.takstmann_id)) vurderingMap.set(v.takstmann_id, []);
        if (v.karakter) vurderingMap.get(v.takstmann_id)!.push(v.karakter);
      }
      for (const t of takstmenn) {
        const karakterer = vurderingMap.get(t.id);
        if (karakterer && karakterer.length > 0) {
          t.snittKarakter = karakterer.reduce((a, b) => a + b, 0) / karakterer.length;
          t.antallVurderinger = karakterer.length;
        }
      }
    }
  }

  return takstmenn;
}

export default async function FylkePage({ params }: Props) {
  const { fylke: fylkeId } = await params;
  const fylke = FYLKER.find((f) => f.id === fylkeId);
  if (!fylke) notFound();

  const takstmenn = await hentTakstmennIFylke(fylkeId);
  const faq = getFAQ(fylke.navn);
  const bloggposter = data.bloggposter.filter((p) => relevantePoster.includes(p.id));
  const intro = FYLKE_INTRO[fylkeId] ?? `${fylke.navn} har et aktivt boligmarked med behov for kvalifiserte takstmenn til tilstandsrapporter, verditakster og andre taksttjenester.`;

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Brødsmulesti" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-white transition-colors">takstmann.net</Link>
          </li>
          <li>/</li>
          <li className="text-gray-300">{fylke.navn}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 glow-text">
          Takstmann i {fylke.navn}
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed max-w-3xl mb-4">
          {intro}
        </p>
        <p className="text-gray-400 leading-relaxed max-w-3xl">
          Finn sertifiserte takstmenn i {fylke.navn} som kan hjelpe med{" "}
          <Link href="/blogg/tilstandsrapport-guide" className="text-accent hover:underline">tilstandsrapport</Link>,{" "}
          <Link href="/blogg/verditakst-hva-er-det" className="text-accent hover:underline">verditakst</Link>,{" "}
          <Link href="/blogg/hva-er-skadetakst" className="text-accent hover:underline">skadetakst</Link>{" "}
          og andre taksttjenester.
        </p>
        <div className="gradient-line max-w-xs mt-6 mb-2" />
        <p className="text-sm text-gray-500">
          {takstmenn.length > 0
            ? `${takstmenn.length} sertifiserte takstmenn tilgjengelig i ${fylke.navn}`
            : `Ingen takstmenn registrert i ${fylke.navn} ennå`}
        </p>
      </section>

      {/* Tjenester folk trenger */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-xl font-bold text-white mb-5">
          Hva trenger folk takstmann til i {fylke.navn}?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { tittel: "Tilstandsrapport", beskrivelse: "Obligatorisk ved boligsalg. Dokumenterer teknisk tilstand.", href: "/blogg/tilstandsrapport-guide" },
            { tittel: "Verditakst", beskrivelse: "Verdivurdering ved refinansiering, arv eller skifte.", href: "/blogg/verditakst-hva-er-det" },
            { tittel: "Skadetakst", beskrivelse: "Skadedokumentasjon for forsikringsoppgjør.", href: "/blogg/hva-er-skadetakst" },
            { tittel: "Næringstakst", beskrivelse: "Verdivurdering av næringseiendommer.", href: "/blogg/naeringstakst-bedrifter" },
          ].map((t) => (
            <Link
              key={t.tittel}
              href={t.href}
              className="card-hover bg-card-bg border border-card-border rounded-xl p-4 block"
            >
              <h3 className="text-white font-semibold text-sm mb-1">{t.tittel}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{t.beskrivelse}</p>
              <span className="text-accent text-xs font-medium mt-2 inline-block">Les mer &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Kommuner i fylket */}
      {(() => {
        const kommuner = getKommunerForFylke(fylkeId);
        if (kommuner.length === 0) return null;
        return (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <h2 className="text-xl font-bold text-white mb-5 text-center">
              Finn takstmann i din kommune i {fylke.navn}
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {kommuner.map((k) => (
                <Link
                  key={k.id}
                  href={`/${fylkeId}/${k.id}`}
                  className="text-sm text-gray-400 hover:text-accent border border-card-border hover:border-accent/30 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {k.navn}
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Tilfeldig spinner */}
      {takstmenn.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <RandomSpinnerWrapper takstmenn={takstmenn} fylkeNavn={fylke.navn} />
        </section>
      )}

      {/* Alle takstmenn */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-xl font-bold text-white mb-6">
          {takstmenn.length > 0
            ? `Alle takstmenn i ${fylke.navn}`
            : `Takstmenn i ${fylke.navn}`}
        </h2>

        {takstmenn.length === 0 ? (
          <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">
              Ingen takstmenn har aktivert synlighet i {fylke.navn} ennå.
            </p>
            <Link
              href="/registrer/takstmann"
              className="inline-block bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Er du takstmann? Registrer deg
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {takstmenn.map((t) => {
              const alleTjenester = t.tjenester ?? [];
              const spesialiteter = [t.spesialitet, t.spesialitet_2].filter(Boolean) as string[];
              const andreTjenester = alleTjenester.filter(
                (tj) => tj !== t.spesialitet && tj !== t.spesialitet_2
              );
              const visNavn = t.navn ?? "Ukjent";
              const companyNavn = (t as unknown as { company?: { navn: string } | null }).company?.navn;

              return (
                <div
                  key={t.id}
                  className="flex flex-col bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-accent/20 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Fargestripe øverst */}
                  <div className="h-1.5 bg-gradient-to-r from-accent via-blue-400 to-accent/50" />

                  {/* Profilhode */}
                  <div className="flex items-center gap-4 px-5 pt-5 pb-4">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-accent/30 bg-accent/10 relative">
                        {t.bilde_url ? (
                          <Image
                            src={t.bilde_url}
                            alt={visNavn}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-accent font-bold text-2xl">
                            {visNavn.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {(t.sertifisering || (t.sertifiseringer?.length ?? 0) > 0) && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-surface flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-bold text-base leading-tight truncate">{visNavn}</h3>
                      {companyNavn && (
                        <p className="text-gray-400 text-xs mt-0.5 truncate">{companyNavn}</p>
                      )}
                      {t.tittel && !companyNavn && (
                        <p className="text-gray-400 text-xs mt-0.5 truncate">{t.tittel}</p>
                      )}

                      {/* Vurdering */}
                      {t.snittKarakter !== null ? (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg key={s} className={`w-3 h-3 ${s <= Math.round(t.snittKarakter!) ? "text-yellow-400" : "text-gray-700"}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-gray-500 text-xs">({t.antallVurderinger})</span>
                        </div>
                      ) : (
                        <p className="text-gray-600 text-xs mt-1">Ingen vurderinger ennå</p>
                      )}
                    </div>
                  </div>

                  {/* Sertifisering */}
                  {t.sertifisering && (
                    <div className="px-5 pb-3">
                      <SertifiseringBadge
                        sertifisering={t.sertifisering}
                        sertifiseringAnnet={t.sertifisering_annet}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Tjenester som badges */}
                  {(spesialiteter.length > 0 || andreTjenester.length > 0) && (
                    <div className="px-5 pb-4">
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Tjenester</p>
                      <div className="flex flex-wrap gap-1.5">
                        {spesialiteter.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/25"
                          >
                            {s}
                          </span>
                        ))}
                        {andreTjenester.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10"
                          >
                            {s}
                          </span>
                        ))}
                        {andreTjenester.length > 3 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-500 border border-white/10">
                            +{andreTjenester.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bunndel med knapper */}
                  <div className="mt-auto px-5 pb-5 pt-3 border-t border-white/8 flex gap-2">
                    <Link
                      href={`/takstmann/${t.id}`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-medium text-gray-300 border border-white/10 hover:border-accent/40 hover:text-white transition-colors"
                    >
                      Se profil
                    </Link>
                    <Link
                      href={`/takstmann/${t.id}#bestill`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent/85 text-white transition-colors"
                    >
                      Be om tilbud
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Ofte stilte spørsmål om takst i {fylke.navn}
          </h2>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <details
                key={i}
                className="bg-card-bg border border-card-border rounded-xl group"
              >
                <summary className="p-5 cursor-pointer text-white font-semibold flex items-center justify-between list-none">
                  <span>{item.sporsmal}</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-400 leading-relaxed text-sm">
                  {item.svar}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Relevante blogginnlegg */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Nyttige artikler om takst</h2>
          <Link href="/blogg" className="text-accent text-sm font-medium hover:underline">
            Se alle &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bloggposter.slice(0, 6).map((post) => (
            <Link
              key={post.id}
              href={`/blogg/${post.id}`}
              className="card-hover block bg-card-bg border border-card-border rounded-xl overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-accent to-blue-400" />
              <div className="p-5">
                <h3 className="text-white font-semibold text-sm mb-2 leading-snug">
                  {post.tittel}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                  {post.ingress}
                </p>
                <span className="inline-block mt-3 text-accent text-xs font-medium">
                  Les mer &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Andre fylker */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-xl font-bold text-white mb-5 text-center">
          Se takstmenn i andre fylker
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {FYLKER.filter((f) => f.id !== fylkeId).map((f) => (
            <Link
              key={f.id}
              href={`/${f.id}`}
              className="text-sm text-gray-400 hover:text-accent border border-card-border hover:border-accent/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              {f.navn}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA for takstmenn */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/20 rounded-2xl p-8 sm:p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-3">
            Er du takstmann i {fylke.navn}?
          </h2>
          <p className="text-gray-400 leading-relaxed mb-5 text-sm">
            Bli synlig på takstmann.net og la kunder i {fylke.navn} finne deg.
            Registrer deg, aktiver profilen din og start å motta henvendelser.
          </p>
          <Link
            href="/registrer/takstmann"
            className="inline-block bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Registrer deg som takstmann
          </Link>
        </div>
      </section>

      {/* Structured Data: BreadcrumbList + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "takstmann.net",
                    item: "https://www.takstmann.net",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: `Takstmann i ${fylke.navn}`,
                    item: `https://www.takstmann.net/${fylkeId}`,
                  },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: faq.map((item) => ({
                  "@type": "Question",
                  name: item.sporsmal,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.svar,
                  },
                })),
              },
            ],
          }),
        }}
      />
    </>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import type { TakstmannMedFylker } from "@/lib/supabase/types";
import { KOMMUNER, getKommunerForFylke } from "@/data/kommuner";

export const revalidate = 900;

interface Props {
  params: Promise<{ fylke: string; kommune: string }>;
}

export async function generateStaticParams() {
  return KOMMUNER.map((k) => ({
    fylke: k.fylkeId,
    kommune: k.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fylke: fylkeId, kommune: kommuneId } = await params;
  const fylke = FYLKER.find((f) => f.id === fylkeId);
  const kommune = KOMMUNER.find(
    (k) => k.id === kommuneId && k.fylkeId === fylkeId
  );
  if (!fylke || !kommune) return {};

  const title = `Takstmann i ${kommune.navn} | Finn sertifisert takstmann | VelgTakst`;
  const description = `Finn sertifiserte takstmenn i ${kommune.navn}, ${fylke.navn}. Sammenlign erfarne takstmenn for tilstandsrapport, verditakst og skadetakst i ${kommune.navn}.`;

  return {
    title,
    description,
    openGraph: {
      title: `Takstmann i ${kommune.navn} | VelgTakst`,
      description,
      url: `https://www.velgtakst.no/${fylkeId}/${kommuneId}`,
    },
    alternates: {
      canonical: `https://www.velgtakst.no/${fylkeId}/${kommuneId}`,
    },
  };
}

interface TakstmannKort extends TakstmannMedFylker {
  tjenester: string[];
  snittKarakter: number | null;
  antallVurderinger: number;
  company?: { navn: string } | null;
}

async function hentTakstmennIKommune(fylkeId: string, kommuneId: string): Promise<TakstmannKort[]> {
  const supabase = await createClient();

  // Sjekk om noen takstmenn i dette fylket bruker kommune-synlighet i det hele tatt
  const { count: harKommuneData } = await supabase
    .from("kommune_synlighet")
    .select("id", { count: "exact", head: true })
    .eq("fylke_id", fylkeId);

  let takstmannIds: string[] | null = null;

  if (harKommuneData && harKommuneData > 0) {
    // Kommune-synlighet er i bruk — filtrer på de som har denne kommunen aktiv
    const { data: kommuneData } = await supabase
      .from("kommune_synlighet")
      .select("takstmann_id")
      .eq("kommune_id", kommuneId)
      .eq("fylke_id", fylkeId)
      .eq("er_aktiv", true);

    takstmannIds = (kommuneData ?? []).map((k) => k.takstmann_id);
    // Hvis ingen har denne kommunen aktiv, returner tom liste
    if (takstmannIds.length === 0) return [];
  }

  const query = supabase
    .from("fylke_synlighet")
    .select(
      `
      takstmann_id,
      takstmann_profiler!inner (
        id, navn, tittel, spesialitet, spesialitet_2, bio, telefon, epost, bilde_url, sertifiseringer, tjenester, created_at, updated_at, user_id, company_id,
        company:companies(navn)
      )
    `
    )
    .eq("fylke_id", fylkeId)
    .eq("er_aktiv", true);

  if (takstmannIds) {
    query.in("takstmann_id", takstmannIds);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  const takstmenn = (
    data as unknown as { takstmann_profiler: TakstmannKort }[]
  ).map((row) => ({
    ...row.takstmann_profiler,
    fylke_synlighet: [],
    snittKarakter: null as number | null,
    antallVurderinger: 0,
  }));

  if (takstmenn.length > 0) {
    const ids = takstmenn.map((t) => t.id);
    const { data: vurderinger } = await supabase
      .from("megler_vurderinger")
      .select("takstmann_id, karakter")
      .in("takstmann_id", ids);

    if (vurderinger) {
      const vurderingMap = new Map<string, number[]>();
      for (const v of vurderinger) {
        if (!vurderingMap.has(v.takstmann_id))
          vurderingMap.set(v.takstmann_id, []);
        if (v.karakter) vurderingMap.get(v.takstmann_id)!.push(v.karakter);
      }
      for (const t of takstmenn) {
        const karakterer = vurderingMap.get(t.id);
        if (karakterer && karakterer.length > 0) {
          t.snittKarakter =
            karakterer.reduce((a, b) => a + b, 0) / karakterer.length;
          t.antallVurderinger = karakterer.length;
        }
      }
    }
  }

  return takstmenn;
}

function getKommuneIntro(kommuneNavn: string, fylkeNavn: string): string {
  return `Leter du etter takstmann i ${kommuneNavn}? Her finner du sertifiserte takstmenn som dekker ${kommuneNavn} og resten av ${fylkeNavn}. Enten du trenger tilstandsrapport ved boligsalg, verditakst for refinansiering, eller skadetakst etter skade — vi hjelper deg å finne riktig fagperson.`;
}

function getKommuneFAQ(kommuneNavn: string, fylkeNavn: string) {
  return [
    {
      sporsmal: `Hva koster en takstmann i ${kommuneNavn}?`,
      svar: `Prisen for takst i ${kommuneNavn} varierer etter type oppdrag. En tilstandsrapport for en enebolig koster typisk mellom 10 000 og 20 000 kroner, mens en verditakst ofte ligger på 3 000–8 000 kroner. Prisen avhenger av boligens størrelse og kompleksitet. Be alltid om tilbud fra flere takstmenn for å sammenligne.`,
    },
    {
      sporsmal: `Trenger jeg tilstandsrapport ved boligsalg i ${kommuneNavn}?`,
      svar: `Det er ikke lovpålagt, men i praksis er det nærmest nødvendig. Endringene i avhendingslova fra 1. januar 2022 fjernet selgers mulighet til å selge bolig «som den er» til forbrukere. Uten tilstandsrapport sitter selger med all risikoen. Fra 1. juli 2026 gjelder den nye standarden NS 3600:2025. En sertifisert takstmann i ${kommuneNavn} sikrer at rapporten oppfyller gjeldende krav.`,
    },
    {
      sporsmal: `Hvordan finner jeg en god takstmann i ${kommuneNavn}?`,
      svar: `På VelgTakst kan du se takstmenn som dekker ${kommuneNavn} og ${fylkeNavn}. Sammenlign fagområder, sertifiseringer og vurderinger for å velge den som passer ditt oppdrag best.`,
    },
    {
      sporsmal: `Hva er forskjellen mellom verditakst og tilstandsrapport?`,
      svar: `En verditakst fastsetter markedsverdien og brukes ved refinansiering, arv eller skifte. En tilstandsrapport dokumenterer den tekniske tilstanden med tilstandsgrader (TG0–TG3) og er i praksis nødvendig ved boligsalg. Mange takstmenn som dekker ${kommuneNavn} tilbyr begge tjenestene.`,
    },
  ];
}

export default async function KommunePage({ params }: Props) {
  const { fylke: fylkeId, kommune: kommuneId } = await params;
  const fylke = FYLKER.find((f) => f.id === fylkeId);
  const kommune = KOMMUNER.find(
    (k) => k.id === kommuneId && k.fylkeId === fylkeId
  );

  if (!fylke || !kommune) notFound();

  const takstmenn = await hentTakstmennIKommune(fylkeId, kommuneId);
  const faq = getKommuneFAQ(kommune.navn, fylke.navn);
  const intro = getKommuneIntro(kommune.navn, fylke.navn);
  const andreKommuner = getKommunerForFylke(fylkeId).filter(
    (k) => k.id !== kommuneId
  );

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Brødsmulesti"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
      >
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-white transition-colors">
              VelgTakst
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/${fylkeId}`}
              className="hover:text-white transition-colors"
            >
              {fylke.navn}
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-300">{kommune.navn}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 glow-text">
          Takstmann i {kommune.navn}
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed max-w-3xl mb-4">
          {intro}
        </p>
        <p className="text-gray-400 leading-relaxed max-w-3xl">
          Takstmennene nedenfor dekker {kommune.navn} og øvrige kommuner i{" "}
          {fylke.navn}. Se profiler, sammenlign spesialiteter og ta kontakt
          direkte.
        </p>
        <div className="gradient-line max-w-xs mt-6 mb-2" />
        <p className="text-sm text-gray-500">
          {takstmenn.length > 0
            ? `${takstmenn.length} takstmenn tilgjengelig i ${fylke.navn}`
            : `Ingen takstmenn registrert i ${fylke.navn} ennå`}
        </p>
      </section>

      {/* Tjenester */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-xl font-bold text-white mb-5">
          Vanlige taksttjenester i {kommune.navn}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              tittel: "Tilstandsrapport",
              beskrivelse:
                "Obligatorisk ved boligsalg. Dokumenterer teknisk tilstand.",
              href: "/blogg/tilstandsrapport-guide",
            },
            {
              tittel: "Verditakst",
              beskrivelse:
                "Verdivurdering ved refinansiering, arv eller skifte.",
              href: "/blogg/verditakst-hva-er-det",
            },
            {
              tittel: "Skadetakst",
              beskrivelse: "Skadedokumentasjon for forsikringsoppgjør.",
              href: "/blogg/hva-er-skadetakst",
            },
            {
              tittel: "Næringstakst",
              beskrivelse: "Verdivurdering av næringseiendommer.",
              href: "/blogg/naeringstakst-bedrifter",
            },
          ].map((t) => (
            <Link
              key={t.tittel}
              href={t.href}
              className="card-hover bg-card-bg border border-card-border rounded-xl p-4 block"
            >
              <h3 className="text-white font-semibold text-sm mb-1">
                {t.tittel}
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                {t.beskrivelse}
              </p>
              <span className="text-accent text-xs font-medium mt-2 inline-block">
                Les mer &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Alle takstmenn */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-xl font-bold text-white mb-6">
          {takstmenn.length > 0
            ? `Takstmenn som dekker ${kommune.navn}`
            : `Takstmenn i ${kommune.navn}`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {takstmenn.map((t) => {
              const andreTjenester = (t.tjenester ?? []).filter(
                (tj) => tj !== t.spesialitet && tj !== t.spesialitet_2
              );

              return (
                <Link
                  key={t.id}
                  href={`/takstmann/${t.id}`}
                  className="card-hover block bg-card-bg border border-card-border rounded-xl overflow-hidden"
                >
                  <div className="flex justify-center pt-6 pb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-accent/20 relative bg-accent/10">
                      {t.bilde_url ? (
                        <Image
                          src={t.bilde_url}
                          alt={t.navn}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-accent font-bold text-3xl">
                          {t.navn.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 text-center">
                    <h3 className="text-white font-semibold text-lg">
                      {t.navn}
                    </h3>

                    {t.snittKarakter !== null ? (
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= Math.round(t.snittKarakter!) ? "text-yellow-400" : "text-gray-600"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs">
                          ({t.antallVurderinger})
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-600 text-xs mt-1">
                        Ingen vurderinger ennå
                      </p>
                    )}

                    <div className="mt-4 text-left space-y-2">
                      {t.spesialitet && (
                        <div>
                          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                            Spesialitet
                          </p>
                          <p className="text-accent text-sm">
                            {t.spesialitet}
                            {t.spesialitet_2 && (
                              <span className="text-gray-500"> · </span>
                            )}
                            {t.spesialitet_2 && (
                              <span>{t.spesialitet_2}</span>
                            )}
                          </p>
                        </div>
                      )}

                      {andreTjenester.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                            Utfører også
                          </p>
                          <p className="text-gray-300 text-sm">
                            {andreTjenester.slice(0, 4).join(", ")}
                            {andreTjenester.length > 4
                              ? ` +${andreTjenester.length - 4}`
                              : ""}
                          </p>
                        </div>
                      )}

                      {t.sertifiseringer?.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                            Sertifisering
                          </p>
                          <p className="text-gray-300 text-sm flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5 text-green-400 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {t.sertifiseringer[0]}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-card-border">
                      <span className="inline-flex items-center gap-2 text-accent text-sm font-medium">
                        Se profil &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Ofte stilte spørsmål om takst i {kommune.navn}
          </h2>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <details
                key={i}
                className="bg-card-bg border border-card-border rounded-xl group"
              >
                <summary className="p-5 cursor-pointer text-white font-semibold flex items-center justify-between list-none">
                  <span>{item.sporsmal}</span>
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
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

      {/* Andre kommuner i fylket */}
      {andreKommuner.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-xl font-bold text-white mb-5 text-center">
            Andre kommuner i {fylke.navn}
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {andreKommuner.slice(0, 30).map((k) => (
              <Link
                key={k.id}
                href={`/${fylkeId}/${k.id}`}
                className="text-sm text-gray-400 hover:text-accent border border-card-border hover:border-accent/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                {k.navn}
              </Link>
            ))}
            {andreKommuner.length > 30 && (
              <Link
                href={`/${fylkeId}`}
                className="text-sm text-accent hover:underline px-3 py-1.5"
              >
                Se alle i {fylke.navn} &rarr;
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Se andre fylker */}
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

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/20 rounded-2xl p-8 sm:p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-3">
            Er du takstmann i {kommune.navn}?
          </h2>
          <p className="text-gray-400 leading-relaxed mb-5 text-sm">
            Bli synlig på VelgTakst og la kunder i {kommune.navn} finne deg.
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

      {/* Structured Data */}
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
                    name: "VelgTakst",
                    item: "https://www.velgtakst.no",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: `Takstmann i ${fylke.navn}`,
                    item: `https://www.velgtakst.no/${fylkeId}`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `Takstmann i ${kommune.navn}`,
                    item: `https://www.velgtakst.no/${fylkeId}/${kommuneId}`,
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

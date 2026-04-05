import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import type { TakstmannMedFylker } from "@/lib/supabase/types";
import { KOMMUNER, getKommunerForFylke } from "@/data/kommuner";
import { KOMMUNE_SEO_CONTENT } from "@/data/kommune-seo-content";
import SertifiseringBadge from "@/components/SertifiseringBadge";

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

  const seoContent = KOMMUNE_SEO_CONTENT[kommuneId];

  const title = seoContent?.seoTitle
    ? `${seoContent.seoTitle} | takstmann.net`
    : `Takstmann i ${kommune.navn} | takstmann.net`;
  const description = seoContent?.metaDescription
    || `Finn sertifisert takstmann i ${kommune.navn}. Bestill tilstandsrapport, verditakst eller skadetakst i ${kommune.navn}. Sammenlign sertifiserte takstmenn i ${fylke.navn} og få tilbud i dag.`;
  const keywords = `takstmann ${kommune.navn}, takst ${kommune.navn}, skadetakst ${kommune.navn}, tilstandsrapport ${kommune.navn}, verditakst ${kommune.navn}, takstmenn ${fylke.navn}, bestill takst ${kommune.navn}`;
  const url = `https://www.takstmann.net/${fylkeId}/${kommuneId}`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "takstmann.net",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `https://www.takstmann.net/${fylkeId}/${kommuneId}`,
    },
  };
}

interface TakstmannKort extends TakstmannMedFylker {
  tjenester: string[];
  snittKarakter: number | null;
  antallVurderinger: number;
  company?: { navn: string; by?: string | null } | null;
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

  // Hent takstmann_id-er fra fylke_synlighet
  let synQuery = supabase
    .from("fylke_synlighet")
    .select("takstmann_id")
    .eq("fylke_id", fylkeId)
    .eq("er_aktiv", true);

  if (takstmannIds) {
    synQuery = synQuery.in("takstmann_id", takstmannIds);
  }

  const { data: synligheter, error: synError } = await synQuery;

  if (synError || !synligheter || synligheter.length === 0) return [];

  const ids = (synligheter as { takstmann_id: string }[]).map((s) => s.takstmann_id);

  // Hent profiler separat
  const { data, error } = await supabase
    .from("takstmann_profiler")
    .select(
      "id, navn, tittel, spesialitet, spesialitet_2, bio, telefon, epost, bilde_url, sertifiseringer, sertifisering, sertifisering_annet, tjenester, created_at, updated_at, user_id, company_id"
    )
    .in("id", ids);

  if (error || !data) return [];

  // Hent firmanavn
  const companyIds = [...new Set((data as TakstmannKort[]).filter((t) => t.company_id).map((t) => t.company_id!))];
  const companyMap = new Map<string, string>();
  const companyByMap = new Map<string, string | null>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, navn, by")
      .in("id", companyIds);
    for (const c of (companies ?? []) as { id: string; navn: string; by: string | null }[]) {
      companyMap.set(c.id, c.navn);
      companyByMap.set(c.id, c.by);
    }
  }

  const takstmenn = (data as unknown as TakstmannKort[]).map((profil) => ({
    ...profil,
    fylke_synlighet: [],
    company: profil.company_id ? { navn: companyMap.get(profil.company_id) ?? "", by: companyByMap.get(profil.company_id) ?? null } : null,
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
  return `Leter du etter takstmann i ${kommuneNavn}? Her finner du sertifiserte takstmenn som tilbyr tilstandsrapport, verditakst, skadetakst og næringstakst i ${kommuneNavn} og resten av ${fylkeNavn}. Enten du skal selge bolig og trenger tilstandsrapport i ${kommuneNavn}, refinansiere og trenger verditakst, eller dokumentere en forsikringsskade med skadetakst i ${kommuneNavn} — vi hjelper deg å finne riktig fagperson.`;
}

function getKommuneFAQ(kommuneNavn: string, _fylkeNavn: string) {
  return [
    {
      sporsmal: `Hva koster en takstmann i ${kommuneNavn}?`,
      svar: `Prisen på en takstmann i ${kommuneNavn} avhenger av type oppdrag og boligens størrelse. En tilstandsrapport for en vanlig enebolig ligger typisk på mellom 8 000 og 20 000 kroner, mens en verdivurdering ofte koster fra 3 000 til 8 000 kroner. Nøyaktig pris får du ved å be om tilbud fra takstmenn som opererer i ${kommuneNavn}.`,
    },
    {
      sporsmal: `Hva er forskjellen på en tilstandsrapport og en verdivurdering?`,
      svar: `En tilstandsrapport er en grundig teknisk gjennomgang av boligen etter NS 3600-standarden, der tilstanden på alt fra tak til grunnmur vurderes og graderes. En verdivurdering er et kortere dokument som fastsetter boligens markedsverdi, ofte brukt ved refinansiering eller arveoppgjør. Ved boligsalg i ${kommuneNavn} er det tilstandsrapporten som er lovpålagt etter avhendingsloven.`,
    },
    {
      sporsmal: `Er det krav om tilstandsrapport ved boligsalg i ${kommuneNavn}?`,
      svar: `Det er ikke et lovkrav å ha tilstandsrapport ved boligsalg, men det er sterkt anbefalt. Etter endringene i avhendingsloven fra 2022 kan selger ikke lenger ta «som den er»-forbehold, noe som betyr at selger har et større ansvar for å opplyse om boligens tilstand. I praksis har rundt 99 % av alle bruktboligtransaksjoner i Norge en tilstandsrapport etter NS 3600 vedlagt. For de fleste selgere i ${kommuneNavn} er det derfor en selvfølge å bestille en.`,
    },
    {
      sporsmal: `Hvordan finner jeg en god takstmann i ${kommuneNavn}?`,
      svar: `Det viktigste er at takstmannen holder seg oppdatert på gjeldende lover og forskrifter. Mange får dette gjennom medlemskap i fagorganisasjoner som BMTF, Norsk Takst eller lignende. Sjekk også at takstmannen har erfaring med boliger i ${kommuneNavn}-området. På takstmann.net kan du sammenligne takstmenn som dekker ${kommuneNavn}.`,
    },
    {
      sporsmal: `Hvor lang tid tar det å få en tilstandsrapport i ${kommuneNavn}?`,
      svar: `Selve befaringen tar vanligvis 2–4 timer avhengig av boligens størrelse. Etter befaring kan du normalt forvente ferdig rapport innen 3–5 virkedager. I perioder med høy aktivitet i boligmarkedet i ${kommuneNavn} kan ventetiden for å få en avtale være noe lenger, så det lønner seg å bestille i god tid før planlagt salg.`,
    },
    {
      sporsmal: `Når trenger jeg en takstmann i ${kommuneNavn}?`,
      svar: `De vanligste situasjonene er ved boligsalg (tilstandsrapport), boligkjøp (kjøpsrådgivning), refinansiering (verdivurdering), arveoppgjør, forsikringssaker etter skade, og ved reklamasjon på feil og mangler. En takstmann i ${kommuneNavn} kan også bistå med vurdering før større oppussingsprosjekter.`,
    },
    {
      sporsmal: `Hva bør jeg forberede før takstmannen kommer?`,
      svar: `Sørg for at takstmannen har tilgang til alle rom, inkludert loft, kjeller, krypkjeller og tekniske rom. Ha gjerne dokumentasjon klar — som tegninger, tidligere tilstandsrapporter, oversikt over utførte oppgraderinger og kvitteringer fra håndverkere. Jo bedre tilgang og dokumentasjon, desto grundigere og mer nøyaktig blir rapporten.`,
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
  const seoContent = KOMMUNE_SEO_CONTENT[kommuneId];
  const faq = seoContent?.faqItems?.length
    ? seoContent.faqItems
    : getKommuneFAQ(kommune.navn, fylke.navn).map((f) => ({
        sporsmal: f.sporsmal,
        svar: f.svar,
      }));
  const intro = seoContent?.intro || getKommuneIntro(kommune.navn, fylke.navn);
  const andreKommuner = getKommunerForFylke(fylkeId).filter(
    (k) => k.id !== kommuneId
  );

  // Nearby kommuner from SEO content (excluding self)
  const naerliggendeKommuner = seoContent?.naerliggendeKommuner
    ? KOMMUNER.filter(
        (k) =>
          seoContent.naerliggendeKommuner.includes(k.id) &&
          k.id !== kommuneId
      )
    : [];

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Brødsmulesti"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
      >
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/" className="hover:text-slate-700 transition-colors">
              takstmann.net
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/${fylkeId}`}
              className="hover:text-slate-700 transition-colors"
            >
              {fylke.navn}
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-600 font-medium">{kommune.navn}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          {seoContent?.h1 || `Takstmann i ${kommune.navn}`}
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mb-3">
          {intro}
        </p>
        <p className="text-sm text-slate-400">
          {takstmenn.length > 0
            ? `${takstmenn.length} takstmenn tilgjengelig i ${fylke.navn}`
            : `Ingen takstmenn registrert i ${fylke.navn} ennå`}
        </p>
      </section>

      {/* Alle takstmenn */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-xl font-bold text-slate-900 mb-6">
          {takstmenn.length > 0
            ? `Takstmenn som dekker ${kommune.navn}`
            : `Takstmenn i ${kommune.navn}`}
        </h2>

        {takstmenn.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <p className="text-slate-500 mb-4">
              Ingen takstmenn har aktivert synlighet i {fylke.navn} ennå.
            </p>
            <Link
              href="/registrer/takstmann"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Er du takstmann? Registrer deg
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {takstmenn.map((t) => {
              const visNavn = t.navn ?? "Ukjent";
              const companyNavn = t.company?.navn;
              const companyBy = t.company?.by;
              const spesialiteter = [t.spesialitet, t.spesialitet_2].filter(Boolean) as string[];
              const andreTjenester = (t.tjenester ?? []).filter(
                (tj) => tj !== t.spesialitet && tj !== t.spesialitet_2
              );
              const erVerifisert = !!t.user_id;

              return (
                <div
                  key={t.id}
                  className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />

                  {/* Profilhode */}
                  <div className="flex items-center gap-4 px-5 pt-5 pb-4">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-blue-500 to-blue-700 relative">
                        {t.bilde_url ? (
                          <Image
                            src={t.bilde_url}
                            alt={visNavn}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                            {visNavn.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {erVerifisert && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-slate-900 font-bold text-base leading-tight truncate">{visNavn}</h3>
                      {companyNavn ? (
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{companyNavn}</p>
                      ) : t.tittel ? (
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{t.tittel}</p>
                      ) : null}
                      {companyBy && (
                        <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {companyBy}
                        </p>
                      )}
                      {erVerifisert && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mt-1 font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Verifisert
                        </span>
                      )}
                      {t.snittKarakter !== null && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg key={s} className={`w-3 h-3 ${s <= Math.round(t.snittKarakter!) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-slate-400 text-xs">({t.antallVurderinger})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sertifisering */}
                  {(t.sertifisering || (t.sertifiseringer?.length ?? 0) > 0) && (
                    <div className="px-5 pb-3">
                      {t.sertifisering ? (
                        <SertifiseringBadge
                          sertifisering={t.sertifisering}
                          sertifiseringAnnet={t.sertifisering_annet}
                          size="sm"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-slate-100 border-slate-200 text-slate-600 text-xs font-medium">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                          {t.sertifiseringer[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tjeneste-badges */}
                  {(spesialiteter.length > 0 || andreTjenester.length > 0) && (
                    <div className="px-5 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {spesialiteter.map((s) => (
                          <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {s}
                          </span>
                        ))}
                        {andreTjenester.slice(0, 3).map((s) => (
                          <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {s}
                          </span>
                        ))}
                        {andreTjenester.length > 3 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200">
                            +{andreTjenester.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Knapper */}
                  <div className="mt-auto px-5 pb-5 pt-3 border-t border-slate-100 flex gap-2">
                    <Link
                      href={`/takstmann/${t.id}`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      Se profil
                    </Link>
                    <Link
                      href={`/takstmann/${t.id}#bestill`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
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

      {/* Tjenester */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-xl font-bold text-slate-900 mb-5">
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
              className="card-hover bg-white border border-slate-200 rounded-xl p-4 block"
            >
              <h3 className="text-slate-900 font-semibold text-sm mb-1">
                {t.tittel}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {t.beskrivelse}
              </p>
              <span className="text-blue-600 text-xs font-medium mt-2 inline-block">
                Les mer &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* SEO Sections (rich content for top 50 kommuner) */}
      {seoContent?.sections && seoContent.sections.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-8">
          {seoContent.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                {section.heading}
              </h2>
              <div className="text-slate-600 leading-relaxed max-w-3xl">
                {section.content.split("\n").map((para, j) =>
                  para.trim() ? (
                    <p key={j} className="mb-2">
                      {para.trim()}
                    </p>
                  ) : null
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* FAQ */}
      <section className="bg-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Ofte stilte spørsmål om takst i {kommune.navn}
            </h2>
            <div className="space-y-3">
              {faq.map((item, i) => (
                <details
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl group shadow-sm"
                >
                  <summary className="p-5 cursor-pointer text-slate-900 font-semibold flex items-center justify-between list-none">
                    <span>{item.sporsmal}</span>
                    <svg
                      className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-4"
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
                  <div className="px-5 pb-5 text-slate-600 leading-relaxed text-sm">
                    {item.svar}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nærliggende områder (SEO content) */}
      {seoContent?.naerliggendeText && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Nærliggende områder
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              {seoContent.naerliggendeText}
            </p>
            {naerliggendeKommuner.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {naerliggendeKommuner.map((k) => (
                  <Link
                    key={k.id}
                    href={`/${k.fylkeId}/${k.id}`}
                    className="text-sm text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors bg-white"
                  >
                    Takstmann i {k.navn}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Andre kommuner i fylket */}
      {andreKommuner.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-xl font-bold text-slate-900 mb-5 text-center">
            Andre kommuner i {fylke.navn}
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {andreKommuner.slice(0, 30).map((k) => (
              <Link
                key={k.id}
                href={`/${fylkeId}/${k.id}`}
                className="text-sm text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors bg-white"
              >
                {k.navn}
              </Link>
            ))}
            {andreKommuner.length > 30 && (
              <Link
                href={`/${fylkeId}`}
                className="text-sm text-blue-600 hover:underline px-3 py-1.5"
              >
                Se alle i {fylke.navn} &rarr;
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Se andre fylker */}
      <section className="bg-slate-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-900 mb-5 text-center">
            Se takstmenn i andre fylker
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {FYLKER.filter((f) => f.id !== fylkeId).map((f) => (
              <Link
                key={f.id}
                href={`/${f.id}`}
                className="text-sm text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors bg-white"
              >
                {f.navn}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">
            Er du takstmann i {kommune.navn}?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-5 text-sm max-w-xl mx-auto">
            Bli synlig på takstmann.net og la kunder i {kommune.navn} finne deg.
            Registrer deg, aktiver profilen din og start å motta henvendelser.
          </p>
          <Link
            href="/registrer/takstmann"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
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
                    name: "takstmann.net",
                    item: "https://www.takstmann.net",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: `Takstmann i ${fylke.navn}`,
                    item: `https://www.takstmann.net/${fylkeId}`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: `Takstmann i ${kommune.navn}`,
                    item: `https://www.takstmann.net/${fylkeId}/${kommuneId}`,
                  },
                ],
              },
              {
                "@type": "ProfessionalService",
                name: `Takstmann i ${kommune.navn} – takstmann.net`,
                description: `Finn sertifisert takstmann i ${kommune.navn} for tilstandsrapport, verditakst, skadetakst og næringstakst.`,
                url: `https://www.takstmann.net/${fylkeId}/${kommuneId}`,
                areaServed: [
                  {
                    "@type": "City",
                    name: kommune.navn,
                    containedInPlace: {
                      "@type": "AdministrativeArea",
                      name: fylke.navn,
                      containedInPlace: {
                        "@type": "Country",
                        name: "Norge",
                      },
                    },
                  },
                ],
                hasOfferCatalog: {
                  "@type": "OfferCatalog",
                  name: `Taksttjenester i ${kommune.navn}`,
                  itemListElement: [
                    { "@type": "Offer", itemOffered: { "@type": "Service", name: `Tilstandsrapport ${kommune.navn}` } },
                    { "@type": "Offer", itemOffered: { "@type": "Service", name: `Verditakst ${kommune.navn}` } },
                    { "@type": "Offer", itemOffered: { "@type": "Service", name: `Skadetakst ${kommune.navn}` } },
                    { "@type": "Offer", itemOffered: { "@type": "Service", name: `Næringstakst ${kommune.navn}` } },
                  ],
                },
                provider: {
                  "@type": "Organization",
                  name: "takstmann.net",
                  url: "https://www.takstmann.net",
                },
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

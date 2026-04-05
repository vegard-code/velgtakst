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

export const revalidate = 3600;

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

const FYLKE_INTRO: Record<string, string> = {
  oslo: "Oslo er Norges mest folkerike fylke med et aktivt boligmarked. Høy omsetning av leiligheter, rekkehus og eneboliger gjør at behovet for kvalifiserte takstmenn er stort hele året.",
  rogaland: "Rogaland har et aktivt boligmarked fra Stavanger-regionen til mindre steder langs kysten. Olje- og energisektoren gir jevnt behov for taksttjenester, både for boliger og næringseiendommer.",
  vestland: "Vestland fylke, med Bergen som sentrum, har et mangfoldig boligmarked med både tett bymessig bebyggelse og spredt bosetting langs fjordene. Det fuktige vestlandsklima gjør tilstandsvurderinger ekstra viktige her.",
  trondelag: "Trøndelag, med Trondheim som regionhovedstad, er et voksende boligmarked med høy omsetning. Studentmiljøet gir stort innslag av utleieboliger, og behovet for tilstandsrapporter og verditakster er jevnt gjennom hele året.",
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
  company?: { navn: string; by?: string | null } | null
  vipps_verifisert?: boolean
}

async function hentTakstmennIFylke(fylkeId: string): Promise<TakstmannKort[]> {
  const supabase = await createClient();

  const { data: synligheter, error: synError } = await supabase
    .from("fylke_synlighet")
    .select("takstmann_id")
    .eq("fylke_id", fylkeId)
    .eq("er_aktiv", true);

  if (synError || !synligheter || synligheter.length === 0) return [];

  const ids = (synligheter as { takstmann_id: string }[]).map((s) => s.takstmann_id);

  const { data, error } = await supabase
    .from("takstmann_profiler")
    .select(
      "id, navn, tittel, spesialitet, spesialitet_2, bio, telefon, epost, bilde_url, sertifiseringer, sertifisering, sertifisering_annet, tjenester, created_at, updated_at, user_id, company_id, vipps_verifisert"
    )
    .in("id", ids);

  if (error || !data) return [];

  const takstmenn = (data as unknown as TakstmannKort[]).map((profil) => ({
    ...profil,
    fylke_synlighet: [],
    snittKarakter: null as number | null,
    antallVurderinger: 0,
    company: null as { navn: string; by?: string | null } | null,
  }));

  const companyIds = [...new Set(takstmenn.filter((t) => t.company_id).map((t) => t.company_id!))];
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, navn, by")
      .in("id", companyIds);
    if (companies) {
      const companyMap = new Map((companies as { id: string; navn: string; by: string | null }[]).map((c) => [c.id, c]));
      for (const t of takstmenn) {
        if (t.company_id && companyMap.has(t.company_id)) {
          const c = companyMap.get(t.company_id)!;
          t.company = { navn: c.navn, by: c.by };
        }
      }
    }
  }

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
      <nav aria-label="Brødsmulesti" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li>
            <Link href="/" className="hover:text-slate-700 transition-colors">takstmann.net</Link>
          </li>
          <li>/</li>
          <li className="text-slate-600 font-medium">{fylke.navn}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Takstmann i {fylke.navn}
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mb-4">
          {intro}
        </p>
        <p className="text-slate-500 leading-relaxed max-w-3xl">
          Finn sertifiserte takstmenn i {fylke.navn} som kan hjelpe med{" "}
          <Link href="/blogg/tilstandsrapport-guide" className="text-blue-600 hover:underline">tilstandsrapport</Link>,{" "}
          <Link href="/blogg/verditakst-hva-er-det" className="text-blue-600 hover:underline">verditakst</Link>,{" "}
          <Link href="/blogg/hva-er-skadetakst" className="text-blue-600 hover:underline">skadetakst</Link>{" "}
          og andre taksttjenester.
        </p>
        <div className="gradient-line max-w-xs mt-6 mb-2" />
        <p className="text-sm text-slate-400">
          {takstmenn.length > 0
            ? `${takstmenn.length} sertifiserte takstmenn tilgjengelig i ${fylke.navn}`
            : `Ingen takstmenn registrert i ${fylke.navn} ennå`}
        </p>
      </section>

      {/* Tilfeldig spinner */}
      {takstmenn.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <RandomSpinnerWrapper takstmenn={takstmenn} fylkeNavn={fylke.navn} />
        </section>
      )}

      {/* Alle takstmenn */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <h2 className="text-xl font-bold text-slate-900 mb-6">
          {takstmenn.length > 0
            ? `Alle takstmenn i ${fylke.navn}`
            : `Takstmenn i ${fylke.navn}`}
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
              const alleTjenester = t.tjenester ?? [];
              const spesialiteter = [t.spesialitet, t.spesialitet_2].filter(Boolean) as string[];
              const andreTjenester = alleTjenester.filter(
                (tj) => tj !== t.spesialitet && tj !== t.spesialitet_2
              );
              const visNavn = t.navn ?? "Ukjent";
              const companyNavn = t.company?.navn;
              const companyBy = t.company?.by;
              const erVerifisert = !!t.vipps_verifisert;

              return (
                <div
                  key={t.id}
                  className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Fargestripe */}
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
                          <span
                            key={s}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {s}
                          </span>
                        ))}
                        {andreTjenester.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                          >
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

      {/* Tjenester folk trenger */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-5">
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
              className="card-hover bg-white border border-slate-200 rounded-xl p-4 block"
            >
              <h3 className="text-slate-900 font-semibold text-sm mb-1">{t.tittel}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{t.beskrivelse}</p>
              <span className="text-blue-600 text-xs font-medium mt-2 inline-block">Les mer &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Kommuner i fylket */}
      {(() => {
        const kommuner = getKommunerForFylke(fylkeId);
        if (kommuner.length === 0) return null;
        return (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-5 text-center">
              Finn takstmann i din kommune i {fylke.navn}
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {kommuner.map((k) => (
                <Link
                  key={k.id}
                  href={`/${fylkeId}/${k.id}`}
                  className="text-sm text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors bg-white"
                >
                  {k.navn}
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* FAQ */}
      <section className="bg-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Ofte stilte spørsmål om takst i {fylke.navn}
            </h2>
            <div className="space-y-3">
              {faq.map((item, i) => (
                <details
                  key={i}
                  className="bg-white border border-slate-200 rounded-xl group shadow-sm"
                >
                  <summary className="p-5 cursor-pointer text-slate-900 font-semibold flex items-center justify-between list-none">
                    <span>{item.sporsmal}</span>
                    <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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

      {/* Blogginnlegg */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Nyttige artikler om takst</h2>
          <Link href="/blogg" className="text-blue-600 text-sm font-medium hover:underline">
            Se alle &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bloggposter.slice(0, 6).map((post) => (
            <Link
              key={post.id}
              href={`/blogg/${post.id}`}
              className="card-hover block bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="p-5">
                <h3 className="text-slate-900 font-semibold text-sm mb-2 leading-snug">
                  {post.tittel}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                  {post.ingress}
                </p>
                <span className="inline-block mt-3 text-blue-600 text-xs font-medium">
                  Les mer &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Andre fylker */}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-3">
            Er du takstmann i {fylke.navn}?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6 text-sm">
            Bli synlig på takstmann.net og la kunder i {fylke.navn} finne deg.
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

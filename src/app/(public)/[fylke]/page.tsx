import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import type { TakstmannMedFylker } from "@/lib/supabase/types";
import RandomSpinnerWrapper from "@/components/RandomSpinnerWrapper";

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
    title: `Takstmenn i ${fylke.navn} | VelgTakst`,
    description: `Finn sertifiserte takstmenn i ${fylke.navn}. Erfarne takstmenn for boligtaksering, tilstandsrapporter og verditakster.`,
  };
}

async function hentTakstmennIFylke(fylkeId: string): Promise<TakstmannMedFylker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fylke_synlighet")
    .select(
      `
      takstmann_id,
      takstmann_profiler!inner (
        id, navn, tittel, spesialitet, bio, telefon, epost, bilde_url, sertifiseringer, created_at, updated_at, user_id, company_id
      )
    `
    )
    .eq("fylke_id", fylkeId)
    .eq("er_aktiv", true);

  if (error || !data) return [];

  return (data as unknown as { takstmann_profiler: TakstmannMedFylker }[]).map((row) => ({
    ...row.takstmann_profiler,
    fylke_synlighet: [],
  }));
}

export default async function FylkePage({ params }: Props) {
  const { fylke: fylkeId } = await params;
  const fylke = FYLKER.find((f) => f.id === fylkeId);
  if (!fylke) notFound();

  const takstmenn = await hentTakstmennIFylke(fylkeId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake til forsiden
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 glow-text">
        Takstmenn i {fylke.navn}
      </h1>
      <p className="text-gray-400 mb-10">
        {takstmenn.length > 0
          ? `${takstmenn.length} sertifiserte takstmenn tilgjengelig`
          : "Ingen takstmenn registrert i dette fylket ennå"}
      </p>

      {takstmenn.length > 0 && (
        <RandomSpinnerWrapper takstmenn={takstmenn} fylkeNavn={fylke.navn} />
      )}

      <h2 className="text-xl font-bold text-white mb-6">
        Alle takstmenn i {fylke.navn}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {takstmenn.map((t) => (
            <Link
              key={t.id}
              href={`/takstmann/${t.id}`}
              className="card-hover block bg-card-bg border border-card-border rounded-xl p-5"
            >
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-accent/20 shrink-0 relative bg-accent/10">
                  {t.bilde_url ? (
                    <Image
                      src={t.bilde_url}
                      alt={t.navn}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-accent font-bold text-xl">
                      {t.navn.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate">{t.navn}</h3>
                  {t.tittel && (
                    <p className="text-gray-500 text-xs mb-1">{t.tittel}</p>
                  )}
                  {t.spesialitet && (
                    <p className="text-accent text-sm mb-2">{t.spesialitet}</p>
                  )}
                  {t.telefon && (
                    <p className="text-gray-400 text-xs">{t.telefon}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-card-border flex items-center justify-between">
                {t.sertifiseringer?.length > 0 && (
                  <p className="text-gray-500 text-xs">
                    {t.sertifiseringer[0]}
                    {t.sertifiseringer.length > 1 && ` +${t.sertifiseringer.length - 1}`}
                  </p>
                )}
                <span className="text-accent text-xs font-medium ml-auto">
                  Se profil &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

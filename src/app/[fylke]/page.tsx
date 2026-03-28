import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import data from "@/data/takstmenn.json";
import RandomSpinner from "@/components/RandomSpinner";

interface Props {
  params: Promise<{ fylke: string }>;
}

export async function generateStaticParams() {
  return data.fylker.map((f) => ({ fylke: f.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fylke: fylkeId } = await params;
  const fylke = data.fylker.find((f) => f.id === fylkeId);
  if (!fylke) return {};
  return {
    title: `Takstmenn i ${fylke.navn} | VelgTakst - Velg en sertifisert takstmann`,
    description: `Finn sertifiserte takstmenn i ${fylke.navn}. ${fylke.takstmenn.length} erfarne takstmenn klare for oppdrag innen boligtaksering, tilstandsrapporter og verditakster.`,
  };
}

export default async function FylkePage({ params }: Props) {
  const { fylke: fylkeId } = await params;
  const fylke = data.fylker.find((f) => f.id === fylkeId);
  if (!fylke) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake til forsiden
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 glow-text">
        Takstmenn i {fylke.navn}
      </h1>
      <p className="text-gray-400 mb-10">
        {fylke.takstmenn.length} sertifiserte takstmenn tilgjengelig
      </p>

      <RandomSpinner takstmenn={fylke.takstmenn} fylkeNavn={fylke.navn} />

      <h2 className="text-xl font-bold text-white mb-6">
        Alle takstmenn i {fylke.navn}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fylke.takstmenn.map((t) => (
          <div
            key={t.id}
            className="card-hover bg-card-bg border border-card-border rounded-xl p-5 flex gap-4 items-start"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden border border-accent/20 shrink-0 relative">
              <Image
                src={t.bilde}
                alt={t.navn}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">{t.navn}</h3>
              <p className="text-accent text-sm mb-2">{t.spesialitet}</p>
              <p className="text-gray-400 text-xs">{t.telefon}</p>
              <p className="text-gray-400 text-xs truncate">{t.epost}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

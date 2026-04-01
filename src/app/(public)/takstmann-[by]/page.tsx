import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { KOMMUNER } from "@/data/kommuner";
import { FYLKER } from "@/lib/supabase/types";

export const revalidate = 900;

interface Props {
  params: Promise<{ by: string }>;
}

// Bygg en map fra kommune-id til fylke-id for rask oppslag
function finnKommuneOgFylke(by: string) {
  const kommune = KOMMUNER.find((k) => k.id === by);
  if (!kommune) return null;
  const fylke = FYLKER.find((f) => f.id === kommune.fylkeId);
  if (!fylke) return null;
  return { kommune, fylke };
}

export async function generateStaticParams() {
  return KOMMUNER.map((k) => ({ by: k.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { by } = await params;
  const match = finnKommuneOgFylke(by);
  if (!match) return {};

  const { kommune, fylke } = match;
  const canonicalUrl = `https://www.takstmann.net/${fylke.id}/${kommune.id}`;

  return {
    title: `Takstmann i ${kommune.navn} | VelgTakst`,
    description: `Finn sertifiserte takstmenn i ${kommune.navn}, ${fylke.navn}. Tilstandsrapport, verditakst og skadetakst.`,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function TakstmannByPage({ params }: Props) {
  const { by } = await params;
  const match = finnKommuneOgFylke(by);

  if (!match) notFound();

  // Permanent redirect (308) til den kanoniske URL-en
  redirect(`/${match.fylke.id}/${match.kommune.id}`);
}

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { TakstmannProfil, MeglerVurdering, FylkeSynlighet } from "@/lib/supabase/types";

export const revalidate = 900;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("takstmann_profiler")
    .select("navn, spesialitet")
    .eq("id", id)
    .single();

  if (!data) return {};
  const d = data as unknown as Pick<TakstmannProfil, "navn" | "spesialitet">;
  return {
    title: `${d.navn} – Takstmann | VelgTakst`,
    description: `Se profil, sertifiseringer og kontaktinfo for ${d.navn}. ${d.spesialitet ?? ""}`,
  };
}

export default async function TakstmannProfilPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profilRaw } = await supabase
    .from("takstmann_profiler")
    .select("*")
    .eq("id", id)
    .single();

  if (!profilRaw) notFound();
  const profil = profilRaw as unknown as TakstmannProfil;

  // Hent vurderinger
  const { data: vurderingerRaw } = await supabase
    .from("megler_vurderinger")
    .select("*")
    .eq("takstmann_id", id)
    .order("created_at", { ascending: false });
  const vurderinger = (vurderingerRaw ?? []) as unknown as MeglerVurdering[];

  // Hent aktive fylker
  const { data: fylkerRaw } = await supabase
    .from("fylke_synlighet")
    .select("fylke_id")
    .eq("takstmann_id", id)
    .eq("er_aktiv", true);
  const fylker = (fylkerRaw ?? []) as unknown as Pick<FylkeSynlighet, "fylke_id">[];

  const snittKarakter =
    vurderinger && vurderinger.length > 0
      ? vurderinger.reduce((sum, v) => sum + (v.karakter ?? 0), 0) /
        vurderinger.length
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake
      </Link>

      {/* Profil-header */}
      <div className="bg-card-bg border border-card-border rounded-2xl p-8 mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-accent/30 shrink-0 relative bg-accent/10">
            {profil.bilde_url ? (
              <Image
                src={profil.bilde_url}
                alt={profil.navn}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent font-bold text-3xl">
                {profil.navn.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {profil.navn}
            </h1>
            {profil.tittel && (
              <p className="text-gray-400 mb-2">{profil.tittel}</p>
            )}
            {profil.spesialitet && (
              <span className="inline-block bg-accent/10 border border-accent/20 text-accent text-sm px-3 py-1 rounded-full mb-3">
                {profil.spesialitet}
              </span>
            )}
            {snittKarakter !== null && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-4 h-4 ${s <= Math.round(snittKarakter) ? "text-yellow-400" : "text-gray-600"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-400 text-sm">
                  {snittKarakter.toFixed(1)} ({vurderinger?.length} vurderinger)
                </span>
              </div>
            )}
          </div>
        </div>

        {profil.bio && (
          <div className="mt-6 pt-6 border-t border-card-border">
            <h2 className="text-white font-semibold mb-3">Om meg</h2>
            <p className="text-gray-400 leading-relaxed">{profil.bio}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Kontaktinfo */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Kontaktinformasjon</h2>
          <ul className="space-y-3">
            {profil.telefon && (
              <li className="flex items-center gap-3 text-gray-400">
                <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href={`tel:${profil.telefon}`} className="hover:text-white transition-colors">
                  {profil.telefon}
                </a>
              </li>
            )}
            {profil.epost && (
              <li className="flex items-center gap-3 text-gray-400">
                <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${profil.epost}`} className="hover:text-white transition-colors truncate">
                  {profil.epost}
                </a>
              </li>
            )}
          </ul>

          <Link
            href={`/registrer/kunde?takstmann=${profil.id}`}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Bestill takst
          </Link>
        </div>

        {/* Sertifiseringer & Fylker */}
        <div className="space-y-6">
          {profil.sertifiseringer && profil.sertifiseringer.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">Sertifiseringer</h2>
              <ul className="space-y-2">
                {profil.sertifiseringer.map((sert, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {sert}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fylker && fylker.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">Aktiv i fylker</h2>
              <div className="flex flex-wrap gap-2">
                {fylker.map((f) => (
                  <Link
                    key={f.fylke_id}
                    href={`/${f.fylke_id}`}
                    className="bg-accent/10 border border-accent/20 text-accent text-xs px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
                  >
                    {f.fylke_id}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vurderinger */}
      {vurderinger && vurderinger.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-white font-semibold mb-6">
            Vurderinger ({vurderinger.length})
          </h2>
          <div className="space-y-4">
            {vurderinger.map((v: MeglerVurdering) => (
              <div
                key={v.id}
                className="border-b border-card-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg
                        key={s}
                        className={`w-4 h-4 ${s <= (v.karakter ?? 0) ? "text-yellow-400" : "text-gray-600"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <time className="text-gray-500 text-xs">
                    {new Date(v.created_at).toLocaleDateString("nb-NO")}
                  </time>
                </div>
                {v.kommentar && (
                  <p className="text-gray-400 text-sm">{v.kommentar}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

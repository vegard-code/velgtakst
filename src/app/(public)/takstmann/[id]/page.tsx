import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FYLKER } from "@/lib/supabase/types";
import type { TakstmannProfil, MeglerVurdering, FylkeSynlighet } from "@/lib/supabase/types";
import BestillTakstKnapp from "./BestillTakstKnapp";

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

  // Hent firmanavn
  const { data: companyRaw } = profil.company_id
    ? await supabase.from("companies").select("navn").eq("id", profil.company_id).single()
    : { data: null };
  const companyNavn = (companyRaw as { navn: string } | null)?.navn;

  // Sjekk innlogget bruker og hent profilID for bestilling
  const { data: { user } } = await supabase.auth.getUser();
  let kundeProfilId: string | undefined;
  let meglerProfilId: string | undefined;

  if (user) {
    const { data: kundeP } = await supabase
      .from("privatkunde_profiler")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (kundeP) {
      kundeProfilId = (kundeP as { id: string }).id;
    } else {
      const { data: meglerP } = await supabase
        .from("megler_profiler")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (meglerP) meglerProfilId = (meglerP as { id: string }).id;
    }
  }

  const snittKarakter =
    vurderinger && vurderinger.length > 0
      ? vurderinger.reduce((sum, v) => sum + (v.karakter ?? 0), 0) /
        vurderinger.length
      : null;

  const andreTjenester = (profil.tjenester ?? []).filter(
    (t) => t !== profil.spesialitet && t !== profil.spesialitet_2
  );

  const fylkeNavn = (id: string) => FYLKER.find((f) => f.id === id)?.navn ?? id;

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
      <div className="bg-card-bg border border-card-border rounded-2xl p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-accent/30 shrink-0 relative bg-accent/10">
            {profil.bilde_url ? (
              <Image
                src={profil.bilde_url}
                alt={profil.navn}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent font-bold text-4xl">
                {profil.navn.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {profil.navn}
            </h1>
            {companyNavn && (
              <p className="text-gray-400 mb-2">{companyNavn}</p>
            )}
            {profil.tittel && (
              <p className="text-gray-500 text-sm mb-3">{profil.tittel}</p>
            )}

            {/* Vurderingsstjerner */}
            {snittKarakter !== null ? (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-5 h-5 ${s <= Math.round(snittKarakter) ? "text-yellow-400" : "text-gray-600"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white font-semibold">{snittKarakter.toFixed(1)}</span>
                <span className="text-gray-400 text-sm">
                  ({vurderinger?.length} {vurderinger?.length === 1 ? "vurdering" : "vurderinger"})
                </span>
              </div>
            ) : (
              <p className="text-gray-600 text-sm mb-3">Ingen vurderinger ennå</p>
            )}

            {/* Kontaktinfo inline */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {profil.telefon && (
                <a href={`tel:${profil.telefon}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {profil.telefon}
                </a>
              )}
              {profil.epost && (
                <a href={`mailto:${profil.epost}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profil.epost}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Venstre kolonne: Tjenester, bio, sertifiseringer */}
        <div className="md:col-span-2 space-y-6">
          {/* Spesialitet og tjenester */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            {profil.spesialitet && (
              <div className="mb-5">
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Spesialitet</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-accent/15 border border-accent/25 text-accent text-sm px-3 py-1.5 rounded-lg font-medium">{profil.spesialitet}</span>
                  {profil.spesialitet_2 && (
                    <span className="bg-accent/15 border border-accent/25 text-accent text-sm px-3 py-1.5 rounded-lg font-medium">{profil.spesialitet_2}</span>
                  )}
                </div>
              </div>
            )}

            {andreTjenester.length > 0 && (
              <div className="mb-5">
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Utfører også</h2>
                <div className="flex flex-wrap gap-2">
                  {andreTjenester.map((t) => (
                    <span key={t} className="bg-gray-800/50 border border-gray-700 text-gray-300 text-sm px-3 py-1.5 rounded-lg">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {profil.sertifiseringer && profil.sertifiseringer.length > 0 && (
              <div>
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Sertifiseringer</h2>
                <ul className="space-y-2">
                  {profil.sertifiseringer.map((sert, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {sert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Om meg */}
          {profil.bio && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6">
              <h2 className="text-white font-semibold mb-3">Om meg</h2>
              <p className="text-gray-400 leading-relaxed whitespace-pre-line">{profil.bio}</p>
            </div>
          )}
        </div>

        {/* Høyre kolonne: Send forespørsel + fylker */}
        <div className="space-y-6">
          {/* Bestill takst */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <h2 className="text-white font-semibold mb-2">Trenger du takst?</h2>
            <p className="text-gray-400 text-sm mb-4">
              Send en bestilling til {profil.navn.split(" ")[0]}, så avtaler dere pris og tidspunkt.
            </p>
            <BestillTakstKnapp
              takstmannId={profil.id}
              takstmannNavn={profil.navn}
              tjenester={profil.tjenester ?? []}
              kundeProfilId={kundeProfilId}
              meglerProfilId={meglerProfilId}
              isLoggedIn={!!user}
            />
          </div>

          {/* Aktiv i fylker */}
          {fylker && fylker.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6">
              <h2 className="text-white font-semibold mb-3">Dekker disse fylkene</h2>
              <div className="flex flex-wrap gap-2">
                {fylker.map((f) => (
                  <Link
                    key={f.fylke_id}
                    href={`/${f.fylke_id}`}
                    className="bg-accent/10 border border-accent/20 text-accent text-sm px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    {fylkeNavn(f.fylke_id)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vurderinger */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h2 className="text-white font-semibold mb-6">
          Vurderinger {vurderinger.length > 0 && `(${vurderinger.length})`}
        </h2>
        {vurderinger.length > 0 ? (
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
        ) : (
          <p className="text-gray-500 text-sm">Ingen vurderinger ennå. Bli den første til å gi en tilbakemelding!</p>
        )}
      </div>
    </div>
  );
}

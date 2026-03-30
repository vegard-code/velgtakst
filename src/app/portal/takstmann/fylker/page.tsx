import { createClient } from "@/lib/supabase/server";
import { FYLKER, getFylkePris } from "@/lib/supabase/types";
import FylkeToggleKort from "./FylkeToggleKort";

export default async function FylkerSynlighetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: takstmannProfil } = await supabase
    .from("takstmann_profiler")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: synligheter } = takstmannProfil
    ? await supabase
        .from("fylke_synlighet")
        .select("*")
        .eq("takstmann_id", takstmannProfil.id)
    : { data: [] };

  const synlighetsMap: Record<string, { er_aktiv: boolean; betalt_til: string | null }> = {};
  for (const s of synligheter ?? []) {
    synlighetsMap[s.fylke_id] = { er_aktiv: s.er_aktiv, betalt_til: s.betalt_til };
  }

  const aktiveFylker = Object.values(synlighetsMap).filter((s) => s.er_aktiv).length;
  const maanedligKostnad = FYLKER.filter((f) => synlighetsMap[f.id]?.er_aktiv).reduce(
    (sum, f) => sum + getFylkePris(f.id),
    0
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Fylkesynlighet</h1>
          <p className="text-[#64748b] text-sm mt-0.5">
            Velg hvilke fylker du vil vises i. Du betaler kun for de aktive fylkene.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#64748b]">{aktiveFylker} aktive fylker</p>
          <p className="text-xl font-bold text-[#285982]">{maanedligKostnad} kr/mnd</p>
        </div>
      </div>

      {/* Prisoversikt */}
      <div className="portal-card p-5 mb-6 bg-gradient-to-r from-[#f0f4f8] to-white">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#285982] flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1e293b]">Standard fylker</p>
              <p className="text-[#285982] font-bold">199 kr/mnd</p>
            </div>
          </div>
          <div className="sm:border-l sm:border-[#e2e8f0] sm:pl-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1e4468] flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1e293b]">Store fylker (Oslo, Rogaland, Vestland, Trøndelag, Akershus)</p>
              <p className="text-[#285982] font-bold">299 kr/mnd</p>
            </div>
          </div>
        </div>
      </div>

      {!takstmannProfil && (
        <div className="portal-card p-6 text-center mb-6">
          <p className="text-[#64748b]">Du må fullføre takstmann-profilen din først.</p>
        </div>
      )}

      {/* Fylkeliste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FYLKER.map((fylke) => {
          const synlighet = synlighetsMap[fylke.id];
          return (
            <FylkeToggleKort
              key={fylke.id}
              fylke={fylke}
              erAktiv={synlighet?.er_aktiv ?? false}
              betaltTil={synlighet?.betalt_til ?? null}
              takstmannId={takstmannProfil?.id ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TakstmannVurderingerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <p className="text-[#94a3b8]">Ikke innlogget</p>;

  const { data: tProfil } = await supabase
    .from("takstmann_profiler")
    .select("id, navn")
    .eq("user_id", user.id)
    .single();

  if (!tProfil) return <p className="text-[#94a3b8]">Ingen takstmannprofil funnet</p>;

  const profil = tProfil as unknown as { id: string; navn: string };

  const { data: vurderingerRaw } = await supabase
    .from("megler_vurderinger")
    .select(`
      id, karakter, kommentar, created_at,
      megler:megler_profiler(navn),
      kunde:privatkunde_profiler(navn)
    `)
    .eq("takstmann_id", profil.id)
    .order("created_at", { ascending: false });

  const vurderinger = (vurderingerRaw ?? []) as unknown as {
    id: string;
    karakter: number;
    kommentar: string | null;
    created_at: string;
    megler: { navn: string } | null;
    kunde: { navn: string } | null;
  }[];

  const snitt = vurderinger.length > 0
    ? Math.round((vurderinger.reduce((s, v) => s + (v.karakter ?? 0), 0) / vurderinger.length) * 10) / 10
    : null;

  // Fordeling per karakter
  const fordeling: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  vurderinger.forEach((v) => {
    if (v.karakter && fordeling[v.karakter] !== undefined) {
      fordeling[v.karakter]++;
    }
  });
  const maxFordeling = Math.max(...Object.values(fordeling), 1);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Mine vurderinger</h1>
          <p className="text-sm text-[#64748b]">Se hva kunder og meglere sier om deg</p>
        </div>
        <Link href="/portal/takstmann" className="text-sm text-[#285982] hover:underline">
          Tilbake
        </Link>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="portal-card p-5 text-center">
          <p className="text-3xl font-bold text-[#1e293b]">{vurderinger.length}</p>
          <p className="text-xs text-[#64748b] mt-1">Vurderinger totalt</p>
        </div>
        <div className="portal-card p-5 text-center">
          <p className="text-3xl font-bold text-amber-500">{snitt ?? "–"} ★</p>
          <p className="text-xs text-[#64748b] mt-1">Gjennomsnittlig karakter</p>
        </div>
        <div className="portal-card p-5">
          <p className="text-xs font-semibold text-[#64748b] mb-2">Fordeling</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-[#64748b] w-4 text-right">{k}</span>
                <span className="text-amber-400 text-xs">★</span>
                <div className="flex-1 h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(fordeling[k] / maxFordeling) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[#94a3b8] w-6 text-right">{fordeling[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vurderinger liste */}
      <div className="space-y-3">
        {vurderinger.length === 0 ? (
          <div className="portal-card p-8 text-center">
            <p className="text-[#94a3b8] text-sm mb-2">Du har ingen vurderinger ennå.</p>
            <p className="text-[#94a3b8] text-xs">Vurderinger vises her etter at kunder og meglere har fullført oppdrag.</p>
          </div>
        ) : (
          vurderinger.map((v) => {
            const avsender = v.kunde?.navn ?? v.megler?.navn ?? "Anonym";
            const avsenderType = v.kunde ? "Kunde" : v.megler ? "Megler" : "";
            return (
              <div key={v.id} className="portal-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <svg
                            key={s}
                            className={`w-4 h-4 ${s <= (v.karakter ?? 0) ? "text-amber-400" : "text-[#d1d5db]"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-[#1e293b]">{avsender}</span>
                      {avsenderType && (
                        <span className="portal-badge portal-badge-gray text-[10px]">{avsenderType}</span>
                      )}
                    </div>
                    {v.kommentar && (
                      <p className="text-[#64748b] text-sm leading-relaxed">{v.kommentar}</p>
                    )}
                  </div>
                  <time className="text-[#94a3b8] text-xs whitespace-nowrap">
                    {new Date(v.created_at).toLocaleDateString("nb-NO")}
                  </time>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

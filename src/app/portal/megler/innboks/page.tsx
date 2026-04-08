import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hentSamtaler } from "@/lib/actions/meldinger";
import { hentMinebestillinger } from "@/lib/actions/bestillinger";

export default async function MeglerInnboksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [bestillinger, samtaler] = await Promise.all([
    hentMinebestillinger("megler"),
    hentSamtaler(),
  ]);

  const ulesteSamtaler = (samtaler ?? []).filter((s) => s.uleste > 0);
  const aktiveBestillinger = bestillinger.filter((b) => !["kansellert", "avvist", "fullfort"].includes(b.status));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]">Innboks</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Bestillinger og uleste meldinger</p>
      </div>

      {/* Aktive bestillinger */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide">Aktive bestillinger</h2>
          <Link href="/portal/megler/bestillinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {aktiveBestillinger.length === 0 ? (
          <div className="portal-card p-6 text-center text-sm text-[#94a3b8]">Ingen aktive bestillinger</div>
        ) : (
          <div className="space-y-2">
            {aktiveBestillinger.slice(0, 10).map((b) => (
              <Link
                key={b.id}
                href={`/portal/megler/bestillinger/${b.id}`}
                className="portal-card p-4 flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1e293b] truncate">{b.takstmann?.navn ?? "Takstmann"}</p>
                  <p className="text-xs text-[#64748b]">{b.status} · {b.adresse ?? b.oppdrag_type ?? "–"}</p>
                </div>
                <svg className="w-4 h-4 text-[#94a3b8] group-hover:text-[#285982] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Uleste meldinger */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide">Uleste meldinger</h2>
          <Link href="/portal/megler/meldinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {ulesteSamtaler.length === 0 ? (
          <div className="portal-card p-6 text-center text-sm text-[#94a3b8]">Ingen uleste meldinger</div>
        ) : (
          <div className="space-y-2">
            {ulesteSamtaler.map((s) => (
              <Link
                key={s.id}
                href={`/portal/megler/meldinger/${s.id}`}
                className="portal-card p-4 flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1e293b] truncate">{s.takstmann?.navn ?? "Samtale"}</p>
                  {s.siste_melding && (
                    <p className="text-xs text-[#64748b] truncate mt-0.5">{s.siste_melding.innhold}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#285982] text-white text-[11px] font-bold flex items-center justify-center">
                    {s.uleste > 9 ? "9+" : s.uleste}
                  </span>
                  <svg className="w-4 h-4 text-[#94a3b8] group-hover:text-[#285982]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

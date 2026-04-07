import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OPPDRAG_TYPE_LABELS, BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { OppdragType, BestillingStatus } from "@/lib/supabase/types";
import { hentSamtaler } from "@/lib/actions/meldinger";

export default async function KundeInnboksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: kundeProfil } = await supabase
    .from("privatkunde_profiler")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const [bestillinger, samtaler] = await Promise.all([
    kundeProfil
      ? supabase
          .from("bestillinger")
          .select(`*, takstmann:takstmann_profiler(navn)`)
          .eq("bestilt_av_kunde_id", (kundeProfil as { id: string }).id)
          .in("status", ["forespørsel", "tilbud_sendt", "akseptert", "bekreftet"])
          .order("updated_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    hentSamtaler(),
  ]);

  const ulesteSamtaler = (samtaler ?? []).filter((s) => s.uleste > 0);
  const tilbudSendt = (bestillinger.data ?? []).filter((b) => b.status === "tilbud_sendt");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]">Innboks</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Tilbud og meldinger som venter på svar</p>
      </div>

      {/* Tilbud som venter på svar */}
      {tilbudSendt.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#285982] uppercase tracking-wide">
              Tilbud som venter på svar ({tilbudSendt.length})
            </h2>
            <Link href="/portal/kunde/bestillinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
          </div>
          <div className="space-y-2">
            {tilbudSendt.map((b) => {
              type NavnInfo = { navn: string } | null;
              const takstmannNavn = ((Array.isArray(b.takstmann) ? b.takstmann[0] : b.takstmann) as NavnInfo)?.navn ?? "Takstmann";
              const typeLabel = b.oppdrag_type ? OPPDRAG_TYPE_LABELS[b.oppdrag_type as OppdragType] : null;
              const frist = b.tilbud_sendt_at
                ? new Date(new Date(b.tilbud_sendt_at).getTime() + 48 * 60 * 60 * 1000)
                : null;

              return (
                <Link
                  key={b.id}
                  href="/portal/kunde/bestillinger"
                  className="portal-card p-4 border-l-4 border-l-[#285982] flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#1e293b]">{takstmannNavn}</span>
                      {typeLabel && <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full">{typeLabel}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {b.tilbudspris && (
                        <span className="text-sm font-bold text-[#1e293b]">{Number(b.tilbudspris).toLocaleString("nb-NO")} kr</span>
                      )}
                      {frist && (
                        <span className="text-xs text-amber-600">Frist: {frist.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#285982]" />
                    <svg className="w-4 h-4 text-[#94a3b8] group-hover:text-[#285982]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Alle aktive bestillinger */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide">Aktive bestillinger</h2>
          <Link href="/portal/kunde/bestillinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {!bestillinger.data || bestillinger.data.length === 0 ? (
          <div className="portal-card p-6 text-center text-sm text-[#94a3b8]">Ingen aktive bestillinger</div>
        ) : (
          <div className="space-y-2">
            {bestillinger.data.map((b) => {
              type NavnInfo = { navn: string } | null;
              const takstmannNavn = ((Array.isArray(b.takstmann) ? b.takstmann[0] : b.takstmann) as NavnInfo)?.navn ?? "Takstmann";

              return (
                <Link
                  key={b.id}
                  href="/portal/kunde/bestillinger"
                  className="portal-card p-4 flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1e293b]">{takstmannNavn}</p>
                    <p className="text-xs text-[#64748b]">{BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}</p>
                  </div>
                  <svg className="w-4 h-4 text-[#94a3b8] group-hover:text-[#285982] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Uleste meldinger */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide">Uleste meldinger</h2>
          <Link href="/portal/kunde/meldinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {ulesteSamtaler.length === 0 ? (
          <div className="portal-card p-6 text-center text-sm text-[#94a3b8]">Ingen uleste meldinger</div>
        ) : (
          <div className="space-y-2">
            {ulesteSamtaler.map((s) => (
              <Link
                key={s.id}
                href={`/portal/kunde/meldinger/${s.id}`}
                className="portal-card p-4 flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1e293b] truncate">
                    {s.takstmann?.navn ?? "Samtale"}
                  </p>
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

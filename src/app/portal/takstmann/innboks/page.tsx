import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { OPPDRAG_TYPE_LABELS, BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { OppdragType, BestillingStatus } from "@/lib/supabase/types";
import { hentSamtaler } from "@/lib/actions/meldinger";

export default async function TakstmannInnboksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceSupabase = await createServiceClient();

  const { data: takstmannProfil, error: takstmannProfilError } = await serviceSupabase
    .from("takstmann_profiler")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (takstmannProfilError) {
    console.error('[takstmann_profiler] Feil ved henting av profil i TakstmannInnboksPage:', takstmannProfilError.message);
    return null;
  }
  // Hent bestillinger UTEN PostgREST-joins
  const [bestillingerRes, samtaler] = await Promise.all([
    takstmannProfil
      ? serviceSupabase
          .from("bestillinger")
          .select("*")
          .eq("takstmann_id", (takstmannProfil as { id: string }).id)
          .in("status", ["forespørsel", "ny", "tilbud_sendt", "akseptert"])
          .order("updated_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[], error: null }),
    hentSamtaler(),
  ]);

  if (bestillingerRes.error) {
    console.error('[innboks bestillinger] Feil:', bestillingerRes.error.message);
  }

  // Hent relaterte profiler i separate spørringer
  const bData = bestillingerRes.data ?? [];
  const meglerIds = [...new Set(bData.map(b => b.bestilt_av_megler_id).filter(Boolean))];
  const kundeIds = [...new Set(bData.map(b => b.bestilt_av_kunde_id).filter(Boolean))];

  const [meglerRes, kundeRes] = await Promise.all([
    meglerIds.length > 0
      ? serviceSupabase.from("megler_profiler").select("id, navn").in("id", meglerIds)
      : Promise.resolve({ data: [] as any[] }),
    kundeIds.length > 0
      ? serviceSupabase.from("privatkunde_profiler").select("id, navn").in("id", kundeIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const meglerMap = Object.fromEntries((meglerRes.data ?? []).map(m => [m.id, m]));
  const kundeMap = Object.fromEntries((kundeRes.data ?? []).map(k => [k.id, k]));

  const bestillinger = {
    data: bData.map(b => ({
      ...b,
      megler: b.bestilt_av_megler_id ? meglerMap[b.bestilt_av_megler_id] ?? null : null,
      kunde: b.bestilt_av_kunde_id ? kundeMap[b.bestilt_av_kunde_id] ?? null : null,
    })),
  };

  const ulesteSamtaler = (samtaler ?? []).filter((s) => s.uleste > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]">Innboks</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Ubehandlede forespørsler og uleste meldinger</p>
      </div>

      {/* Bestillinger som krever handling */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide">Aktive forespørsler</h2>
          <Link href="/portal/takstmann/bestillinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {!bestillinger.data || bestillinger.data.length === 0 ? (
          <div className="portal-card p-6 text-center text-sm text-[#94a3b8]">Ingen aktive forespørsler</div>
        ) : (
          <div className="space-y-2">
            {bestillinger.data.map((b) => {
              type NavnInfo = { navn: string } | null;
              const navn = b.bestilt_av_kunde_id
                ? ((Array.isArray(b.kunde) ? b.kunde[0] : b.kunde) as NavnInfo)?.navn ?? "Privatkunde"
                : ((Array.isArray(b.megler) ? b.megler[0] : b.megler) as NavnInfo)?.navn ?? "Megler";
              const typeLabel = b.oppdrag_type ? OPPDRAG_TYPE_LABELS[b.oppdrag_type as OppdragType] : null;
              const erNy = b.status === "forespørsel" || b.status === "ny";
              const erAkseptert = b.status === "akseptert";

              return (
                <Link
                  key={b.id}
                  href="/portal/takstmann/bestillinger"
                  className={`portal-card p-4 flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group ${erNy ? "border-l-4 border-l-[#285982]" : erAkseptert ? "border-l-4 border-l-green-500" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#1e293b] truncate">{navn}</span>
                      {typeLabel && <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full shrink-0">{typeLabel}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748b]">
                        {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                      </span>
                      {b.adresse && <span className="text-xs text-[#94a3b8] truncate">· {b.adresse}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {erNy && (
                      <span className="w-2 h-2 rounded-full bg-[#285982]" />
                    )}
                    {erAkseptert && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Klar til bekreftelse</span>
                    )}
                    <svg className="w-4 h-4 text-[#94a3b8] group-hover:text-[#285982]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
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
          <Link href="/portal/takstmann/meldinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {ulesteSamtaler.length === 0 ? (
          <div className="portal-card p-6 text-center text-sm text-[#94a3b8]">Ingen uleste meldinger</div>
        ) : (
          <div className="space-y-2">
            {ulesteSamtaler.map((s) => (
              <Link
                key={s.id}
                href={`/portal/takstmann/meldinger/${s.id}`}
                className="portal-card p-4 flex items-center justify-between gap-4 hover:border-[#285982] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1e293b] truncate">
                    {s.kunde?.navn ?? s.megler?.navn ?? "Samtale"}
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
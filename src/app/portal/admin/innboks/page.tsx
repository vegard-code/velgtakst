import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus } from "@/lib/supabase/types";

const STATUS_FARGER: Record<string, string> = {
  forespørsel: "bg-blue-100 text-blue-700",
  tilbud_sendt: "bg-amber-100 text-amber-700",
  akseptert: "bg-green-100 text-green-700",
  bekreftet: "bg-emerald-100 text-emerald-700",
  ny: "bg-blue-100 text-blue-700",
};

export default async function AdminInnboksPage() {
  const supabase = await createServiceClient();

  // Hent bestillinger UTEN PostgREST-joins
  const { data: bestillingerRå } = await supabase
    .from("bestillinger")
    .select("id, status, oppdrag_type, adresse, tilbudspris, created_at, updated_at, bestilt_av_kunde_id, bestilt_av_megler_id, takstmann_id")
    .in("status", ["forespørsel", "ny", "tilbud_sendt", "akseptert"])
    .order("updated_at", { ascending: false })
    .limit(50);

  // Hent relaterte profiler i separate spørringer
  const bRå = bestillingerRå ?? [];
  const tIds = [...new Set(bRå.map(b => b.takstmann_id).filter(Boolean))];
  const mIds = [...new Set(bRå.map(b => b.bestilt_av_megler_id).filter(Boolean))];
  const kIds = [...new Set(bRå.map(b => b.bestilt_av_kunde_id).filter(Boolean))];

  const [tRes, mRes, kRes] = await Promise.all([
    tIds.length > 0 ? supabase.from("takstmann_profiler").select("id, navn").in("id", tIds) : Promise.resolve({ data: [] as any[] }),
    mIds.length > 0 ? supabase.from("megler_profiler").select("id, navn").in("id", mIds) : Promise.resolve({ data: [] as any[] }),
    kIds.length > 0 ? supabase.from("privatkunde_profiler").select("id, navn").in("id", kIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const tMap = Object.fromEntries((tRes.data ?? []).map(t => [t.id, t]));
  const mMap = Object.fromEntries((mRes.data ?? []).map(m => [m.id, m]));
  const kMap = Object.fromEntries((kRes.data ?? []).map(k => [k.id, k]));

  const bestillinger = bRå.map(b => ({
    ...b,
    takstmann: b.takstmann_id ? tMap[b.takstmann_id] ?? null : null,
    megler: b.bestilt_av_megler_id ? mMap[b.bestilt_av_megler_id] ?? null : null,
    kunde: b.bestilt_av_kunde_id ? kMap[b.bestilt_av_kunde_id] ?? null : null,
  }));

  const { data: stats } = await supabase
    .from("bestillinger")
    .select("status");

  const teller: Record<string, number> = {};
  for (const b of stats ?? []) {
    teller[b.status] = (teller[b.status] ?? 0) + 1;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]">Innboks</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Bestillinger som krever handling</p>
      </div>

      {/* Hurtigstatistikk */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "forespørsel", label: "Forespørsler", farge: "text-blue-600" },
          { key: "tilbud_sendt", label: "Tilbud ute", farge: "text-amber-600" },
          { key: "akseptert", label: "Klar til bekreft.", farge: "text-green-600" },
          { key: "ny", label: "Megler (nye)", farge: "text-blue-600" },
        ].map((s) => (
          <div key={s.key} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[#64748b] text-xs font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.farge}`}>{teller[s.key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Aktive bestillinger */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide">Aktive ({bestillinger?.length ?? 0})</h2>
          <Link href="/portal/admin/bestillinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
        </div>
        {!bestillinger || bestillinger.length === 0 ? (
          <div className="portal-card p-8 text-center text-sm text-[#94a3b8]">Ingen aktive bestillinger</div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Bestiller</th>
                    <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Takstmann</th>
                    <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Adresse</th>
                    <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Dato</th>
                  </tr>
                </thead>
                <tbody>
                  {bestillinger.map((b) => {
                    type NavnInfo = { navn: string } | null;
                    const takstmannNavn = ((Array.isArray(b.takstmann) ? b.takstmann[0] : b.takstmann) as NavnInfo)?.navn ?? "–";
                    const bestillerNavn = b.bestilt_av_kunde_id
                      ? ((Array.isArray(b.kunde) ? b.kunde[0] : b.kunde) as NavnInfo)?.navn ?? "Privatkunde"
                      : ((Array.isArray(b.megler) ? b.megler[0] : b.megler) as NavnInfo)?.navn ?? "Megler";
                    return (
                      <tr key={b.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_FARGER[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#1e293b]">{bestillerNavn}</td>
                        <td className="px-4 py-3 text-sm text-[#64748b]">{takstmannNavn}</td>
                        <td className="px-4 py-3 text-sm text-[#64748b] max-w-[150px] truncate">{b.adresse ?? "–"}</td>
                        <td className="px-4 py-3 text-sm text-[#94a3b8]">{new Date(b.created_at).toLocaleDateString("nb-NO")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

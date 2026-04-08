import { createServiceClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus } from "@/lib/supabase/types";

const STATUS_FARGER: Record<string, string> = {
  ny: "bg-blue-100 text-blue-700",
  forespørsel: "bg-blue-100 text-blue-700",
  tilbud_sendt: "bg-amber-100 text-amber-700",
  akseptert: "bg-green-100 text-green-700",
  avvist: "bg-red-100 text-red-700",
  avslått: "bg-red-100 text-red-700",
  utløpt: "bg-amber-100 text-amber-700",
  bekreftet: "bg-emerald-100 text-emerald-700",
  kansellert: "bg-gray-100 text-gray-500",
  fullfort: "bg-green-100 text-green-700",
};

export default async function AdminBestillingerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServiceClient();

  // Hent bestillinger UTEN PostgREST-joins
  let query = supabase
    .from("bestillinger")
    .select("id, oppdrag_id, takstmann_id, bestilt_av_megler_id, bestilt_av_kunde_id, status, melding, oppdrag_type, adresse, tilbudspris, tilbud_sendt_at, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data: bestillingerRå } = await query;

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

  // Statistikk
  const { data: alle } = await supabase
    .from("bestillinger")
    .select("status");

  const stats: Record<string, number> = {};
  for (const b of alle ?? []) {
    stats[b.status] = (stats[b.status] ?? 0) + 1;
  }

  const noekkeltall = [
    { key: "forespørsel", label: "Forespørsler", farge: "text-blue-600" },
    { key: "tilbud_sendt", label: "Tilbud sendt", farge: "text-amber-600" },
    { key: "akseptert", label: "Akseptert", farge: "text-green-600" },
    { key: "bekreftet", label: "Bekreftet", farge: "text-emerald-600" },
    { key: "avslått", label: "Avslått", farge: "text-red-600" },
    { key: "utløpt", label: "Utløpt", farge: "text-amber-600" },
    { key: "ny", label: "Megler (ny)", farge: "text-blue-600" },
  ];

  const statusFiltre = [
    { value: "", label: "Alle" },
    { value: "forespørsel", label: "Forespørsler" },
    { value: "tilbud_sendt", label: "Tilbud sendt" },
    { value: "akseptert", label: "Akseptert" },
    { value: "bekreftet", label: "Bekreftet" },
    { value: "avslått", label: "Avslått" },
    { value: "utløpt", label: "Utløpt" },
    { value: "ny", label: "Megler (ny)" },
    { value: "avvist", label: "Avvist" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Privatkundebestillinger</h1>
        <span className="text-sm text-[#64748b]">{bestillinger?.length ?? 0} vist</span>
      </div>

      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {noekkeltall.map((n) => (
          <a
            key={n.key}
            href={`/portal/admin/bestillinger?status=${n.key}`}
            className="bg-white rounded-xl border border-[#e2e8f0] p-3 hover:border-[#285982] transition-colors"
          >
            <p className="text-[#64748b] text-xs font-medium mb-1">{n.label}</p>
            <p className={`text-2xl font-bold ${n.farge}`}>{stats[n.key] ?? 0}</p>
          </a>
        ))}
      </div>

      {/* Statusfiltre */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusFiltre.map((f) => (
          <a
            key={f.value}
            href={f.value ? `/portal/admin/bestillinger?status=${f.value}` : "/portal/admin/bestillinger"}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              params.status === f.value || (!params.status && !f.value)
                ? "bg-[#285982] text-white"
                : "bg-white border border-[#e2e8f0] text-[#64748b] hover:border-[#285982]"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Bestiller</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Takstmann</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Adresse</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Pris</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-4 py-3">Dato</th>
              </tr>
            </thead>
            <tbody>
              {bestillinger && bestillinger.length > 0 ? (
                bestillinger.map((b) => {
                  type NavnInfo = { navn: string } | null;
                  const takstmannNavn = ((Array.isArray(b.takstmann) ? b.takstmann[0] : b.takstmann) as NavnInfo)?.navn ?? "–";
                  const bestillerNavn = b.bestilt_av_kunde_id
                    ? ((Array.isArray(b.kunde) ? b.kunde[0] : b.kunde) as NavnInfo)?.navn ?? "Privatkunde"
                    : ((Array.isArray(b.megler) ? b.megler[0] : b.megler) as NavnInfo)?.navn ?? "Megler";
                  const erPrivatkunde = !!b.bestilt_av_kunde_id;

                  return (
                    <tr key={b.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_FARGER[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-[#1e293b] font-medium">{bestillerNavn}</span>
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${erPrivatkunde ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {erPrivatkunde ? "Privat" : "Megler"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748b]">{takstmannNavn}</td>
                      <td className="px-4 py-3 text-sm text-[#64748b]">{b.oppdrag_type ?? "–"}</td>
                      <td className="px-4 py-3 text-sm text-[#64748b] max-w-[160px] truncate">{b.adresse ?? "–"}</td>
                      <td className="px-4 py-3 text-sm text-[#1e293b] font-medium">
                        {b.tilbudspris ? `${Number(b.tilbudspris).toLocaleString("nb-NO")} kr` : "–"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94a3b8]">
                        {new Date(b.created_at).toLocaleDateString("nb-NO")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen bestillinger med valgt filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

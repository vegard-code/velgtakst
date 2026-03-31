import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminBestillingerPage() {
  const supabase = await createServiceClient();

  const { data: bestillinger } = await supabase
    .from("bestillinger")
    .select("id, oppdrag_id, takstmann_id, status, pris, melding, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Hent takstmann-navn
  const takstmannIds = [...new Set(bestillinger?.map((b) => b.takstmann_id) ?? [])];
  const { data: takstmenn } = takstmannIds.length > 0
    ? await supabase
        .from("takstmann_profiler")
        .select("id, navn")
        .in("id", takstmannIds)
    : { data: [] };

  const navnMap = new Map<string, string>();
  takstmenn?.forEach((t) => navnMap.set(t.id, t.navn));

  // Hent oppdrag-titler
  const oppdragIds = [...new Set(bestillinger?.map((b) => b.oppdrag_id) ?? [])];
  const { data: oppdragData } = oppdragIds.length > 0
    ? await supabase
        .from("oppdrag")
        .select("id, tittel")
        .in("id", oppdragIds)
    : { data: [] };

  const oppdragMap = new Map<string, string>();
  oppdragData?.forEach((o) => oppdragMap.set(o.id, o.tittel));

  // Statistikk
  const nye = bestillinger?.filter((b) => b.status === "ny").length ?? 0;
  const aksepterte = bestillinger?.filter((b) => b.status === "akseptert").length ?? 0;
  const avslåtte = bestillinger?.filter((b) => b.status === "avslatt").length ?? 0;

  const statusFarger: Record<string, string> = {
    ny: "bg-blue-100 text-blue-700",
    akseptert: "bg-green-100 text-green-700",
    avslatt: "bg-red-100 text-red-700",
    kansellert: "bg-gray-100 text-gray-500",
    utlopt: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Bestillinger</h1>
        <span className="text-sm text-[#64748b]">{bestillinger?.length ?? 0} siste</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Nye</p>
          <p className="text-2xl font-bold text-blue-600">{nye}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Aksepterte</p>
          <p className="text-2xl font-bold text-green-600">{aksepterte}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Avslåtte</p>
          <p className="text-2xl font-bold text-red-600">{avslåtte}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Oppdrag</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Takstmann</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Pris</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Melding</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {bestillinger && bestillinger.length > 0 ? (
                bestillinger.map((b) => (
                  <tr key={b.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#1e293b]">
                      {oppdragMap.get(b.oppdrag_id) ?? "Ukjent oppdrag"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748b]">
                      {navnMap.get(b.takstmann_id) ?? "Ukjent"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#1e293b] font-medium">
                      {b.pris ? `${Number(b.pris).toLocaleString("nb-NO")} kr` : "–"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${statusFarger[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748b] max-w-[200px] truncate">
                      {b.melding ?? "–"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#94a3b8]">
                      {new Date(b.created_at).toLocaleDateString("nb-NO")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen bestillinger registrert ennå.
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

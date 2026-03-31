import { createServiceClient } from "@/lib/supabase/server";

const FYLKE_NAVN: Record<string, string> = {
  oslo: "Oslo",
  rogaland: "Rogaland",
  vestland: "Vestland",
  trondelag: "Trøndelag",
  akershus: "Akershus",
  innlandet: "Innlandet",
  vestfold: "Vestfold",
  telemark: "Telemark",
  agder: "Agder",
  "more-og-romsdal": "Møre og Romsdal",
  nordland: "Nordland",
  troms: "Troms",
  finnmark: "Finnmark",
  buskerud: "Buskerud",
  ostfold: "Østfold",
};

export default async function AdminAbonnementerPage() {
  const supabase = await createServiceClient();

  const { data: fylker } = await supabase
    .from("fylke_synlighet")
    .select("id, takstmann_id, fylke_id, er_aktiv, betalt_til, created_at")
    .order("created_at", { ascending: false });

  // Hent takstmann-navn
  const takstmannIds = [...new Set(fylker?.map((f) => f.takstmann_id) ?? [])];
  const { data: takstmenn } = takstmannIds.length > 0
    ? await supabase
        .from("takstmann_profiler")
        .select("id, navn")
        .in("id", takstmannIds)
    : { data: [] };

  const navnMap = new Map<string, string>();
  takstmenn?.forEach((t) => navnMap.set(t.id, t.navn));

  // Statistikk
  const aktive = fylker?.filter((f) => f.er_aktiv).length ?? 0;
  const utløpt = fylker?.filter((f) => f.betalt_til && new Date(f.betalt_til) < new Date()).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Abonnementer (fylkesynlighet)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Totalt registrerte</p>
          <p className="text-2xl font-bold text-[#1e293b]">{fylker?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Aktive nå</p>
          <p className="text-2xl font-bold text-green-600">{aktive}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-[#64748b] text-xs font-medium mb-1">Utløpt</p>
          <p className="text-2xl font-bold text-red-600">{utløpt}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Takstmann</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Fylke</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Betalt til</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {fylker && fylker.length > 0 ? (
                fylker.map((f) => {
                  const erUtløpt = f.betalt_til && new Date(f.betalt_til) < new Date();
                  return (
                    <tr key={f.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1e293b]">
                        {navnMap.get(f.takstmann_id) ?? "Ukjent"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">
                        {FYLKE_NAVN[f.fylke_id] ?? f.fylke_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          f.er_aktiv && !erUtløpt
                            ? "bg-green-100 text-green-700"
                            : erUtløpt
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {f.er_aktiv && !erUtløpt ? "Aktiv" : erUtløpt ? "Utløpt" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">
                        {f.betalt_til
                          ? new Date(f.betalt_til).toLocaleDateString("nb-NO")
                          : "–"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8]">
                        {new Date(f.created_at).toLocaleDateString("nb-NO")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen abonnementer registrert ennå.
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

import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminOppdragPage() {
  const supabase = await createServiceClient();

  const { data: oppdrag } = await supabase
    .from("oppdrag")
    .select("id, tittel, beskrivelse, adresse, oppdrag_type, status, pris, frist, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const statusFarger: Record<string, string> = {
    ny: "bg-blue-100 text-blue-700",
    akseptert: "bg-green-100 text-green-700",
    under_befaring: "bg-amber-100 text-amber-700",
    rapport_under_arbeid: "bg-orange-100 text-orange-700",
    rapport_levert: "bg-cyan-100 text-cyan-700",
    fakturert: "bg-violet-100 text-violet-700",
    betalt: "bg-emerald-100 text-emerald-700",
    kansellert: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Oppdrag</h1>
        <span className="text-sm text-[#64748b]">{oppdrag?.length ?? 0} siste</span>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Tittel</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Adresse</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Pris</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {oppdrag && oppdrag.length > 0 ? (
                oppdrag.map((o) => (
                  <tr key={o.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#1e293b]">{o.tittel}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748b]">{o.oppdrag_type.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-sm text-[#64748b]">{o.adresse ?? "–"}</td>
                    <td className="px-6 py-4 text-sm text-[#1e293b] font-medium">
                      {o.pris ? `${Number(o.pris).toLocaleString("nb-NO")} kr` : "–"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${statusFarger[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#94a3b8]">
                      {new Date(o.created_at).toLocaleDateString("nb-NO")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen oppdrag opprettet ennå.
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

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminTakstmennPage() {
  const supabase = await createServiceClient();

  const { data: takstmenn } = await supabase
    .from("takstmann_profiler")
    .select("id, navn, epost, telefon, tittel, spesialitet, sertifiseringer, created_at, company_id")
    .order("created_at", { ascending: false });

  // Hent fylkesynlighet per takstmann
  const { data: fylker } = await supabase
    .from("fylke_synlighet")
    .select("takstmann_id, fylke_id, er_aktiv, betalt_til");

  const fylkeMap = new Map<string, { aktive: number; totalt: number }>();
  fylker?.forEach((f) => {
    const current = fylkeMap.get(f.takstmann_id) ?? { aktive: 0, totalt: 0 };
    current.totalt++;
    if (f.er_aktiv) current.aktive++;
    fylkeMap.set(f.takstmann_id, current);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Takstmenn</h1>
        <span className="text-sm text-[#64748b]">{takstmenn?.length ?? 0} registrert</span>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Navn</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">E-post</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Telefon</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Spesialitet</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Fylker</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider px-6 py-3">Registrert</th>
              </tr>
            </thead>
            <tbody>
              {takstmenn && takstmenn.length > 0 ? (
                takstmenn.map((t) => {
                  const fInfo = fylkeMap.get(t.id);
                  return (
                    <tr key={t.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/portal/admin/takstmenn/${t.id}`} className="hover:underline">
                          <p className="text-sm font-medium text-[#1e293b]">{t.navn}</p>
                          {t.tittel && <p className="text-xs text-[#94a3b8]">{t.tittel}</p>}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{t.epost ?? "–"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{t.telefon ?? "–"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{t.spesialitet ?? "–"}</td>
                      <td className="px-6 py-4">
                        {fInfo ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fInfo.aktive > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {fInfo.aktive} aktive / {fInfo.totalt}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94a3b8]">Ingen</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8]">
                        {new Date(t.created_at).toLocaleDateString("nb-NO")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#94a3b8]">
                    Ingen takstmenn registrert ennå.
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

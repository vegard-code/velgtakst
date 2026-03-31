import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminVurderingerPage() {
  const supabase = await createServiceClient();

  const { data: vurderinger } = await supabase
    .from("megler_vurderinger")
    .select(`
      id, karakter, kommentar, created_at, takstmann_id, megler_id, kunde_id, oppdrag_id,
      takstmann:takstmann_profiler(id, navn),
      megler:megler_profiler(id, navn),
      kunde:privatkunde_profiler(id, navn)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const { count: totalVurderinger } = await supabase
    .from("megler_vurderinger")
    .select("*", { count: "exact", head: true });

  // Beregn gjennomsnitt
  const { data: alleKarakterer } = await supabase
    .from("megler_vurderinger")
    .select("karakter")
    .not("karakter", "is", null);

  const snitt = alleKarakterer && alleKarakterer.length > 0
    ? Math.round((alleKarakterer.reduce((s, v) => s + (v.karakter ?? 0), 0) / alleKarakterer.length) * 10) / 10
    : null;

  // Per-karakter fordeling
  const fordeling: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (alleKarakterer ?? []).forEach((v) => {
    if (v.karakter && fordeling[v.karakter] !== undefined) {
      fordeling[v.karakter]++;
    }
  });
  const maxFordeling = Math.max(...Object.values(fordeling), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Vurderinger</h1>
          <p className="text-sm text-[#64748b]">Alle vurderinger av takstmenn</p>
        </div>
        <Link href="/portal/admin" className="text-sm text-[#285982] hover:underline">Tilbake</Link>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-[#1e293b]">{totalVurderinger ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Vurderinger totalt</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-amber-500">{snitt ?? "–"} ★</p>
          <p className="text-xs text-[#64748b] mt-1">Gjennomsnittlig karakter</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <p className="text-xs font-semibold text-[#64748b] mb-2">Fordeling</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-[#64748b] w-4 text-right">{k}</span>
                <span className="text-amber-400 text-xs">★</span>
                <div className="flex-1 h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${(fordeling[k] / maxFordeling) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[#94a3b8] w-6 text-right">{fordeling[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vurdering-tabell */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Takstmann</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Vurdert av</th>
                <th className="text-center text-xs font-semibold text-[#64748b] px-5 py-3">Karakter</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Kommentar</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Dato</th>
              </tr>
            </thead>
            <tbody>
              {!vurderinger || vurderinger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[#94a3b8]">Ingen vurderinger ennå</td>
                </tr>
              ) : (
                vurderinger.map((v) => {
                  const takstmann = v.takstmann as unknown as { id: string; navn: string } | null;
                  const megler = v.megler as unknown as { id: string; navn: string } | null;
                  const kunde = v.kunde as unknown as { id: string; navn: string } | null;
                  const avsender = kunde?.navn ?? megler?.navn ?? "Ukjent";
                  const avsenderType = kunde ? "Privatkunde" : megler ? "Megler" : "";

                  return (
                    <tr key={v.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-[#1e293b]">{takstmann?.navn ?? "–"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-[#374151]">{avsender}</p>
                        <p className="text-[10px] text-[#94a3b8]">{avsenderType}</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-amber-500 font-bold">
                          {"★".repeat(v.karakter ?? 0)}
                          {"☆".repeat(5 - (v.karakter ?? 0))}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[300px]">
                        <p className="text-xs text-[#64748b] truncate">{v.kommentar ?? "–"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-[#94a3b8]">
                          {new Date(v.created_at).toLocaleDateString("nb-NO")}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

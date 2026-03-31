import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminMeldingerPage() {
  const supabase = await createServiceClient();

  const { data: samtaler } = await supabase
    .from("samtaler")
    .select(`
      id, created_at,
      takstmann:takstmann_profiler(id, navn),
      kunde:privatkunde_profiler(id, navn),
      megler:megler_profiler(id, navn)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Hent melding-tall per samtale (kun antall, ikke innhold)
  const samtalerMedStats = await Promise.all(
    (samtaler ?? []).map(async (s) => {
      const { count: totalMeldinger } = await supabase
        .from("meldinger")
        .select("*", { count: "exact", head: true })
        .eq("samtale_id", s.id);

      const { count: uleste } = await supabase
        .from("meldinger")
        .select("*", { count: "exact", head: true })
        .eq("samtale_id", s.id)
        .eq("lest", false);

      // Hent tidspunkt for siste melding, men IKKE innhold
      const { data: sisteMelding } = await supabase
        .from("meldinger")
        .select("created_at")
        .eq("samtale_id", s.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...s,
        takstmann: s.takstmann as unknown as { id: string; navn: string } | null,
        kunde: s.kunde as unknown as { id: string; navn: string } | null,
        megler: s.megler as unknown as { id: string; navn: string } | null,
        totalMeldinger: totalMeldinger ?? 0,
        uleste: uleste ?? 0,
        sisteAktivitet: sisteMelding?.created_at ?? null,
      };
    })
  );

  // Totaler
  const { count: totalSamtaler } = await supabase.from("samtaler").select("*", { count: "exact", head: true });
  const { count: totalMeldinger } = await supabase.from("meldinger").select("*", { count: "exact", head: true });
  const { count: totalUleste } = await supabase.from("meldinger").select("*", { count: "exact", head: true }).eq("lest", false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Meldinger</h1>
          <p className="text-sm text-[#64748b]">Statistikk over samtaler på plattformen (innhold er ikke synlig av personvernhensyn)</p>
        </div>
        <Link href="/portal/admin" className="text-sm text-[#285982] hover:underline">Tilbake</Link>
      </div>

      {/* Statistikk */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-[#1e293b]">{totalSamtaler ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Samtaler</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-[#1e293b]">{totalMeldinger ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Meldinger totalt</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-red-500">{totalUleste ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Uleste</p>
        </div>
      </div>

      {/* Samtale-tabell */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Takstmann</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Motpart</th>
                <th className="text-center text-xs font-semibold text-[#64748b] px-5 py-3">Meldinger</th>
                <th className="text-center text-xs font-semibold text-[#64748b] px-5 py-3">Uleste</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Siste aktivitet</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {samtalerMedStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#94a3b8]">Ingen samtaler ennå</td>
                </tr>
              ) : (
                samtalerMedStats.map((s) => (
                  <tr key={s.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[#1e293b]">{s.takstmann?.navn ?? "–"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-[#374151]">
                        {s.kunde?.navn ?? s.megler?.navn ?? "–"}
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">
                        {s.kunde ? "Privatkunde" : s.megler ? "Megler" : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-[#1e293b]">{s.totalMeldinger}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {s.uleste > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold">
                          {s.uleste}
                        </span>
                      ) : (
                        <span className="text-sm text-[#94a3b8]">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-[#94a3b8]">
                        {s.sisteAktivitet
                          ? new Date(s.sisteAktivitet).toLocaleDateString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "–"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-[#94a3b8]">
                        {new Date(s.created_at).toLocaleDateString("nb-NO")}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminMeldingerPage() {
  const supabase = await createServiceClient();

  // Hent samtaler uten PostgREST joins
  const { data: samtaler } = await supabase
    .from("samtaler")
    .select("id, created_at, takstmann_id, kunde_id, megler_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const samtaleListe = samtaler ?? [];
  const samtaleIds = samtaleListe.map(s => s.id);

  // Batch-hent alle relaterte data parallelt (unngå N+1)
  const takstmannIds = [...new Set(samtaleListe.map(s => s.takstmann_id).filter(Boolean))];
  const kundeIds = [...new Set(samtaleListe.map(s => s.kunde_id).filter(Boolean))];
  const meglerIds = [...new Set(samtaleListe.map(s => s.megler_id).filter(Boolean))];

  const [
    takstmennRes, kunderRes, meglereRes,
    totalSamtalerRes, totalMeldingerRes, totalUlesteRes,
  ] = await Promise.all([
    takstmannIds.length > 0
      ? supabase.from("takstmann_profiler").select("id, navn").in("id", takstmannIds)
      : Promise.resolve({ data: [] as { id: string; navn: string }[] }),
    kundeIds.length > 0
      ? supabase.from("privatkunde_profiler").select("id, navn").in("id", kundeIds)
      : Promise.resolve({ data: [] as { id: string; navn: string }[] }),
    meglerIds.length > 0
      ? supabase.from("megler_profiler").select("id, navn").in("id", meglerIds)
      : Promise.resolve({ data: [] as { id: string; navn: string }[] }),
    supabase.from("samtaler").select("*", { count: "exact", head: true }),
    supabase.from("meldinger").select("*", { count: "exact", head: true }),
    supabase.from("meldinger").select("*", { count: "exact", head: true }).eq("lest", false),
  ]);

  // Bygg oppslag-maps
  const tMap: Record<string, string> = {};
  for (const t of takstmennRes.data ?? []) tMap[t.id] = t.navn;
  const kMap: Record<string, string> = {};
  for (const k of kunderRes.data ?? []) kMap[k.id] = k.navn;
  const mMap: Record<string, string> = {};
  for (const m of meglereRes.data ?? []) mMap[m.id] = m.navn;

  // Batch-hent meldingsstatistikk per samtale (3 spørringer totalt istedenfor 150)
  let meldingTeller: Record<string, number> = {};
  let ulestTeller: Record<string, number> = {};
  let sisteAktivitetMap: Record<string, string> = {};

  if (samtaleIds.length > 0) {
    // Hent alle meldinger for disse samtalene (kun metadata, ikke innhold)
    const { data: meldingStats } = await supabase
      .from("meldinger")
      .select("samtale_id, lest, created_at")
      .in("samtale_id", samtaleIds)
      .order("created_at", { ascending: false });

    for (const m of meldingStats ?? []) {
      meldingTeller[m.samtale_id] = (meldingTeller[m.samtale_id] ?? 0) + 1;
      if (!m.lest) ulestTeller[m.samtale_id] = (ulestTeller[m.samtale_id] ?? 0) + 1;
      if (!sisteAktivitetMap[m.samtale_id]) sisteAktivitetMap[m.samtale_id] = m.created_at;
    }
  }

  const samtalerMedStats = samtaleListe.map(s => ({
    id: s.id,
    created_at: s.created_at,
    takstmannNavn: s.takstmann_id ? tMap[s.takstmann_id] ?? null : null,
    kundeNavn: s.kunde_id ? kMap[s.kunde_id] ?? null : null,
    meglerNavn: s.megler_id ? mMap[s.megler_id] ?? null : null,
    totalMeldinger: meldingTeller[s.id] ?? 0,
    uleste: ulestTeller[s.id] ?? 0,
    sisteAktivitet: sisteAktivitetMap[s.id] ?? null,
  }));

  const totalSamtaler = totalSamtalerRes.count ?? 0;
  const totalMeldinger = totalMeldingerRes.count ?? 0;
  const totalUleste = totalUlesteRes.count ?? 0;

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
          <p className="text-3xl font-bold text-[#1e293b]">{totalSamtaler}</p>
          <p className="text-xs text-[#64748b] mt-1">Samtaler</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-[#1e293b]">{totalMeldinger}</p>
          <p className="text-xs text-[#64748b] mt-1">Meldinger totalt</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 text-center">
          <p className="text-3xl font-bold text-red-500">{totalUleste}</p>
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
                      <p className="text-sm font-medium text-[#1e293b]">{s.takstmannNavn ?? "–"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-[#374151]">
                        {s.kundeNavn ?? s.meglerNavn ?? "–"}
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">
                        {s.kundeNavn ? "Privatkunde" : s.meglerNavn ? "Megler" : ""}
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

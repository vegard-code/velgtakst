import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createServiceClient();

  // Hent statistikk
  const [
    { count: totalBrukere },
    { count: totalTakstmenn },
    { count: totalMeglere },
    { count: totalKunder },
    { count: totalOppdrag },
    { count: aktiveFylker },
    { count: nyeBestillinger },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("rolle", "takstmann_admin"),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("rolle", "megler"),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("rolle", "privatkunde"),
    supabase.from("oppdrag").select("*", { count: "exact", head: true }),
    supabase.from("fylke_synlighet").select("*", { count: "exact", head: true }).eq("er_aktiv", true),
    supabase.from("bestillinger").select("*", { count: "exact", head: true }).eq("status", "ny"),
  ]);

  // Siste registrerte brukere
  const { data: sisteBrukere } = await supabase
    .from("user_profiles")
    .select("id, navn, rolle, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Siste oppdrag
  const { data: sisteOppdrag } = await supabase
    .from("oppdrag")
    .select("id, tittel, status, oppdrag_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Totalt brukere", verdi: totalBrukere ?? 0, farge: "bg-blue-50 text-blue-700" },
    { label: "Takstmenn", verdi: totalTakstmenn ?? 0, farge: "bg-green-50 text-green-700" },
    { label: "Meglere", verdi: totalMeglere ?? 0, farge: "bg-purple-50 text-purple-700" },
    { label: "Privatkunder", verdi: totalKunder ?? 0, farge: "bg-amber-50 text-amber-700" },
    { label: "Oppdrag totalt", verdi: totalOppdrag ?? 0, farge: "bg-cyan-50 text-cyan-700" },
    { label: "Aktive fylker", verdi: aktiveFylker ?? 0, farge: "bg-emerald-50 text-emerald-700" },
    { label: "Nye bestillinger", verdi: nyeBestillinger ?? 0, farge: "bg-red-50 text-red-700" },
  ];

  const rolleFarger: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    takstmann_admin: "bg-green-100 text-green-700",
    takstmann: "bg-green-50 text-green-600",
    megler: "bg-purple-100 text-purple-700",
    privatkunde: "bg-amber-100 text-amber-700",
  };

  const statusFarger: Record<string, string> = {
    ny: "bg-blue-100 text-blue-700",
    akseptert: "bg-green-100 text-green-700",
    under_befaring: "bg-amber-100 text-amber-700",
    rapport_levert: "bg-cyan-100 text-cyan-700",
    betalt: "bg-emerald-100 text-emerald-700",
    kansellert: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Admin Dashboard</h1>

      {/* Statistikk-kort */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-[#64748b] text-xs font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-[#1e293b]">{s.verdi}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Siste brukere */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h2 className="text-lg font-semibold text-[#1e293b] mb-4">Siste registrerte brukere</h2>
          {sisteBrukere && sisteBrukere.length > 0 ? (
            <div className="space-y-3">
              {sisteBrukere.map((bruker) => (
                <div key={bruker.id} className="flex items-center justify-between py-2 border-b border-[#f1f5f9] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1e293b]">{bruker.navn}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {new Date(bruker.created_at).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${rolleFarger[bruker.rolle] ?? "bg-gray-100 text-gray-600"}`}>
                    {bruker.rolle}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8]">Ingen brukere registrert ennå.</p>
          )}
        </div>

        {/* Siste oppdrag */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h2 className="text-lg font-semibold text-[#1e293b] mb-4">Siste oppdrag</h2>
          {sisteOppdrag && sisteOppdrag.length > 0 ? (
            <div className="space-y-3">
              {sisteOppdrag.map((oppdrag) => (
                <div key={oppdrag.id} className="flex items-center justify-between py-2 border-b border-[#f1f5f9] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1e293b]">{oppdrag.tittel}</p>
                    <p className="text-xs text-[#94a3b8]">
                      {oppdrag.oppdrag_type} – {new Date(oppdrag.created_at).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${statusFarger[oppdrag.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {oppdrag.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8]">Ingen oppdrag opprettet ennå.</p>
          )}
        </div>
      </div>
    </div>
  );
}

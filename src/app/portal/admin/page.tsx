import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FYLKER, getFylkePris } from "@/lib/supabase/types";

export default async function AdminDashboardPage() {
  const supabase = await createServiceClient();

  // Hent all statistikk parallelt
  const [
    { count: totalTakstmenn },
    { count: totalMeglere },
    { count: totalKunder },
    { count: totalOppdrag },
    { count: aktiveFylkerCount },
    { count: nyeBestillinger },
    { data: abonnementer },
    { data: userProfilesBrukere },
    { data: takstmannBrukere },
    { data: sisteOppdrag },
    { data: sisteBestillinger },
    { data: aktiveFylker },
    { count: totalSamtaler },
    { count: totalMeldinger },
    { count: ulesteMeldinger },
    { count: totalVurderinger },
  ] = await Promise.all([
    supabase.from("takstmann_profiler").select("*", { count: "exact", head: true }),
    supabase.from("megler_profiler").select("*", { count: "exact", head: true }),
    supabase.from("privatkunde_profiler").select("*", { count: "exact", head: true }),
    supabase.from("oppdrag").select("*", { count: "exact", head: true }),
    supabase.from("fylke_synlighet").select("*", { count: "exact", head: true }).eq("er_aktiv", true),
    supabase.from("bestillinger").select("*", { count: "exact", head: true }).eq("status", "ny"),
    supabase.from("abonnementer").select("id, status, maanedlig_belop, proveperiode_slutt, company_id"),
    supabase.from("user_profiles").select("id, navn, rolle, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("takstmann_profiler").select("user_id, navn, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("oppdrag").select("id, tittel, status, oppdrag_type, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("bestillinger").select("id, status, oppdrag_type, adresse, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("fylke_synlighet").select("fylke_id, er_aktiv").eq("er_aktiv", true),
    supabase.from("samtaler").select("*", { count: "exact", head: true }),
    supabase.from("meldinger").select("*", { count: "exact", head: true }),
    supabase.from("meldinger").select("*", { count: "exact", head: true }).eq("lest", false),
    supabase.from("megler_vurderinger").select("*", { count: "exact", head: true }),
  ]);

  const totalBrukere = (totalTakstmenn ?? 0) + (totalMeglere ?? 0) + (totalKunder ?? 0);

  // Slå sammen siste brukere fra user_profiles og takstmann_profiler
  const userProfileIds = new Set((userProfilesBrukere ?? []).map(u => u.id));
  const sisteBrukere = [
    ...(userProfilesBrukere ?? []).map(u => ({ id: u.id, navn: u.navn, rolle: u.rolle, created_at: u.created_at })),
    ...(takstmannBrukere ?? [])
      .filter(t => t.user_id && !userProfileIds.has(t.user_id))
      .map(t => ({ id: t.user_id!, navn: t.navn, rolle: "takstmann" as const, created_at: t.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

  // Beregn abonnement-statistikk
  const proveperioder = abonnementer?.filter(a => a.status === "proveperiode").length ?? 0;
  const aktiveAbonnementer = abonnementer?.filter(a => a.status === "aktiv").length ?? 0;
  const kansellerteAbonnementer = abonnementer?.filter(a => a.status === "kansellert").length ?? 0;

  // Beregn estimert månedlig inntekt fra aktive fylker
  const fylkeInntekt = (aktiveFylker ?? []).reduce((sum, f) => {
    const fylke = FYLKER.find(fy => fy.id === f.fylke_id);
    return sum + (fylke ? getFylkePris(fylke.id) : 199);
  }, 0);

  // Beregn Vipps-inntekt fra aktive abonnementer
  const vippsInntekt = abonnementer
    ?.filter(a => a.status === "aktiv")
    .reduce((sum, a) => sum + (a.maanedlig_belop ?? 0), 0) ?? 0;

  // Siste 7 dager registreringer
  const now = new Date();
  const syvDagerSiden = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nyeBrukere7d = sisteBrukere?.filter(b => b.created_at > syvDagerSiden).length ?? 0;

  const rolleFarger: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    takstmann_admin: "bg-green-100 text-green-700",
    takstmann: "bg-green-50 text-green-600",
    megler: "bg-purple-100 text-purple-700",
    privatkunde: "bg-amber-100 text-amber-700",
  };

  const rolleNavn: Record<string, string> = {
    admin: "Admin",
    takstmann_admin: "Takstmann (admin)",
    takstmann: "Takstmann",
    megler: "Megler",
    privatkunde: "Privatkunde",
  };

  const statusFarger: Record<string, string> = {
    ny: "bg-blue-100 text-blue-700",
    akseptert: "bg-green-100 text-green-700",
    under_befaring: "bg-amber-100 text-amber-700",
    rapport_levert: "bg-cyan-100 text-cyan-700",
    betalt: "bg-emerald-100 text-emerald-700",
    kansellert: "bg-red-100 text-red-700",
    avslatt: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Dashboard</h1>
          <p className="text-sm text-[#64748b]">Oversikt over VelgTakst-plattformen</p>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Oppdatert {new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Hovedtall */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            {nyeBrukere7d > 0 && (
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                +{nyeBrukere7d} denne uken
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-[#1e293b]">{totalBrukere ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Totalt brukere</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1e293b]">{totalTakstmenn ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Takstmenn registrert</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            {(nyeBestillinger ?? 0) > 0 && (
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                {nyeBestillinger} ubehandlet
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-[#1e293b]">{totalOppdrag ?? 0}</p>
          <p className="text-xs text-[#64748b] mt-1">Oppdrag totalt</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1e293b]">{fylkeInntekt.toLocaleString("nb-NO")} <span className="text-base font-normal text-[#94a3b8]">kr</span></p>
          <p className="text-xs text-[#64748b] mt-1">Estimert mnd. inntekt ({aktiveFylkerCount ?? 0} aktive fylker)</p>
        </div>
      </div>

      {/* Abonnement-oversikt */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{proveperioder}</p>
            <p className="text-xs text-[#64748b]">Prøveperioder</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{aktiveAbonnementer}</p>
            <p className="text-xs text-[#64748b]">Betalende</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{kansellerteAbonnementer}</p>
            <p className="text-xs text-[#64748b]">Kansellerte</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{(vippsInntekt / 100).toLocaleString("nb-NO")} kr</p>
            <p className="text-xs text-[#64748b]">Vipps mnd. inntekt</p>
          </div>
        </div>
      </div>

      {/* Bruker-fordeling + snarveier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <h3 className="text-sm font-semibold text-[#1e293b] mb-3">Brukerfordeling</h3>
          <div className="space-y-2">
            {[
              { label: "Takstmenn", count: totalTakstmenn ?? 0, color: "bg-green-500" },
              { label: "Meglere", count: totalMeglere ?? 0, color: "bg-purple-500" },
              { label: "Privatkunder", count: totalKunder ?? 0, color: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#64748b]">{item.label}</span>
                  <span className="font-semibold text-[#1e293b]">{item.count}</span>
                </div>
                <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${totalBrukere ? Math.max(4, (item.count / (totalBrukere ?? 1)) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-[#1e293b] mb-3">Hurtiglenker</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/portal/admin/brukere", label: "Administrer brukere", icon: "👤", desc: `${totalBrukere ?? 0} brukere` },
              { href: "/portal/admin/takstmenn", label: "Se takstmenn", icon: "🏠", desc: `${totalTakstmenn ?? 0} registrert` },
              { href: "/portal/admin/bestillinger", label: "Bestillinger", icon: "📬", desc: `${nyeBestillinger ?? 0} nye` },
              { href: "/portal/admin/abonnementer", label: "Abonnementer", icon: "💳", desc: `${aktiveFylkerCount ?? 0} aktive fylker` },
              { href: "/portal/admin/meldinger", label: "Meldinger", icon: "💬", desc: `${totalSamtaler ?? 0} samtaler, ${ulesteMeldinger ?? 0} uleste` },
              { href: "/portal/admin/vurderinger", label: "Vurderinger", icon: "⭐", desc: `${totalVurderinger ?? 0} totalt` },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#e2e8f0] hover:border-[#285982] hover:bg-[#f0f7ff] transition-colors group"
              >
                <span className="text-xl">{link.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#1e293b] group-hover:text-[#285982]">{link.label}</p>
                  <p className="text-xs text-[#94a3b8]">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Melding- og vurdering-statistikk */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">💬</div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{totalSamtaler ?? 0}</p>
            <p className="text-xs text-[#64748b]">Samtaler</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm">📨</div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{totalMeldinger ?? 0}</p>
            <p className="text-xs text-[#64748b]">Meldinger sendt</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 text-sm">🔴</div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{ulesteMeldinger ?? 0}</p>
            <p className="text-xs text-[#64748b]">Uleste meldinger</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-sm">⭐</div>
          <div>
            <p className="text-lg font-bold text-[#1e293b]">{totalVurderinger ?? 0}</p>
            <p className="text-xs text-[#64748b]">Vurderinger</p>
          </div>
        </div>
      </div>

      {/* Siste aktivitet - 3 kolonner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Siste brukere */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Siste brukere</h2>
            <Link href="/portal/admin/brukere" className="text-xs text-[#285982] hover:underline">Se alle</Link>
          </div>
          {sisteBrukere && sisteBrukere.length > 0 ? (
            <div className="space-y-3">
              {sisteBrukere.map((bruker) => (
                <div key={bruker.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-xs font-semibold text-[#64748b] shrink-0">
                      {bruker.navn?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1e293b] truncate">{bruker.navn}</p>
                      <p className="text-[10px] text-[#94a3b8]">
                        {new Date(bruker.created_at).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${rolleFarger[bruker.rolle] ?? "bg-gray-100 text-gray-600"}`}>
                    {rolleNavn[bruker.rolle] ?? bruker.rolle}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8]">Ingen brukere ennå.</p>
          )}
        </div>

        {/* Siste oppdrag */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Siste oppdrag</h2>
            <Link href="/portal/admin/oppdrag" className="text-xs text-[#285982] hover:underline">Se alle</Link>
          </div>
          {sisteOppdrag && sisteOppdrag.length > 0 ? (
            <div className="space-y-3">
              {sisteOppdrag.map((oppdrag) => (
                <div key={oppdrag.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1e293b] truncate">{oppdrag.tittel}</p>
                    <p className="text-[10px] text-[#94a3b8]">
                      {oppdrag.oppdrag_type?.replace(/_/g, " ")} – {new Date(oppdrag.created_at).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusFarger[oppdrag.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {oppdrag.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8]">Ingen oppdrag ennå.</p>
          )}
        </div>

        {/* Siste bestillinger */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1e293b]">Siste bestillinger</h2>
            <Link href="/portal/admin/bestillinger" className="text-xs text-[#285982] hover:underline">Se alle</Link>
          </div>
          {sisteBestillinger && sisteBestillinger.length > 0 ? (
            <div className="space-y-3">
              {sisteBestillinger.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1e293b] truncate">
                      {b.oppdrag_type?.replace(/_/g, " ") ?? "Bestilling"}
                    </p>
                    <p className="text-[10px] text-[#94a3b8]">
                      {b.adresse ?? "Ingen adresse"} – {new Date(b.created_at).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusFarger[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8]">Ingen bestillinger ennå.</p>
          )}
        </div>
      </div>
    </div>
  );
}

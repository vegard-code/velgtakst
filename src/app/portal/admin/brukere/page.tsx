import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import BrukerSok from "./BrukerSok";

interface Props {
  searchParams: Promise<{ sok?: string; rolle?: string }>;
}

type BrukerRad = {
  id: string;
  navn: string;
  epost: string | null;
  telefon: string | null;
  rolle: string;
  created_at: string;
};

// Høyere tall = høyere prioritet ved duplikater
const ROLLE_PRIO: Record<string, number> = {
  takstmann_admin: 5,
  takstmann: 4,
  megler: 3,
  privatkunde: 2,
  admin: 1,
};

export default async function AdminBrukerePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServiceClient();

  // perPage: 1000 hindrer at vi bare får første side (default 50)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const epostMap = new Map<string, string>();
  authUsers?.users?.forEach((u) => {
    if (u.email) epostMap.set(u.id, u.email);
  });

  // Totaler fra profiltabeller + admins
  const [
    { count: totalTakstmenn },
    { count: totalMeglere },
    { count: totalKunder },
    { count: totalAdmins },
  ] = await Promise.all([
    supabase.from("takstmann_profiler").select("*", { count: "exact", head: true }),
    supabase.from("megler_profiler").select("*", { count: "exact", head: true }),
    supabase.from("privatkunde_profiler").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("rolle", "admin"),
  ]);
  const totalBrukere = (totalTakstmenn ?? 0) + (totalMeglere ?? 0) + (totalKunder ?? 0) + (totalAdmins ?? 0);

  let brukere: BrukerRad[] = [];
  const sokFilter = params.sok ? `%${params.sok}%` : null;

  // Hjelpefunksjon: legg til bruker i Map med rolle-prioritet (høyest vinner)
  function leggTil(map: Map<string, BrukerRad>, rad: BrukerRad) {
    const eksisterende = map.get(rad.id);
    if (!eksisterende || (ROLLE_PRIO[rad.rolle] ?? 0) > (ROLLE_PRIO[eksisterende.rolle] ?? 0)) {
      map.set(rad.id, rad);
    }
  }

  if (!params.rolle || params.rolle === "alle") {
    const [
      { data: takstmenn },
      { data: meglere },
      { data: kunder },
      { data: adminBrukere },
    ] = await Promise.all([
      sokFilter
        ? supabase.from("takstmann_profiler").select("user_id, navn, epost, telefon, created_at").ilike("navn", sokFilter).order("created_at", { ascending: false })
        : supabase.from("takstmann_profiler").select("user_id, navn, epost, telefon, created_at").order("created_at", { ascending: false }),
      sokFilter
        ? supabase.from("megler_profiler").select("user_id, navn, epost, telefon, created_at").ilike("navn", sokFilter).order("created_at", { ascending: false })
        : supabase.from("megler_profiler").select("user_id, navn, epost, telefon, created_at").order("created_at", { ascending: false }),
      sokFilter
        ? supabase.from("privatkunde_profiler").select("user_id, navn, epost, telefon, created_at").ilike("navn", sokFilter).order("created_at", { ascending: false })
        : supabase.from("privatkunde_profiler").select("user_id, navn, epost, telefon, created_at").order("created_at", { ascending: false }),
      sokFilter
        ? supabase.from("user_profiles").select("id, navn, rolle, telefon, created_at").eq("rolle", "admin").ilike("navn", sokFilter).order("created_at", { ascending: false })
        : supabase.from("user_profiles").select("id, navn, rolle, telefon, created_at").eq("rolle", "admin").order("created_at", { ascending: false }),
    ]);

    const brukerMap = new Map<string, BrukerRad>();

    for (const t of (takstmenn ?? [])) {
      if (t.user_id) leggTil(brukerMap, { id: t.user_id, navn: t.navn, epost: t.epost, telefon: t.telefon, rolle: "takstmann", created_at: t.created_at });
    }
    for (const m of (meglere ?? [])) {
      if (m.user_id) leggTil(brukerMap, { id: m.user_id, navn: m.navn, epost: m.epost, telefon: m.telefon, rolle: "megler", created_at: m.created_at });
    }
    for (const k of (kunder ?? [])) {
      if (k.user_id) leggTil(brukerMap, { id: k.user_id, navn: k.navn, epost: k.epost, telefon: k.telefon, rolle: "privatkunde", created_at: k.created_at });
    }
    for (const u of (adminBrukere ?? [])) {
      leggTil(brukerMap, { id: u.id, navn: u.navn, epost: epostMap.get(u.id) ?? null, telefon: u.telefon, rolle: u.rolle, created_at: u.created_at });
    }

    brukere = Array.from(brukerMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  } else if (params.rolle === "takstmann") {
    let q = supabase.from("takstmann_profiler").select("user_id, navn, epost, telefon, created_at").order("created_at", { ascending: false });
    if (sokFilter) q = q.ilike("navn", sokFilter);
    const { data } = await q;
    brukere = (data ?? []).filter(t => t.user_id).map(t => ({ id: t.user_id!, navn: t.navn, epost: t.epost, telefon: t.telefon, rolle: "takstmann", created_at: t.created_at }));
  } else if (params.rolle === "megler") {
    let q = supabase.from("megler_profiler").select("user_id, navn, epost, telefon, created_at").order("created_at", { ascending: false });
    if (sokFilter) q = q.ilike("navn", sokFilter);
    const { data } = await q;
    brukere = (data ?? []).filter(t => t.user_id).map(t => ({ id: t.user_id!, navn: t.navn, epost: t.epost, telefon: t.telefon, rolle: "megler", created_at: t.created_at }));
  } else if (params.rolle === "privatkunde") {
    let q = supabase.from("privatkunde_profiler").select("user_id, navn, epost, telefon, created_at").order("created_at", { ascending: false });
    if (sokFilter) q = q.ilike("navn", sokFilter);
    const { data } = await q;
    brukere = (data ?? []).filter(t => t.user_id).map(t => ({ id: t.user_id!, navn: t.navn, epost: t.epost, telefon: t.telefon, rolle: "privatkunde", created_at: t.created_at }));
  }

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Brukere</h1>
          <p className="text-sm text-[#64748b]">{totalBrukere ?? 0} totalt</p>
        </div>
        <Link href="/portal/admin" className="text-sm text-[#285982] hover:underline">Tilbake</Link>
      </div>

      {/* Rolle-oversikt */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Link
          href="/portal/admin/brukere"
          className={`bg-white rounded-xl border p-4 text-center hover:border-[#285982] transition-colors ${!params.rolle || params.rolle === "alle" ? "border-[#285982] ring-1 ring-[#285982]" : "border-[#e2e8f0]"}`}
        >
          <p className="text-2xl font-bold text-[#1e293b]">{totalBrukere ?? 0}</p>
          <p className="text-xs text-[#64748b]">Alle brukere</p>
        </Link>
        <Link
          href="/portal/admin/brukere?rolle=takstmann"
          className={`bg-white rounded-xl border p-4 text-center hover:border-green-500 transition-colors ${params.rolle === "takstmann" ? "border-green-500 ring-1 ring-green-500" : "border-[#e2e8f0]"}`}
        >
          <p className="text-2xl font-bold text-green-600">{totalTakstmenn ?? 0}</p>
          <p className="text-xs text-[#64748b]">Takstmenn</p>
        </Link>
        <Link
          href="/portal/admin/brukere?rolle=megler"
          className={`bg-white rounded-xl border p-4 text-center hover:border-purple-500 transition-colors ${params.rolle === "megler" ? "border-purple-500 ring-1 ring-purple-500" : "border-[#e2e8f0]"}`}
        >
          <p className="text-2xl font-bold text-purple-600">{totalMeglere ?? 0}</p>
          <p className="text-xs text-[#64748b]">Meglere</p>
        </Link>
        <Link
          href="/portal/admin/brukere?rolle=privatkunde"
          className={`bg-white rounded-xl border p-4 text-center hover:border-amber-500 transition-colors ${params.rolle === "privatkunde" ? "border-amber-500 ring-1 ring-amber-500" : "border-[#e2e8f0]"}`}
        >
          <p className="text-2xl font-bold text-amber-600">{totalKunder ?? 0}</p>
          <p className="text-xs text-[#64748b]">Privatkunder</p>
        </Link>
      </div>

      {/* Søk */}
      <div className="mb-4">
        <BrukerSok initialSok={params.sok ?? ""} rolle={params.rolle ?? "alle"} />
      </div>

      {/* Tabell */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Navn</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">E-post</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Telefon</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Rolle</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3">Registrert</th>
                <th className="text-left text-xs font-semibold text-[#64748b] px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {brukere && brukere.length > 0 ? (
                brukere.map((bruker) => (
                  <tr key={bruker.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-xs font-semibold text-[#64748b] shrink-0">
                          {bruker.navn?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-[#1e293b]">{bruker.navn}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-[#64748b]">{bruker.epost ?? epostMap.get(bruker.id) ?? "–"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-[#64748b]">{bruker.telefon ?? "–"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rolleFarger[bruker.rolle] ?? "bg-gray-100 text-gray-600"}`}>
                        {rolleNavn[bruker.rolle] ?? bruker.rolle}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-[#94a3b8]">
                        {new Date(bruker.created_at).toLocaleDateString("nb-NO")}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/portal/admin/brukere/${bruker.id}`}
                        className="text-xs text-[#285982] hover:text-[#1e4a6e] font-medium"
                      >
                        Se detaljer
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#94a3b8]">
                    {params.sok ? `Ingen brukere matcher "${params.sok}"` : "Ingen brukere registrert ennå."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {brukere && brukere.length > 0 && (
          <div className="px-5 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <p className="text-xs text-[#94a3b8]">Viser {brukere.length} brukere{params.sok ? ` for "${params.sok}"` : ""}{params.rolle && params.rolle !== "alle" ? ` (${rolleNavn[params.rolle] ?? params.rolle})` : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

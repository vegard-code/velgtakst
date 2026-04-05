import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import MergePanel from "./MergePanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminBrukerDetaljPage({ params }: Props) {
  const { id } = await params;
  const svc = await createServiceClient();

  // Hent auth-bruker
  const { data: authUser } = await svc.auth.admin.getUserById(id);
  if (!authUser.user) notFound();

  const authU = authUser.user;

  // Hent alle profiler parallelt
  const [
    { data: userProfil },
    { data: takstProfil },
    { data: meglerProfil },
    { data: kundeProfil },
  ] = await Promise.all([
    svc.from("user_profiles").select("*").eq("id", id).maybeSingle(),
    svc.from("takstmann_profiler").select("*").eq("user_id", id).maybeSingle(),
    svc.from("megler_profiler").select("*").eq("user_id", id).maybeSingle(),
    svc.from("privatkunde_profiler").select("*").eq("user_id", id).maybeSingle(),
  ]);

  const navn = takstProfil?.navn ?? meglerProfil?.navn ?? kundeProfil?.navn ?? userProfil?.navn ?? "Ukjent";
  const rolle = userProfil?.rolle ?? "ukjent";

  // Hent oppdragsdata for å vise aktivitetsnivå
  const profId = takstProfil?.id ?? meglerProfil?.id ?? kundeProfil?.id;
  const profKolonne = takstProfil ? "takstmann_id" : meglerProfil ? "megler_id" : "privatkunde_id";

  const { count: oppdragCount } = profId
    ? await svc.from("oppdrag").select("*", { count: "exact", head: true }).eq(profKolonne, profId)
    : { count: 0 };

  // Finn mulige duplikater: andre brukere med samme navn (case-insensitive)
  const navnNormalisert = navn.toLowerCase().trim();

  const [
    { data: takstDup },
    { data: meglerDup },
    { data: kundeDup },
  ] = await Promise.all([
    svc.from("takstmann_profiler").select("user_id, navn, epost, created_at").ilike("navn", navnNormalisert).neq("user_id", id),
    svc.from("megler_profiler").select("user_id, navn, epost, created_at").ilike("navn", navnNormalisert).neq("user_id", id),
    svc.from("privatkunde_profiler").select("user_id, navn, epost, created_at").ilike("navn", navnNormalisert).neq("user_id", id),
  ]);

  // Slå sammen og dedupliser duplikater
  const dupMap = new Map<string, { id: string; navn: string; epost: string | null; rolle: string; created_at: string }>();
  for (const t of (takstDup ?? [])) {
    if (t.user_id) dupMap.set(t.user_id, { id: t.user_id, navn: t.navn, epost: t.epost, rolle: "takstmann", created_at: t.created_at });
  }
  for (const m of (meglerDup ?? [])) {
    if (m.user_id && !dupMap.has(m.user_id)) dupMap.set(m.user_id, { id: m.user_id, navn: m.navn, epost: m.epost, rolle: "megler", created_at: m.created_at });
  }
  for (const k of (kundeDup ?? [])) {
    if (k.user_id && !dupMap.has(k.user_id)) dupMap.set(k.user_id, { id: k.user_id, navn: k.navn, epost: k.epost, rolle: "privatkunde", created_at: k.created_at });
  }
  const muligeDuplikater = Array.from(dupMap.values());

  // Hent auth-info for duplikater
  const dupMedAuth: Array<{
    id: string; navn: string; epost: string | null; rolle: string; created_at: string;
    authEpost: string | null; harVipps: boolean; oppdragCount: number;
  }> = [];

  for (const dup of muligeDuplikater) {
    const { data: dupAuth } = await svc.auth.admin.getUserById(dup.id);
    const dupProfKolonne = dup.rolle === "takstmann" ? "takstmann_id" : dup.rolle === "megler" ? "megler_id" : "privatkunde_id";
    const { data: dupProfil } = await svc.from(
      dup.rolle === "takstmann" ? "takstmann_profiler" : dup.rolle === "megler" ? "megler_profiler" : "privatkunde_profiler"
    ).select("id").eq("user_id", dup.id).maybeSingle();
    const { count: dupOppdrag } = dupProfil
      ? await svc.from("oppdrag").select("*", { count: "exact", head: true }).eq(dupProfKolonne, dupProfil.id)
      : { count: 0 };

    dupMedAuth.push({
      ...dup,
      authEpost: dupAuth.user?.email ?? null,
      harVipps: !!dupAuth.user?.user_metadata?.vipps_sub,
      oppdragCount: dupOppdrag ?? 0,
    });
  }

  const harVipps = !!authU.user_metadata?.vipps_sub;
  const leverandorer = authU.app_metadata?.providers ?? [];

  const rolleFarger: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    takstmann_admin: "bg-green-100 text-green-700",
    takstmann: "bg-green-50 text-green-600",
    megler: "bg-purple-100 text-purple-700",
    privatkunde: "bg-amber-100 text-amber-700",
  };
  const rolleNavn: Record<string, string> = {
    admin: "Admin", takstmann_admin: "Takstmann (admin)",
    takstmann: "Takstmann", megler: "Megler", privatkunde: "Privatkunde",
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/portal/admin/brukere" className="text-sm text-[#285982] hover:underline">← Brukere</Link>
      </div>

      {/* Bruker-kort */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#e8f0f8] flex items-center justify-center text-lg font-bold text-[#285982] shrink-0">
            {navn.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-[#1e293b]">{navn}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rolleFarger[rolle] ?? "bg-gray-100 text-gray-600"}`}>
                {rolleNavn[rolle] ?? rolle}
              </span>
              {harVipps && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Vipps</span>
              )}
            </div>
            <p className="text-sm text-[#64748b]">{authU.email}</p>
            <p className="text-xs text-[#94a3b8] mt-1">
              Registrert {new Date(authU.created_at).toLocaleDateString("nb-NO")}
              {leverandorer.length > 0 && ` · via ${leverandorer.join(", ")}`}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-[#e2e8f0] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#1e293b]">{oppdragCount ?? 0}</p>
            <p className="text-xs text-[#64748b]">Oppdrag</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1e293b]">{takstProfil ? "Ja" : "–"}</p>
            <p className="text-xs text-[#64748b]">Takstmann-profil</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1e293b]">{meglerProfil ? "Ja" : "–"}</p>
            <p className="text-xs text-[#64748b]">Megler-profil</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1e293b]">{kundeProfil ? "Ja" : "–"}</p>
            <p className="text-xs text-[#64748b]">Kunde-profil</p>
          </div>
        </div>
      </div>

      {/* Mulige duplikater */}
      {muligeDuplikater.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center text-sm text-[#94a3b8]">
          Ingen mulige duplikater funnet for «{navn}».
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h2 className="text-sm font-semibold text-[#1e293b]">
              {dupMedAuth.length} mulig{dupMedAuth.length !== 1 ? "e" : ""} duplikat{dupMedAuth.length !== 1 ? "er" : ""} funnet
            </h2>
          </div>

          <MergePanel
            bevarBruker={{
              id,
              navn,
              epost: authU.email ?? null,
              rolle,
              harVipps,
              oppdragCount: oppdragCount ?? 0,
            }}
            duplikater={dupMedAuth.map(d => ({
              id: d.id,
              navn: d.navn,
              epost: d.authEpost ?? d.epost,
              rolle: d.rolle,
              harVipps: d.harVipps,
              oppdragCount: d.oppdragCount,
            }))}
          />
        </div>
      )}
    </div>
  );
}

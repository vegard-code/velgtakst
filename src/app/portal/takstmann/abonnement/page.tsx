import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FYLKER, getFylkePris } from "@/lib/supabase/types";
import { hentEllerOpprettAbonnement } from "@/lib/actions/fylker";
import AbonnementKlient from "./AbonnementKlient";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceSupabase = await createServiceClient();

  const { data: takstmann } = await serviceSupabase
    .from("takstmann_profiler")
    .select("id, company_id")
    .eq("user_id", user.id)
    .single();

  if (!takstmann?.company_id) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1e293b] mb-4">Abonnement</h1>
        <div className="portal-card p-6 text-center">
          <p className="text-[#64748b]">Du må fullføre profilen din først.</p>
        </div>
      </div>
    );
  }

  const abonnement = await hentEllerOpprettAbonnement(takstmann.company_id);

  // Hent aktive fylker
  const { data: aktiveSynligheter } = await serviceSupabase
    .from("fylke_synlighet")
    .select("fylke_id")
    .eq("takstmann_id", takstmann.id)
    .eq("er_aktiv", true);

  const aktiveFylkerIds = (aktiveSynligheter ?? []).map(s => s.fylke_id);
  const aktiveFylker = FYLKER.filter(f => aktiveFylkerIds.includes(f.id));
  const maanedligKostnad = aktiveFylker.reduce((sum, f) => sum + getFylkePris(f.id), 0);

  return (
    <AbonnementKlient
      abonnement={abonnement}
      companyId={takstmann.company_id}
      aktiveFylker={aktiveFylker.map(f => ({ navn: f.navn, pris: getFylkePris(f.id) }))}
      maanedligKostnad={maanedligKostnad}
    />
  );
}

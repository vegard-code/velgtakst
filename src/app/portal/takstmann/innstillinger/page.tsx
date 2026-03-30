import { createClient } from "@/lib/supabase/server";
import InnstillingerForm from "./InnstillingerForm";

export default async function InnstillingerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("user_profiles")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .single();

  const { data: settings } = profil?.company_id
    ? await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", profil.company_id)
        .single()
    : { data: null };

  const { data: takstmannProfil } = await supabase
    .from("takstmann_profiler")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Innstillinger</h1>
      <InnstillingerForm
        profil={profil}
        settings={settings}
        takstmannProfil={takstmannProfil}
      />
    </div>
  );
}

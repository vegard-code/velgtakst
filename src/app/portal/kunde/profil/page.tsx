import { createClient } from "@/lib/supabase/server";
import KundeProfilForm from "./KundeProfilForm";
import SlettKontoSeksjon from "@/components/portal/SlettKontoSeksjon";

export default async function KundeProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("privatkunde_profiler")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Min profil</h1>
        <KundeProfilForm profil={profil} />
      </div>
      <SlettKontoSeksjon />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import MeglerProfilForm from "./MeglerProfilForm";
import SlettKontoSeksjon from "@/components/portal/SlettKontoSeksjon";

export default async function MeglerProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("megler_profiler")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Min profil</h1>
        <MeglerProfilForm profil={profil} />
      </div>
      <SlettKontoSeksjon />
    </div>
  );
}

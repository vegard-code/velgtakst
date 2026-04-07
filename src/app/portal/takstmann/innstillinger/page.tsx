import { createClient } from "@/lib/supabase/server";
import InnstillingerForm from "./InnstillingerForm";
import SlettKontoSeksjon from "@/components/portal/SlettKontoSeksjon";
import { Suspense } from "react";

export default async function InnstillingerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil, error: profilError } = await supabase
    .from("user_profiles")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .maybeSingle();
  if (profilError) {
    console.error('[user_profiles] Feil ved henting av profil i InnstillingerPage:', profilError.message);
    return null;
  }

  const { data: settings } = profil?.company_id
    ? await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", profil.company_id)
        .maybeSingle()
    : { data: null };

  const { data: takstmannProfil, error: takstmannProfilError } = await supabase
    .from("takstmann_profiler")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (takstmannProfilError) {
    console.error('[takstmann_profiler] Feil ved henting av profil i InnstillingerPage:', takstmannProfilError.message);
    return null;
  }

  // Sjekk om Google Calendar er koblet til
  const googleKoblet = takstmannProfil
    ? await (async () => {
        const { data } = await supabase
          .from("google_calendar_tokens")
          .select("id")
          .eq("takstmann_id", takstmannProfil.id)
          .maybeSingle();
        return !!data;
      })()
    : false;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Innstillinger</h1>
      <Suspense>
        <InnstillingerForm
          profil={profil}
          settings={settings}
          takstmannProfil={takstmannProfil}
          googleKoblet={googleKoblet}
        />
      </Suspense>
      <div className="mt-8">
        <SlettKontoSeksjon />
      </div>
    </div>
  );
}

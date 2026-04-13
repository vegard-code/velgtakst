import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isArkatEnabled } from "@/features/arkat/lib/feature-flag";
import { harFeatureTilgang } from "@/lib/feature-tilgang";
import ArkatAssistantForm from "@/features/arkat/components/ArkatAssistantForm";

export default async function ArkatPage() {
  // Global kill switch
  if (!isArkatEnabled()) {
    redirect("/portal/takstmann");
  }

  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/logg-inn");

  // Rollesjekk
  const { data: profil } = await supabase
    .from("user_profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();

  if (!profil) redirect("/portal");

  const tillattRoller = ["takstmann", "takstmann_admin", "admin"];
  if (!tillattRoller.includes(profil.rolle)) {
    redirect("/portal");
  }

  // Feature-tilgang — admin har alltid tilgang
  if (profil.rolle !== "admin") {
    const harTilgang = await harFeatureTilgang(user.id, "arkat_skrivehjelp");
    if (!harTilgang) {
      redirect("/portal/takstmann");
    }
  }

  return <ArkatAssistantForm />;
}

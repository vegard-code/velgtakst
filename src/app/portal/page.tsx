import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PortalRootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/logg-inn");

  const { data: profil } = await supabase
    .from("user_profiles")
    .select("rolle")
    .eq("id", user.id)
    .maybeSingle();

  const rolle = profil?.rolle;

  if (rolle === "takstmann" || rolle === "takstmann_admin") {
    redirect("/portal/takstmann");
  } else if (rolle === "megler") {
    redirect("/portal/megler");
  } else if (rolle === "privatkunde") {
    redirect("/portal/kunde");
  }

  // Fallback
  redirect("/logg-inn");
}

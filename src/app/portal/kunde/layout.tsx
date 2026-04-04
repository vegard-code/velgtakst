import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KundeSidebar from "@/components/portal/KundeSidebar";
import PortalHeader from "@/components/portal/PortalHeader";
import { hentAntallUleste } from "@/lib/actions/meldinger"
import { hentAntallNyeBestillinger } from "@/lib/actions/bestillinger";

export default async function KundePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/logg-inn");

  const { data: profilRaw } = await supabase
    .from("user_profiles")
    .select("rolle, navn")
    .eq("id", user.id)
    .single();
  const profil = profilRaw as { rolle: string; navn: string } | null;

  if (!profil || (profil.rolle !== "privatkunde" && profil.rolle !== "admin")) redirect("/portal");

  const [ulesteMeldinger, nyeBestillinger] = await Promise.all([
    hentAntallUleste(),
    hentAntallNyeBestillinger(),
  ]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      <KundeSidebar navn={profil.navn} ulesteMeldinger={ulesteMeldinger} nyeBestillinger={nyeBestillinger} />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader navn={profil.navn} portalType="kunde" />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

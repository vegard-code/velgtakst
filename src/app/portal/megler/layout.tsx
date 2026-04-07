import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MeglerSidebar from "@/components/portal/MeglerSidebar";
import PortalHeader from "@/components/portal/PortalHeader";
import { hentAntallUleste } from "@/lib/actions/meldinger";

export default async function MeglerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/logg-inn");

  const { data: profilRaw } = await supabase
    .from("user_profiles")
    .select("rolle, navn, company_id")
    .eq("id", user.id)
    .maybeSingle();
  const profil = profilRaw as { rolle: string; navn: string; company_id: string | null } | null;

  if (!profil || (profil.rolle !== "megler" && profil.rolle !== "admin")) redirect("/portal");

  const ulesteMeldinger = await hentAntallUleste();

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      <MeglerSidebar navn={profil.navn} ulesteMeldinger={ulesteMeldinger} />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader navn={profil.navn} portalType="megler" />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

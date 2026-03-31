import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TakstmannSidebar from "@/components/portal/TakstmannSidebar";
import PortalHeader from "@/components/portal/PortalHeader";
import { hentAntallUleste } from "@/lib/actions/meldinger";

export default async function TakstmannPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/logg-inn");

  const { data: profilRaw } = await supabase
    .from("user_profiles")
    .select("rolle, navn, company_id")
    .eq("id", user.id)
    .single();
  const profil = profilRaw as { rolle: string; navn: string; company_id: string | null } | null;

  if (!profil || (profil.rolle !== "takstmann" && profil.rolle !== "takstmann_admin")) {
    redirect("/portal");
  }

  const { data: company } = profil.company_id
    ? await supabase
        .from("companies")
        .select("navn")
        .eq("id", profil.company_id)
        .single()
    : { data: null };

  const ulesteMeldinger = await hentAntallUleste();

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      <TakstmannSidebar
        navn={profil.navn}
        firmanavn={company?.navn}
        rolle={profil.rolle}
        ulesteMeldinger={ulesteMeldinger}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader navn={profil.navn} portalType="takstmann" />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

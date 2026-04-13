import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import TakstmannSidebar from "@/components/portal/TakstmannSidebar";
import PortalHeader from "@/components/portal/PortalHeader";
import { hentAntallUleste } from "@/lib/actions/meldinger"
import { hentAntallNyeBestillinger } from "@/lib/actions/bestillinger";
import { harFeatureTilgang } from "@/lib/feature-tilgang";
import { isArkatEnabled } from "@/features/arkat/lib/feature-flag";

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

  const serviceSupabase = await createServiceClient();

  const { data: profilRaw } = await serviceSupabase
    .from("user_profiles")
    .select("rolle, navn, company_id")
    .eq("id", user.id)
    .single();
  const profil = profilRaw as { rolle: string; navn: string; company_id: string | null } | null;

  if (!profil || (profil.rolle !== "takstmann" && profil.rolle !== "takstmann_admin" && profil.rolle !== "admin")) {
    redirect("/portal");
  }

  const [companyResult, ulesteMeldinger, nyeBestillinger, harArkat] = await Promise.all([
    profil.company_id
      ? serviceSupabase.from("companies").select("navn").eq("id", profil.company_id).single()
      : Promise.resolve({ data: null }),
    hentAntallUleste(),
    hentAntallNyeBestillinger(),
    // Feature-tilgang: ARKAT vises i nav hvis global flag er på OG bruker har tilgang (eller er admin)
    isArkatEnabled()
      ? profil.rolle === "admin"
        ? Promise.resolve(true)
        : harFeatureTilgang(user.id, "arkat_skrivehjelp")
      : Promise.resolve(false),
  ]);
  const company = companyResult.data;

  // Bygg feature-liste for sidebar
  const features: string[] = [];
  if (harArkat) features.push("arkat_skrivehjelp");

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      <TakstmannSidebar
        navn={profil.navn}
        firmanavn={company?.navn}
        rolle={profil.rolle}
        ulesteMeldinger={ulesteMeldinger}
        nyeBestillinger={nyeBestillinger}
        features={features}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader navn={profil.navn} portalType="takstmann" />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

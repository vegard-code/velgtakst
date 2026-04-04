import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/portal/AdminSidebar";
import PortalHeader from "@/components/portal/PortalHeader";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/logg-inn");

  const { data: profilRaw } = await supabase
    .from("user_profiles")
    .select("rolle, navn")
    .eq("id", user.id)
    .single();
  const profil = profilRaw as { rolle: string; navn: string } | null;

  if (!profil || profil.rolle !== "admin") {
    redirect("/portal");
  }

  const serviceClient = await createServiceClient();
  const { count: nyeBestillinger } = await serviceClient
    .from("bestillinger")
    .select("id", { count: "exact", head: true })
    .in("status", ["forespørsel", "ny", "tilbud_sendt", "akseptert"]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      <AdminSidebar navn={profil.navn} nyeBestillinger={nyeBestillinger ?? 0} />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader navn={profil.navn} portalType="admin" />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

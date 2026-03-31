import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/logg-inn");

  return (
    <div className="portal-body min-h-screen">
      {children}
    </div>
  );
}

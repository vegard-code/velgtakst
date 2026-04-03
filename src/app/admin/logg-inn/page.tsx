import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin innlogging",
  robots: { index: false, follow: false },
};

export default async function AdminLoggInnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profil } = await supabase
      .from("user_profiles")
      .select("rolle")
      .eq("id", user.id)
      .single();
    const rolle = (profil as { rolle?: string } | null)?.rolle;
    if (rolle === "admin") redirect("/portal/admin");
    else redirect("/portal");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-white">Admin innlogging</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Kun autorisert administrator har tilgang.
          </p>
        </div>

        <div className="bg-card-bg border border-card-border rounded-2xl p-6">
          <a
            href="/api/auth/vipps?rolle=privatkunde&redirect=/portal/admin"
            className="w-full flex items-center justify-center gap-3 bg-[#ff5b24] hover:bg-[#e64e1c] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.88 6.56c-.85-.96-2.07-1.52-3.4-1.52-1.87 0-3.3.97-4.34 2.68C9.09 9.5 8.3 11.87 8.3 14.03c0 1.14.27 2.07.81 2.72.5.6 1.2.92 2.02.92 1.24 0 2.46-.84 3.52-2.42.14-.21.28-.43.41-.67l.04-.07c.07-.12.13-.25.2-.37.1.42.24.81.42 1.15.55 1.02 1.46 1.58 2.58 1.58 1.12 0 2.15-.53 2.97-1.53.76-.93 1.23-2.14 1.23-3.14 0-.42-.21-.65-.5-.65-.26 0-.45.18-.53.59-.24 1.28-1.45 3.28-3.01 3.28-.63 0-1.1-.32-1.36-.94-.2-.47-.3-1.07-.3-1.79 0-1.6.47-3.56 1.22-5.1.12-.25.17-.45.17-.62 0-.37-.24-.61-.57-.61-.28 0-.5.17-.7.55-.48.9-.94 2.14-1.3 3.53-.46 1.76-1.67 4.36-3.38 4.36-.87 0-1.37-.7-1.37-1.92 0-1.96.76-4.26 1.92-5.82.77-1.04 1.6-1.56 2.47-1.56.79 0 1.32.42 1.6 1.24.07.23.24.35.47.35.3 0 .55-.22.55-.55 0-.12-.03-.25-.08-.4-.46-1.26-1.4-2.01-2.65-2.01z"
                fill="white"
              />
            </svg>
            Logg inn med Vipps
          </a>
        </div>
      </div>
    </div>
  );
}

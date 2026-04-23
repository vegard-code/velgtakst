import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import InnstillingerForm from "./InnstillingerForm";
import SlettKontoSeksjon from "@/components/portal/SlettKontoSeksjon";
import { Suspense } from "react";

export default async function InnstillingerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceSupabase = await createServiceClient();

  const { data: profil } = await serviceSupabase
    .from("user_profiles")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .single();

  const { data: settings } = profil?.company_id
    ? await serviceSupabase
        .from("company_settings")
        .select("*")
        .eq("company_id", profil.company_id)
        .single()
    : { data: null };

  const { data: takstmannProfil } = await serviceSupabase
    .from("takstmann_profiler")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Sjekk om Google Calendar er koblet til
  const googleKoblet = takstmannProfil
    ? await (async () => {
        const { data } = await serviceSupabase
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
          outlookKoblet={false}
        />
      </Suspense>
      <div className="mt-8">
        <Link
          href="/portal/takstmann/vurderinger"
          className="portal-card p-5 flex items-center justify-between hover:bg-[#f8fafc] transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#285982]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#1e293b]">Vurderinger</p>
              <p className="text-xs text-[#64748b] mt-0.5">Se tilbakemeldinger fra kunder og meglere</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="mt-8">
        <SlettKontoSeksjon />
      </div>
    </div>
  );
}

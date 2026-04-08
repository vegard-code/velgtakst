import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/logg-inn");

  const serviceSupabase = await createServiceClient();

  const { data: profil } = await serviceSupabase
    .from("user_profiles")
    .select("navn, company_id")
    .eq("id", user.id)
    .single();

  if (!profil?.company_id) redirect("/portal/takstmann");

  const { data: company } = await serviceSupabase
    .from("companies")
    .select("onboarding_fullfort")
    .eq("id", profil.company_id)
    .single();

  // Hvis onboarding allerede er fullført, send til dashboard
  if (company?.onboarding_fullfort === true) {
    redirect("/portal/takstmann");
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-[#285982]/10 text-[#285982] text-xs font-medium px-3 py-1.5 rounded-full mb-4">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Vipps-verifisert
        </div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-2">
          Velkommen, {profil.navn}!
        </h1>
        <p className="text-[#64748b]">
          Du er innlogget med Vipps. Fullfør registreringen ved å fylle inn
          bedriftsinformasjonen din, så er du klar til å ta imot oppdrag.
        </p>
      </div>

      {/* Skjema-kort */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm">
        <OnboardingForm navn={profil.navn} />
      </div>
    </div>
  );
}

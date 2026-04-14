import { createServiceClient } from "@/lib/supabase/server";
import { BYGNINGSDELER } from "@/features/arkat/config/bygningsdeler";

// Lesbare labels
const BD_LABELS = new Map(BYGNINGSDELER.map((b) => [b.key, b.label]));
const UE_LABELS = new Map(
  BYGNINGSDELER.flatMap((b) =>
    b.underenheter.map((u) => [`${b.key}/${u.key}`, u.label])
  )
);

const VURDERING_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  bra: { label: "Ja, direkte", bg: "bg-emerald-50", text: "text-emerald-700" },
  justeringer: { label: "Med justeringer", bg: "bg-amber-50", text: "text-amber-700" },
  darlig: { label: "Nei", bg: "bg-red-50", text: "text-red-700" },
};

export default async function AdminArkatFeedbackPage() {
  const supabase = await createServiceClient();

  // Hent feedback med brukernavn
  const { data: feedback } = await supabase
    .from("arkat_feedback")
    .select("*")
    .order("opprettet", { ascending: false })
    .limit(100);

  // Hent brukernavn
  const brukerIds = [...new Set(feedback?.map((f) => f.user_id) ?? [])];
  // Hent navn — prøv takstmann_profiler først, fyll inn fra user_profiles for resten
  const { data: takstProfiler } = brukerIds.length > 0
    ? await supabase
        .from("takstmann_profiler")
        .select("id, navn")
        .in("id", brukerIds)
    : { data: [] };

  const navnMap = new Map<string, string>();
  takstProfiler?.forEach((p) => navnMap.set(p.id, p.navn));

  // Fyll inn manglende fra user_profiles (admin-brukere etc.)
  const manglerNavn = brukerIds.filter((id) => !navnMap.has(id));
  if (manglerNavn.length > 0) {
    const { data: userProfiler } = await supabase
      .from("user_profiles")
      .select("id, navn")
      .in("id", manglerNavn);
    userProfiler?.forEach((p) => navnMap.set(p.id, p.navn ?? "Ukjent"));
  }

  // Oppsummering
  const antallBra = feedback?.filter((f) => f.vurdering === "bra").length ?? 0;
  const antallJust = feedback?.filter((f) => f.vurdering === "justeringer").length ?? 0;
  const antallDarlig = feedback?.filter((f) => f.vurdering === "darlig").length ?? 0;
  const totalt = feedback?.length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">
        ARKAT Feedback
      </h1>

      {/* Oppsummering */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-[#1e293b]">{totalt}</div>
          <div className="text-xs text-[#64748b]">Totalt</div>
        </div>
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{antallBra}</div>
          <div className="text-xs text-[#64748b]">Brukt direkte</div>
        </div>
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{antallJust}</div>
          <div className="text-xs text-[#64748b]">Med justeringer</div>
        </div>
        <div className="portal-card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{antallDarlig}</div>
          <div className="text-xs text-[#64748b]">Ikke brukbar</div>
        </div>
      </div>

      {/* Feedback-liste */}
      {(!feedback || feedback.length === 0) ? (
        <div className="portal-card p-8 text-center">
          <p className="text-sm text-[#94a3b8]">Ingen feedback mottatt ennå.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((f) => {
            const stil = VURDERING_STYLE[f.vurdering] ?? VURDERING_STYLE.darlig;
            const bdLabel = BD_LABELS.get(f.bygningsdel) ?? f.bygningsdel;
            const ueLabel = UE_LABELS.get(`${f.bygningsdel}/${f.underenhet}`) ?? f.underenhet;
            const dato = new Date(f.opprettet).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={f.id} className="portal-card p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stil.bg} ${stil.text}`}>
                      {stil.label}
                    </span>
                    <span className="text-sm font-medium text-[#1e293b]">
                      {bdLabel} — {ueLabel}
                    </span>
                    {f.tilstandsgrad && (
                      <span className="text-xs text-[#64748b] bg-[#f0f4f8] px-2 py-0.5 rounded">
                        {f.tilstandsgrad}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#94a3b8]">
                    {navnMap.get(f.user_id) ?? "Ukjent"} · {dato}
                  </div>
                </div>

                {/* Observasjon (fakta — brukerens input) */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-[#64748b] mb-1">Observasjon (brukerens input)</div>
                  <p className="text-sm text-[#1e293b] bg-[#f8fafc] rounded p-2.5 leading-relaxed">
                    {f.observasjon}
                  </p>
                </div>

                {/* Årsak — kun vist hvis den finnes (etter april 2026-splittingen) */}
                {f.arsak && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-[#64748b] mb-1">Årsak (brukerens input)</div>
                    <p className="text-sm text-[#1e293b] bg-[#f8fafc] rounded p-2.5 leading-relaxed">
                      {f.arsak}
                    </p>
                  </div>
                )}

                {/* Generert resultat */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Årsak", tekst: f.resultat_arsak },
                    { label: "Risiko", tekst: f.resultat_risiko },
                    { label: "Konsekvens", tekst: f.resultat_konsekvens },
                    { label: "Tiltak", tekst: f.resultat_tiltak },
                  ].filter(({ tekst }) => tekst).map(({ label, tekst }) => (
                    <div key={label} className="text-xs">
                      <span className="font-medium text-[#64748b]">{label}:</span>{" "}
                      <span className="text-[#1e293b]">{tekst}</span>
                    </div>
                  ))}
                </div>

                {/* Kommentar */}
                {f.kommentar && (
                  <div className="border-t border-[#e2e8f0] pt-3">
                    <div className="text-xs font-medium text-[#64748b] mb-1">Kommentar</div>
                    <p className="text-sm text-[#1e293b] italic">&ldquo;{f.kommentar}&rdquo;</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

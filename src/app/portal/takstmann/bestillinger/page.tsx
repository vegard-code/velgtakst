import { createClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus } from "@/lib/supabase/types";
import AksepterAvvisKnapp from "./AksepterAvvisKnapp";

const STATUS_BADGE: Record<BestillingStatus, string> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  avvist: "portal-badge portal-badge-red",
  kansellert: "portal-badge portal-badge-gray",
  fullfort: "portal-badge portal-badge-green",
};

export default async function BestillingerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: takstmannProfil } = await supabase
    .from("takstmann_profiler")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: bestillinger } = takstmannProfil
    ? await supabase
        .from("bestillinger")
        .select(`
          *,
          megler:megler_profiler(id, navn, meglerforetak, telefon, epost),
          kunde:privatkunde_profiler(id, navn, telefon, epost)
        `)
        .eq("takstmann_id", takstmannProfil.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Innkommende bestillinger</h1>
        <p className="text-[#64748b] text-sm mt-0.5">
          Bestillinger fra meglere og privatkunder
        </p>
      </div>

      {!bestillinger || bestillinger.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <svg className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-[#64748b] mb-2">Ingen bestillinger ennå</p>
          <p className="text-[#94a3b8] text-sm">
            Aktiver synlighet i fylker for å motta bestillinger
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bestillinger.map((b) => {
            const avsender = b.megler || b.kunde;
            return (
              <div key={b.id} className="portal-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={STATUS_BADGE[b.status as BestillingStatus] ?? "portal-badge portal-badge-gray"}>
                        {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                      </span>
                      <span className="text-xs text-[#94a3b8]">
                        {new Date(b.created_at).toLocaleDateString("nb-NO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      {b.megler && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Megler
                        </span>
                      )}
                      {b.kunde && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          Privatkunde
                        </span>
                      )}
                    </div>

                    {avsender && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-[#1e293b]">{avsender.navn}</p>
                        {b.megler?.meglerforetak && (
                          <p className="text-xs text-[#64748b]">{b.megler.meglerforetak}</p>
                        )}
                        {avsender.telefon && (
                          <p className="text-xs text-[#64748b]">{avsender.telefon}</p>
                        )}
                        {avsender.epost && (
                          <p className="text-xs text-[#64748b]">{avsender.epost}</p>
                        )}
                      </div>
                    )}

                    {b.melding && (
                      <div className="bg-[#f8fafc] rounded-lg p-3 text-sm text-[#374151]">
                        {b.melding}
                      </div>
                    )}
                  </div>

                  {b.status === "ny" && (
                    <AksepterAvvisKnapp bestillingId={b.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

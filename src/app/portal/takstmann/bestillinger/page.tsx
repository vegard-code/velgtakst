import { createClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS, OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus, OppdragType } from "@/lib/supabase/types";
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

  const nyeBestillinger = (bestillinger ?? []).filter((b) => b.status === "ny");
  const andreBestillinger = (bestillinger ?? []).filter((b) => b.status !== "ny");

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
        <div className="space-y-8">
          {/* Nye bestillinger (krever handling) */}
          {nyeBestillinger.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#285982] uppercase tracking-wide mb-3">
                Nye forespørsler ({nyeBestillinger.length})
              </h2>
              <div className="space-y-4">
                {nyeBestillinger.map((b) => (
                  <BestillingKort key={b.id} b={b} />
                ))}
              </div>
            </section>
          )}

          {/* Tidligere bestillinger */}
          {andreBestillinger.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-3">
                Tidligere ({andreBestillinger.length})
              </h2>
              <div className="space-y-3">
                {andreBestillinger.map((b) => (
                  <BestillingKort key={b.id} b={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BestillingKort — enkelt kort for én bestilling                    */
/* ------------------------------------------------------------------ */

interface BestillingKortData {
  id: string;
  status: string;
  created_at: string;
  melding: string | null;
  oppdrag_type?: string | null;
  adresse?: string | null;
  megler?: { id: string; navn: string; meglerforetak: string | null; telefon: string | null; epost: string | null } | null;
  kunde?: { id: string; navn: string; telefon: string | null; epost: string | null } | null;
}

function BestillingKort({ b }: { b: BestillingKortData }) {
  const avsender = b.megler || b.kunde;
  const typeLabel = b.oppdrag_type
    ? OPPDRAG_TYPE_LABELS[b.oppdrag_type as OppdragType] ?? b.oppdrag_type
    : null;

  return (
    <div className={`portal-card p-6 ${b.status === "ny" ? "border-l-4 border-l-[#285982]" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Status, dato og avsendertype */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={STATUS_BADGE[b.status as BestillingStatus] ?? "portal-badge portal-badge-gray"}>
              {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
            </span>
            {typeLabel && (
              <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full font-medium">
                {typeLabel}
              </span>
            )}
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
            <span className="text-xs text-[#94a3b8]">
              {new Date(b.created_at).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Avsenderinfo */}
          {avsender && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-[#1e293b]">{avsender.navn}</p>
              {b.megler?.meglerforetak && (
                <p className="text-xs text-[#64748b]">{b.megler.meglerforetak}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {avsender.telefon && (
                  <p className="text-xs text-[#64748b]">{avsender.telefon}</p>
                )}
                {avsender.epost && (
                  <p className="text-xs text-[#64748b]">{avsender.epost}</p>
                )}
              </div>
            </div>
          )}

          {/* Adresse */}
          {b.adresse && (
            <div className="flex items-center gap-1.5 mb-3 text-sm text-[#374151]">
              <svg className="w-4 h-4 text-[#94a3b8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {b.adresse}
            </div>
          )}

          {/* Melding */}
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
}

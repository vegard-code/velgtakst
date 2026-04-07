import { createClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS, OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus, OppdragType } from "@/lib/supabase/types";
import TilbudKnapper from "./TilbudKnapper";

const STATUS_BADGE: Record<string, string> = {
  forespørsel: "portal-badge portal-badge-blue",
  tilbud_sendt: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  avslått: "portal-badge portal-badge-red",
  utløpt: "portal-badge portal-badge-gray",
  bekreftet: "portal-badge portal-badge-green",
  kansellert: "portal-badge portal-badge-gray",
};

export default async function KundeBestillingerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: kundeProfil } = await supabase
    .from("privatkunde_profiler")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!kundeProfil) return null;

  const { data: bestillinger } = await supabase
    .from("bestillinger")
    .select(`
      *,
      takstmann:takstmann_profiler(id, navn, spesialitet, telefon, epost, bilde_url)
    `)
    .eq("bestilt_av_kunde_id", (kundeProfil as { id: string }).id)
    .order("created_at", { ascending: false });

  const aktive = (bestillinger ?? []).filter((b) =>
    ["forespørsel", "tilbud_sendt", "akseptert", "bekreftet"].includes(b.status)
  );
  const historikk = (bestillinger ?? []).filter((b) =>
    ["avslått", "utløpt", "kansellert"].includes(b.status)
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Mine bestillinger</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Forespørsler og tilbud fra takstmenn</p>
      </div>

      {!bestillinger || bestillinger.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <svg className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-[#64748b] mb-2">Ingen bestillinger ennå</p>
          <p className="text-[#94a3b8] text-sm">Finn en takstmann og send en forespørsel for å komme i gang</p>
        </div>
      ) : (
        <div className="space-y-8">
          {aktive.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#1e293b] uppercase tracking-wide mb-3">Aktive ({aktive.length})</h2>
              <div className="space-y-4">
                {aktive.map((b) => <BestillingKort key={b.id} b={b} />)}
              </div>
            </section>
          )}
          {historikk.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-3">Historikk ({historikk.length})</h2>
              <div className="space-y-3">
                {historikk.map((b) => <BestillingKort key={b.id} b={b} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

interface BestillingData {
  id: string;
  status: string;
  created_at: string;
  melding: string | null;
  oppdrag_type?: string | null;
  adresse?: string | null;
  tilbudspris?: number | null;
  estimert_leveringstid?: string | null;
  tilbud_sendt_at?: string | null;
  befaringsdato?: string | null;
  noekkelinfo?: string | null;
  parkering?: string | null;
  tilgang?: string | null;
  takstmann?: {
    id: string;
    navn: string;
    spesialitet: string | null;
    telefon: string | null;
    epost: string | null;
    bilde_url: string | null;
  } | null;
}

function BestillingKort({ b }: { b: BestillingData }) {
  const typeLabel = b.oppdrag_type
    ? OPPDRAG_TYPE_LABELS[b.oppdrag_type as OppdragType] ?? b.oppdrag_type
    : null;

  const tilbudFristUtloper = b.tilbud_sendt_at
    ? new Date(new Date(b.tilbud_sendt_at).getTime() + 48 * 60 * 60 * 1000)
    : null;

  const erTilbud = b.status === "tilbud_sendt";
  const erBekreftet = b.status === "bekreftet";

  return (
    <div className={`portal-card p-6 ${erTilbud ? "border-l-4 border-l-[#285982] ring-1 ring-blue-100" : erBekreftet ? "border-l-4 border-l-green-500" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={STATUS_BADGE[b.status] ?? "portal-badge portal-badge-gray"}>
          {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
        </span>
        {erTilbud && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
            Venter på ditt svar
          </span>
        )}
        {typeLabel && (
          <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full font-medium">{typeLabel}</span>
        )}
        <span className="text-xs text-[#94a3b8]">
          {new Date(b.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Takstmann-info */}
        {b.takstmann && (
          <div className="bg-[#f8fafc] rounded-xl p-4">
            <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-2">Takstmann</p>
            <p className="font-semibold text-[#1e293b]">{b.takstmann.navn}</p>
            {b.takstmann.spesialitet && <p className="text-xs text-[#64748b] mt-0.5">{b.takstmann.spesialitet}</p>}
            {b.takstmann.telefon && <p className="text-sm text-[#475569] mt-1">{b.takstmann.telefon}</p>}
            {b.takstmann.epost && <p className="text-sm text-[#475569]">{b.takstmann.epost}</p>}
          </div>
        )}

        {/* Tilbudsdetaljer */}
        {(b.tilbudspris || b.estimert_leveringstid) && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Tilbud</p>
            {b.tilbudspris && (
              <p className="text-2xl font-bold text-[#1e293b]">{b.tilbudspris.toLocaleString("nb-NO")} kr</p>
            )}
            {b.estimert_leveringstid && (
              <p className="text-sm text-[#475569] mt-1">Leveringstid: {b.estimert_leveringstid}</p>
            )}
            {tilbudFristUtloper && erTilbud && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Frist: {tilbudFristUtloper.toLocaleDateString("nb-NO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}
      </div>

      {b.adresse && (
        <div className="flex items-center gap-1.5 mb-3 text-sm text-[#374151]">
          <svg className="w-4 h-4 text-[#94a3b8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {b.adresse}
        </div>
      )}

      {/* Praktisk info (etter aksept) */}
      {b.status === "akseptert" && b.befaringsdato && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4 text-sm space-y-1">
          <p className="font-semibold text-green-800 mb-1">Din booking er registrert</p>
          <p className="text-green-700">Befaringsdato: <strong>{new Date(b.befaringsdato).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}</strong></p>
          <p className="text-green-600 text-xs mt-1">Takstmannen bekrefter snart oppdraget.</p>
        </div>
      )}

      {b.status === "bekreftet" && b.befaringsdato && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-sm space-y-1">
          <p className="font-semibold text-green-800 mb-1">Oppdrag bekreftet</p>
          <p className="text-green-700">Befaringsdato: <strong>{new Date(b.befaringsdato).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}</strong></p>
          <p className="text-green-600 text-xs mt-1">Takstmannen tar kontakt nærmere tidspunktet.</p>
        </div>
      )}

      {/* Tilbudsknapper */}
      {erTilbud && (
        <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
          <TilbudKnapper bestillingId={b.id} />
        </div>
      )}

      {b.status === "forespørsel" && (
        <p className="text-sm text-[#64748b] mt-2 italic">Venter på tilbud fra takstmannen...</p>
      )}
    </div>
  );
}

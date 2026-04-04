import { createClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS, OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus, OppdragType } from "@/lib/supabase/types";
import AksepterAvvisKnapp from "./AksepterAvvisKnapp";
import SendTilbudSkjema from "./SendTilbudSkjema";
import BekreftKnapp from "./BekreftKnapp";

const STATUS_BADGE: Record<string, string> = {
  ny: "portal-badge portal-badge-blue",
  forespørsel: "portal-badge portal-badge-blue",
  tilbud_sendt: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  avvist: "portal-badge portal-badge-red",
  avslått: "portal-badge portal-badge-red",
  utløpt: "portal-badge portal-badge-gray",
  bekreftet: "portal-badge portal-badge-green",
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

  const foresporsler = (bestillinger ?? []).filter((b) => b.status === "forespørsel");
  const tilSvar = (bestillinger ?? []).filter((b) => b.status === "tilbud_sendt");
  const aksepterte = (bestillinger ?? []).filter((b) => b.status === "akseptert");
  const nyeMegler = (bestillinger ?? []).filter((b) => b.status === "ny");
  const historikk = (bestillinger ?? []).filter((b) =>
    ["avvist", "avslått", "utløpt", "bekreftet", "kansellert", "fullfort"].includes(b.status)
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Innkommende bestillinger</h1>
        <p className="text-[#64748b] text-sm mt-0.5">
          Forespørsler fra meglere og privatkunder
        </p>
      </div>

      {!bestillinger || bestillinger.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <svg className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-[#64748b] mb-2">Ingen bestillinger ennå</p>
          <p className="text-[#94a3b8] text-sm">Aktiver synlighet i fylker for å motta bestillinger</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Privatkundeforespørsler – krever tilbud */}
          {foresporsler.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#285982] uppercase tracking-wide mb-3">
                Forespørsler fra privatkunder ({foresporsler.length})
              </h2>
              <div className="space-y-4">
                {foresporsler.map((b) => (
                  <BestillingKort key={b.id} b={b} visning="forespørsel" />
                ))}
              </div>
            </section>
          )}

          {/* Tilbud sendt – venter på kundens svar */}
          {tilSvar.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3">
                Venter på kundens svar ({tilSvar.length})
              </h2>
              <div className="space-y-4">
                {tilSvar.map((b) => (
                  <BestillingKort key={b.id} b={b} visning="tilbud_sendt" />
                ))}
              </div>
            </section>
          )}

          {/* Akseptert – klar til bekreftelse */}
          {aksepterte.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-3">
                Akseptert – klar til bekreftelse ({aksepterte.length})
              </h2>
              <div className="space-y-4">
                {aksepterte.map((b) => (
                  <BestillingKort key={b.id} b={b} visning="akseptert" />
                ))}
              </div>
            </section>
          )}

          {/* Nye megler-bestillinger */}
          {nyeMegler.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#285982] uppercase tracking-wide mb-3">
                Nye fra megler ({nyeMegler.length})
              </h2>
              <div className="space-y-4">
                {nyeMegler.map((b) => (
                  <BestillingKort key={b.id} b={b} visning="ny" />
                ))}
              </div>
            </section>
          )}

          {/* Historikk */}
          {historikk.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#64748b] uppercase tracking-wide mb-3">
                Historikk ({historikk.length})
              </h2>
              <div className="space-y-3">
                {historikk.map((b) => (
                  <BestillingKort key={b.id} b={b} visning="historikk" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

interface BestillingKortData {
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
  megler?: { id: string; navn: string; meglerforetak: string | null; telefon: string | null; epost: string | null } | null;
  kunde?: { id: string; navn: string; telefon: string | null; epost: string | null } | null;
}

function BestillingKort({ b, visning }: { b: BestillingKortData; visning: string }) {
  const avsender = b.megler || b.kunde;
  const typeLabel = b.oppdrag_type
    ? OPPDRAG_TYPE_LABELS[b.oppdrag_type as OppdragType] ?? b.oppdrag_type
    : null;

  const tilbudFristUtloper = b.tilbud_sendt_at
    ? new Date(new Date(b.tilbud_sendt_at).getTime() + 48 * 60 * 60 * 1000)
    : null;

  return (
    <div className={`portal-card p-6 ${["forespørsel", "ny"].includes(b.status) ? "border-l-4 border-l-[#285982]" : b.status === "akseptert" ? "border-l-4 border-l-green-500" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={STATUS_BADGE[b.status] ?? "portal-badge portal-badge-gray"}>
              {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
            </span>
            {typeLabel && (
              <span className="text-xs bg-[#e8f0f8] text-[#285982] px-2 py-0.5 rounded-full font-medium">{typeLabel}</span>
            )}
            {b.megler && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Megler</span>}
            {b.kunde && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Privatkunde</span>}
            <span className="text-xs text-[#94a3b8]">
              {new Date(b.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {avsender && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-[#1e293b]">{avsender.navn}</p>
              {b.megler?.meglerforetak && <p className="text-xs text-[#64748b]">{b.megler.meglerforetak}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {avsender.telefon && <p className="text-xs text-[#64748b]">{avsender.telefon}</p>}
                {avsender.epost && <p className="text-xs text-[#64748b]">{avsender.epost}</p>}
              </div>
            </div>
          )}

          {b.adresse && (
            <div className="flex items-center gap-1.5 mb-3 text-sm text-[#374151]">
              <svg className="w-4 h-4 text-[#94a3b8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {b.adresse}
            </div>
          )}

          {b.melding && (
            <div className="bg-[#f8fafc] rounded-lg p-3 text-sm text-[#374151] mb-3">{b.melding}</div>
          )}

          {/* Tilbudsinformasjon */}
          {(b.tilbudspris || b.estimert_leveringstid) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 text-sm">
              <p className="font-semibold text-blue-800 mb-1">Ditt tilbud</p>
              {b.tilbudspris && <p className="text-blue-700">Pris: <strong>{b.tilbudspris.toLocaleString("nb-NO")} kr</strong></p>}
              {b.estimert_leveringstid && <p className="text-blue-700">Leveringstid: {b.estimert_leveringstid}</p>}
              {tilbudFristUtloper && (
                <p className="text-xs text-blue-500 mt-1">Frist: {tilbudFristUtloper.toLocaleDateString("nb-NO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
              )}
            </div>
          )}

          {/* Praktisk info fra kunde (etter aksept) */}
          {b.status === "akseptert" && (b.befaringsdato || b.noekkelinfo || b.parkering || b.tilgang) && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3 text-sm space-y-1">
              <p className="font-semibold text-green-800 mb-1">Praktisk info fra kunden</p>
              {b.befaringsdato && <p className="text-green-700">Befaringsdato: <strong>{new Date(b.befaringsdato).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}</strong></p>}
              {b.noekkelinfo && <p className="text-green-700">Nøkkelinfo: {b.noekkelinfo}</p>}
              {b.parkering && <p className="text-green-700">Parkering: {b.parkering}</p>}
              {b.tilgang && <p className="text-green-700">Tilgang: {b.tilgang}</p>}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-2 items-end">
          {visning === "forespørsel" && (
            <SendTilbudSkjema bestillingId={b.id} />
          )}
          {visning === "ny" && (
            <AksepterAvvisKnapp bestillingId={b.id} />
          )}
          {visning === "akseptert" && (
            <BekreftKnapp bestillingId={b.id} />
          )}
        </div>
      </div>
    </div>
  );
}

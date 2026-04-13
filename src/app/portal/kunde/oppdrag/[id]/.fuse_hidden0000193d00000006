import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS, OPPDRAG_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus, DokumentType, OppdragStatus } from "@/lib/supabase/types";
import VurderingSkjema from "@/components/portal/VurderingSkjema";
import DokumentListe from "@/components/portal/DokumentListe";

interface Props {
  params: Promise<{ id: string }>;
}

const STEG = [
  { label: "Bestilling sendt", statuser: ["ny"] as BestillingStatus[] },
  { label: "Akseptert", statuser: ["akseptert"] as BestillingStatus[] },
  { label: "Under arbeid", statuser: [] as BestillingStatus[] },
  { label: "Fullført", statuser: ["fullfort"] as BestillingStatus[] },
];

export default async function KundeOppdragDetaljPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceSupabase = await createServiceClient();

  const { data: raw } = await serviceSupabase
    .from("bestillinger")
    .select(`
      *,
      takstmann:takstmann_profiler(id, navn, spesialitet, telefon, epost, bilde_url),
      oppdrag(*, dokumenter(*))
    `)
    .eq("id", id)
    .single();
  const bestilling = raw as unknown as {
    id: string;
    status: string;
    melding: string | null;
    oppdrag_id: string | null;
    created_at: string;
    takstmann: { id: string; navn: string; spesialitet: string | null; telefon: string | null; epost: string | null; bilde_url: string | null } | null;
    oppdrag: { id: string; tittel: string; status: string; adresse: string | null; by: string | null; dokumenter: { id: string; navn: string; er_rapport: boolean; dokument_type: DokumentType; storrelse: number | null; storage_path: string; created_at: string }[] } | null;
  } | null;

  if (!bestilling) notFound();

  const status = bestilling.status as BestillingStatus;

  // Sjekk om kunden allerede har gitt vurdering
  let harVurdert = false;
  if (status === "fullfort" && bestilling.takstmann) {
    const { data: eksisterende } = await serviceSupabase
      .from("megler_vurderinger")
      .select("id")
      .eq("takstmann_id", bestilling.takstmann.id)
      .eq("oppdrag_id", id)
      .maybeSingle();
    harVurdert = !!eksisterende;
  }

  const aktivtSteg = (() => {
    if (status === "fullfort") return 3;
    if (status === "akseptert") return 1;
    return 0;
  })();

  // Finn oppdragssteg basert på oppdrag.status
  const oppdragStatus = bestilling.oppdrag?.status as OppdragStatus | undefined;
  const underArbeid = oppdragStatus && ["under_befaring", "rapport_under_arbeid"].includes(oppdragStatus);
  const aktivtStegJustert = underArbeid ? 2 : aktivtSteg;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/portal/kunde/oppdrag" className="text-[#64748b] hover:text-[#285982] transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#1e293b]">Oppdragsdetaljer</h1>
      </div>

      {/* Fremdriftstrapp */}
      <div className="portal-card p-6 mb-6">
        <h2 className="text-[#1e293b] font-semibold mb-6">Fremdrift</h2>
        <div className="flex items-center">
          {STEG.map((steg, i) => (
            <div key={steg.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  i <= aktivtStegJustert
                    ? "bg-[#285982] text-white"
                    : "bg-[#e2e8f0] text-[#94a3b8]"
                }`}>
                  {i < aktivtStegJustert ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs font-medium text-center whitespace-nowrap ${
                  i <= aktivtStegJustert ? "text-[#285982]" : "text-[#94a3b8]"
                }`}>
                  {steg.label}
                </span>
              </div>
              {i < STEG.length - 1 && (
                <div className={`flex-1 h-0.5 mb-6 mx-2 ${i < aktivtStegJustert ? "bg-[#285982]" : "bg-[#e2e8f0]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Takstmann */}
      <div className="portal-card p-6 mb-6">
        <h2 className="text-[#1e293b] font-semibold mb-4">Din takstmann</h2>
        {bestilling.takstmann ? (
          <div className="flex gap-4 items-start">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e2e8f0] shrink-0 relative bg-[#f0f4f8]">
              {bestilling.takstmann.bilde_url ? (
                <Image src={bestilling.takstmann.bilde_url} alt={bestilling.takstmann.navn} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#285982] font-bold text-xl">
                  {bestilling.takstmann.navn.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-[#1e293b] font-semibold">{bestilling.takstmann.navn}</p>
              {bestilling.takstmann.spesialitet && (
                <p className="text-[#64748b] text-sm">{bestilling.takstmann.spesialitet}</p>
              )}
              {status === "akseptert" || status === "fullfort" ? (
                <>
                  {bestilling.takstmann.telefon && (
                    <a href={`tel:${bestilling.takstmann.telefon}`} className="text-[#285982] text-sm block hover:underline">
                      {bestilling.takstmann.telefon}
                    </a>
                  )}
                  {bestilling.takstmann.epost && (
                    <a href={`mailto:${bestilling.takstmann.epost}`} className="text-[#285982] text-sm block hover:underline">
                      {bestilling.takstmann.epost}
                    </a>
                  )}
                </>
              ) : (
                <p className="text-[#94a3b8] text-xs mt-1">Kontaktinfo vises etter aksept</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[#94a3b8]">Ingen takstmann tilknyttet</p>
        )}
      </div>

      {/* Oppdrag og dokumenter */}
      {bestilling.oppdrag && (
        <div className="portal-card p-6 mb-6">
          <h2 className="text-[#1e293b] font-semibold mb-4">Oppdragsstatus</h2>
          <div className="space-y-2 text-sm mb-4">
            <p className="font-medium text-[#1e293b]">{bestilling.oppdrag.tittel}</p>
            <span className="portal-badge portal-badge-blue">
              {OPPDRAG_STATUS_LABELS[bestilling.oppdrag.status as OppdragStatus] ?? bestilling.oppdrag.status}
            </span>
          </div>

          {bestilling.oppdrag.dokumenter && bestilling.oppdrag.dokumenter.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
              <p className="text-sm font-semibold text-[#1e293b] mb-3">Dokumenter</p>
              <DokumentListe dokumenter={bestilling.oppdrag.dokumenter} />
            </div>
          )}
        </div>
      )}

      {/* Vurdering */}
      {status === "fullfort" && bestilling.takstmann && !harVurdert && (
        <div className="mb-6">
          <VurderingSkjema
            takstmannId={bestilling.takstmann.id}
            bestillingId={id}
            takstmannNavn={bestilling.takstmann.navn}
          />
        </div>
      )}

      {status === "fullfort" && harVurdert && (
        <div className="portal-card p-5 mb-6 bg-green-50 border-green-200">
          <p className="text-green-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Du har gitt vurdering for dette oppdraget. Takk!
          </p>
        </div>
      )}

      <div className="portal-card p-5 bg-[#f0f7ff] border-[#285982]/20">
        <p className="text-sm text-[#64748b]">
          <strong className="text-[#285982]">Status:</strong>{" "}
          {BESTILLING_STATUS_LABELS[status] ?? status}
          {" · "}
          Opprettet {new Date(bestilling.created_at).toLocaleDateString("nb-NO")}
        </p>
      </div>
    </div>
  );
}
                                                                                           
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { BESTILLING_STATUS_LABELS, OPPDRAG_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus, DokumentType, OppdragStatus } from "@/lib/supabase/types";
import VurderingSkjema from "./VurderingSkjema";
import DokumentListe from "@/components/portal/DokumentListe";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MeglerBestillingDetaljPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("bestillinger")
    .select(`
      *,
      takstmann:takstmann_profiler(id, navn, spesialitet, telefon, epost, bilde_url, sertifiseringer),
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
    takstmann: { id: string; navn: string; spesialitet: string | null; telefon: string | null; epost: string | null; bilde_url: string | null; sertifiseringer: string[] | null } | null;
    oppdrag: { id: string; tittel: string; status: string; adresse: string | null; by: string | null; dokumenter: { id: string; navn: string; er_rapport: boolean; dokument_type: DokumentType; storrelse: number | null; storage_path: string; created_at: string }[] } | null;
  } | null;

  if (!bestilling) notFound();

  // Hent megler-profil for vurdering
  const { data: { user } } = await supabase.auth.getUser();
  const { data: meglerProfil } = user
    ? await supabase.from("megler_profiler").select("id").eq("user_id", user.id).single()
    : { data: null };

  // Sjekk om vurdering allerede er gitt
  const { data: eksisterendeVurdering } = bestilling.takstmann
    ? await supabase
        .from("megler_vurderinger")
        .select("karakter, kommentar")
        .eq("takstmann_id", bestilling.takstmann.id)
        .eq("megler_id", meglerProfil?.id ?? "")
        .eq("oppdrag_id", bestilling.oppdrag_id ?? "")
        .single()
    : { data: null };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/portal/megler/bestillinger" className="text-[#64748b] hover:text-[#285982] transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#1e293b]">Bestillingsdetaljer</h1>
      </div>

      <div className="space-y-6">
        {/* Takstmann */}
        <div className="portal-card p-6">
          <h2 className="text-[#1e293b] font-semibold mb-4">Takstmann</h2>
          <div className="flex gap-4 items-start">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e2e8f0] shrink-0 relative bg-[#f0f4f8]">
              {bestilling.takstmann?.bilde_url ? (
                <Image src={bestilling.takstmann.bilde_url} alt={bestilling.takstmann.navn} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#285982] font-bold text-xl">
                  {bestilling.takstmann?.navn?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[#1e293b] font-semibold">{bestilling.takstmann?.navn}</p>
              {bestilling.takstmann?.spesialitet && (
                <p className="text-[#64748b] text-sm">{bestilling.takstmann.spesialitet}</p>
              )}
              {bestilling.takstmann?.telefon && (
                <p className="text-[#64748b] text-sm">{bestilling.takstmann.telefon}</p>
              )}
              {bestilling.takstmann?.epost && (
                <p className="text-[#64748b] text-sm">{bestilling.takstmann.epost}</p>
              )}
            </div>
            <span className={`${
              ({
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
              } as Partial<Record<BestillingStatus, string>>)[bestilling.status as BestillingStatus] ?? "portal-badge portal-badge-gray"
            }`}>
              {BESTILLING_STATUS_LABELS[bestilling.status as BestillingStatus] ?? bestilling.status}
            </span>
          </div>
        </div>

        {/* Oppdrag */}
        {bestilling.oppdrag && (
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">Tilknyttet oppdrag</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-[#1e293b]">{bestilling.oppdrag.tittel}</p>
              {bestilling.oppdrag.adresse && (
                <p className="text-[#64748b]">{bestilling.oppdrag.adresse}, {bestilling.oppdrag.by}</p>
              )}
              <span className="portal-badge portal-badge-blue">
                {OPPDRAG_STATUS_LABELS[bestilling.oppdrag.status as OppdragStatus] ?? bestilling.oppdrag.status}
              </span>
            </div>
          </div>
        )}

        {/* Dokumenter */}
        {bestilling.oppdrag?.dokumenter && bestilling.oppdrag.dokumenter.length > 0 && (
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">Dokumenter</h2>
            <DokumentListe dokumenter={bestilling.oppdrag.dokumenter} />
          </div>
        )}

        {/* Din melding */}
        {bestilling.melding && (
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-3">Din bestillingsmelding</h2>
            <p className="text-[#64748b] text-sm">{bestilling.melding}</p>
          </div>
        )}

        {/* Vurdering */}
        {bestilling.status === "fullfort" && meglerProfil && bestilling.takstmann && (
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">
              {eksisterendeVurdering ? "Din vurdering" : "Gi vurdering"}
            </h2>
            {eksisterendeVurdering ? (
              <div>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-5 h-5 ${s <= (eksisterendeVurdering.karakter ?? 0) ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {eksisterendeVurdering.kommentar && (
                  <p className="text-[#64748b] text-sm">{eksisterendeVurdering.kommentar}</p>
                )}
              </div>
            ) : (
              <VurderingSkjema
                takstmannId={bestilling.takstmann.id}
                bestillingId={bestilling.id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

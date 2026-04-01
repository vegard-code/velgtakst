import { notFound } from "next/navigation";
import Link from "next/link";
import { hentOppdragDetaljer, oppdaterOppdragStatus } from "@/lib/actions/oppdrag";
import {
  OPPDRAG_STATUS_LABELS,
  OPPDRAG_TYPE_LABELS,
} from "@/lib/supabase/types";
import type { Dokument, OppdragStatus } from "@/lib/supabase/types";
import StatusEndreKnapp from "./StatusEndreKnapp";
import DokumentOpplaster from "./DokumentOpplaster";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

const NESTE_STATUS: Record<OppdragStatus, OppdragStatus | null> = {
  ny: "akseptert",
  akseptert: "under_befaring",
  under_befaring: "rapport_under_arbeid",
  rapport_under_arbeid: "rapport_levert",
  rapport_levert: "fakturert",
  fakturert: "betalt",
  betalt: null,
  kansellert: null,
};

const STATUS_FARGE: Record<OppdragStatus, string> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  under_befaring: "portal-badge portal-badge-yellow",
  rapport_under_arbeid: "portal-badge portal-badge-purple",
  rapport_levert: "portal-badge portal-badge-green",
  fakturert: "portal-badge portal-badge-yellow",
  betalt: "portal-badge portal-badge-green",
  kansellert: "portal-badge portal-badge-gray",
};

export default async function OppdragDetaljPage({ params }: Props) {
  const { id } = await params;
  const oppdrag = await hentOppdragDetaljer(id);
  if (!oppdrag) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const innloggetBrukerId = user?.id ?? "";

  const status = oppdrag.status as OppdragStatus;
  const nesteStatus = NESTE_STATUS[status];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link
          href="/portal/takstmann/oppdrag"
          className="mt-1 text-[#64748b] hover:text-[#285982] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1e293b]">{oppdrag.tittel}</h1>
            <span className={STATUS_FARGE[status] ?? "portal-badge portal-badge-gray"}>
              {OPPDRAG_STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="text-[#64748b] text-sm mt-1">
            {OPPDRAG_TYPE_LABELS[oppdrag.oppdrag_type as keyof typeof OPPDRAG_TYPE_LABELS] ?? oppdrag.oppdrag_type}
            {oppdrag.by && ` · ${oppdrag.adresse}, ${oppdrag.by}`}
          </p>
        </div>
        {nesteStatus && (
          <StatusEndreKnapp
            oppdragId={id}
            nesteStatus={nesteStatus}
            nesteStatusLabel={OPPDRAG_STATUS_LABELS[nesteStatus]}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venstre kolonne */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kundeinfo */}
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">Kundeinformasjon</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {oppdrag.megler && (
                <div>
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Megler</p>
                  <p className="text-sm font-medium text-[#1e293b]">{oppdrag.megler.navn}</p>
                  {oppdrag.megler.meglerforetak && (
                    <p className="text-xs text-[#64748b]">{oppdrag.megler.meglerforetak}</p>
                  )}
                  {oppdrag.megler.telefon && (
                    <p className="text-xs text-[#64748b] mt-1">{oppdrag.megler.telefon}</p>
                  )}
                </div>
              )}
              {oppdrag.privatkunde && (
                <div>
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Kunde</p>
                  <p className="text-sm font-medium text-[#1e293b]">{oppdrag.privatkunde.navn}</p>
                  {oppdrag.privatkunde.telefon && (
                    <p className="text-xs text-[#64748b]">{oppdrag.privatkunde.telefon}</p>
                  )}
                </div>
              )}
              {!oppdrag.megler && !oppdrag.privatkunde && (
                <p className="text-[#94a3b8] text-sm col-span-2">Ingen kundeinformasjon registrert</p>
              )}
            </div>
          </div>

          {/* Oppdragsdetaljer */}
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">Detaljer</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide mb-1">Adresse</p>
                <p className="text-[#1e293b]">
                  {oppdrag.adresse ? (
                    <>
                      {oppdrag.adresse}
                      {oppdrag.postnr && `, ${oppdrag.postnr}`}
                      {oppdrag.by && ` ${oppdrag.by}`}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide mb-1">Pris</p>
                <p className="text-[#1e293b] font-medium">
                  {oppdrag.pris ? `${oppdrag.pris.toLocaleString("nb-NO")} kr` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide mb-1">Befaringsdato</p>
                <p className="text-[#1e293b]">
                  {oppdrag.befaringsdato
                    ? new Date(oppdrag.befaringsdato).toLocaleString("nb-NO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide mb-1">Frist</p>
                <p className="text-[#1e293b]">
                  {oppdrag.frist
                    ? new Date(oppdrag.frist).toLocaleDateString("nb-NO")
                    : "—"}
                </p>
              </div>
            </div>
            {oppdrag.beskrivelse && (
              <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide mb-1">Beskrivelse</p>
                <p className="text-[#1e293b] text-sm whitespace-pre-wrap">{oppdrag.beskrivelse}</p>
              </div>
            )}
          </div>

          {/* Dokumenter */}
          <div className="portal-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#1e293b] font-semibold">Dokumenter</h2>
            </div>
            <DokumentOpplaster
              oppdragId={id}
              initialDokumenter={(oppdrag.dokumenter ?? []) as Dokument[]}
              innloggetBrukerId={innloggetBrukerId}
            />
          </div>
        </div>

        {/* Høyre kolonne – Tidslinje */}
        <div className="space-y-6">
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">Tidslinje</h2>
            {oppdrag.status_logg && oppdrag.status_logg.length > 0 ? (
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[#e2e8f0]" />
                <div className="space-y-4">
                  {[...oppdrag.status_logg].reverse().map((logg) => (
                    <div key={logg.id} className="relative">
                      <div className="absolute -left-3.5 mt-1 w-3 h-3 rounded-full bg-[#285982] border-2 border-white" />
                      <div className="pl-2">
                        <p className="text-xs font-semibold text-[#1e293b]">
                          {OPPDRAG_STATUS_LABELS[logg.til_status as OppdragStatus] ?? logg.til_status}
                        </p>
                        {logg.notat && (
                          <p className="text-xs text-[#64748b] mt-0.5">{logg.notat}</p>
                        )}
                        <p className="text-[10px] text-[#94a3b8] mt-1">
                          {new Date(logg.created_at).toLocaleString("nb-NO", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[#94a3b8] text-sm">Ingen hendelser ennå</p>
            )}
          </div>

          {/* Hurtighandlinger */}
          <div className="portal-card p-6">
            <h2 className="text-[#1e293b] font-semibold mb-4">Handlinger</h2>
            <div className="space-y-2">
              <Link
                href={`/portal/takstmann/oppdrag/${id}/rediger`}
                className="w-full flex items-center gap-2 text-sm text-[#285982] hover:bg-[#f0f4f8] px-3 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rediger oppdrag
              </Link>
              {(status === "rapport_levert" || status === "fakturert") && (
                <Link
                  href={`/portal/takstmann/oppdrag/${id}/faktura`}
                  className="w-full flex items-center gap-2 text-sm text-[#285982] hover:bg-[#f0f4f8] px-3 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                  Send faktura
                </Link>
              )}
              {status === "fakturert" && (
                <Link
                  href={`/portal/takstmann/oppdrag/${id}/purring`}
                  className="w-full flex items-center gap-2 text-sm text-amber-600 hover:bg-amber-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Send purring
                </Link>
              )}
              {status !== "kansellert" && status !== "betalt" && (
                <form
                  action={async () => {
                    "use server";
                    await oppdaterOppdragStatus(id, "kansellert", "Kansellert manuelt");
                  }}
                >
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Kanseller oppdrag
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

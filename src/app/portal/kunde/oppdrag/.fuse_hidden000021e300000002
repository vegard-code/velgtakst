import Link from "next/link";
import Image from "next/image";
import { hentMinebestillinger } from "@/lib/actions/bestillinger";
import type { BestillingMedInfo } from "@/lib/actions/bestillinger";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus } from "@/lib/supabase/types";

const STATUS_BADGE: Partial<Record<BestillingStatus, string>> = {
  ny: "portal-badge portal-badge-blue",
  forespørsel: "portal-badge portal-badge-blue",
  tilbud_sendt: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  bekreftet: "portal-badge portal-badge-green",
  avvist: "portal-badge portal-badge-red",
  avslått: "portal-badge portal-badge-red",
  kansellert: "portal-badge portal-badge-gray",
  fullfort: "portal-badge portal-badge-green",
};

export default async function KundeOppdragPage() {
  const bestillinger = await hentMinebestillinger("kunde");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1e293b] mb-6">Mine oppdrag</h1>

      {bestillinger.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <p className="text-[#94a3b8] mb-4">Ingen oppdrag ennå</p>
          <Link href="/portal/kunde/finn-takstmann" className="portal-btn-primary">
            Finn takstmann
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bestillinger.map((b: BestillingMedInfo) => {
            const oppdragStatus = (b.oppdrag as any)?.status as string | undefined;
            const rapportKlar = oppdragStatus && ["rapport_levert", "fakturert", "betalt"].includes(oppdragStatus);
            return (
              <Link key={b.id} href={`/portal/kunde/oppdrag/${b.id}`} className="block">
                <div className={`portal-card portal-card-hover p-5 ${rapportKlar ? "border-l-4 border-l-green-500" : ""}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[#e2e8f0] shrink-0 relative bg-[#f0f4f8]">
                      {b.takstmann?.bilde_url ? (
                        <Image src={b.takstmann.bilde_url} alt={b.takstmann.navn} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#285982] font-bold">
                          {b.takstmann?.navn?.charAt(0) ?? "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1e293b]">{b.takstmann?.navn ?? "Takstmann"}</p>
                      <p className="text-xs text-[#64748b]">
                        {b.takstmann?.spesialitet ?? ""}
                        {" · "}
                        {new Date(b.created_at).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={STATUS_BADGE[b.status as BestillingStatus] ?? "portal-badge portal-badge-gray"}>
                        {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                      </span>
                      {rapportKlar && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Rapport klar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

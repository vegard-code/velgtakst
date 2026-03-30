import Link from "next/link";
import { hentMinebestillinger } from "@/lib/actions/bestillinger";
import type { BestillingMedInfo } from "@/lib/actions/bestillinger";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus } from "@/lib/supabase/types";

const FREMGANG_STEG = [
  { status: ["ny"], label: "Bestilling sendt" },
  { status: ["akseptert"], label: "Akseptert" },
  { status: ["fullfort"], label: "Fullført" },
];

const STATUS_BADGE: Record<BestillingStatus, string> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  avvist: "portal-badge portal-badge-red",
  kansellert: "portal-badge portal-badge-gray",
  fullfort: "portal-badge portal-badge-green",
};

function aktivtSteg(status: BestillingStatus): number {
  if (status === "ny") return 0;
  if (status === "akseptert") return 1;
  if (status === "fullfort") return 2;
  return 0;
}

export default async function KundeDashboard() {
  const bestillinger = await hentMinebestillinger("kunde");
  const aktiveBestillinger = bestillinger.filter((b) => b.status !== "kansellert" && b.status !== "avvist");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Min side</h1>
          <p className="text-[#64748b] text-sm mt-0.5">Oversikt over dine takstbestillinger</p>
        </div>
        <Link href="/portal/kunde/finn-takstmann" className="portal-btn-primary">
          + Bestill takst
        </Link>
      </div>

      {aktiveBestillinger.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0f4f8] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <p className="text-[#64748b] mb-2 font-medium">Ingen aktive bestillinger</p>
          <p className="text-[#94a3b8] text-sm mb-6">
            Finn en takstmann og bestill din første takst i dag.
          </p>
          <Link href="/portal/kunde/finn-takstmann" className="portal-btn-primary">
            Finn takstmann
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {aktiveBestillinger.map((b: BestillingMedInfo) => {
            const stegIndex = aktivtSteg(b.status as BestillingStatus);
            return (
              <Link key={b.id} href={`/portal/kunde/oppdrag/${b.id}`} className="block">
                <div className="portal-card portal-card-hover p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[#1e293b] font-semibold">
                        {b.takstmann?.navn ?? "Takstmann"}
                      </p>
                      {b.takstmann?.spesialitet && (
                        <p className="text-[#64748b] text-sm">{b.takstmann.spesialitet}</p>
                      )}
                    </div>
                    <span className={STATUS_BADGE[b.status as BestillingStatus] ?? "portal-badge portal-badge-gray"}>
                      {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                    </span>
                  </div>

                  {/* Fremdriftstrapp */}
                  <div className="flex items-center gap-0">
                    {FREMGANG_STEG.map((steg, i) => (
                      <div key={steg.label} className="flex items-center flex-1">
                        <div className={`flex items-center gap-2 ${i < FREMGANG_STEG.length ? "flex-1" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            i <= stegIndex ? "bg-[#285982] text-white" : "bg-[#e2e8f0] text-[#94a3b8]"
                          }`}>
                            {i < stegIndex ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className={`text-xs hidden sm:block ${i <= stegIndex ? "text-[#285982] font-medium" : "text-[#94a3b8]"}`}>
                            {steg.label}
                          </span>
                        </div>
                        {i < FREMGANG_STEG.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 ${i < stegIndex ? "bg-[#285982]" : "bg-[#e2e8f0]"}`} />
                        )}
                      </div>
                    ))}
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

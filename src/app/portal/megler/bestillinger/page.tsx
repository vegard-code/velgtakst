import Link from "next/link";
import Image from "next/image";
import { hentMinebestillinger } from "@/lib/actions/bestillinger";
import type { BestillingMedInfo } from "@/lib/actions/bestillinger";
import { BESTILLING_STATUS_LABELS } from "@/lib/supabase/types";
import type { BestillingStatus } from "@/lib/supabase/types";

const STATUS_BADGE: Partial<Record<BestillingStatus, string>> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  avvist: "portal-badge portal-badge-red",
  kansellert: "portal-badge portal-badge-gray",
  fullfort: "portal-badge portal-badge-green",
};

export default async function MeglerBestillingerPage() {
  const bestillinger = await hentMinebestillinger("megler");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Mine bestillinger</h1>
        <p className="text-[#64748b] text-sm mt-0.5">{bestillinger.length} bestillinger totalt</p>
      </div>

      {bestillinger.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <p className="text-[#94a3b8] mb-4">Ingen bestillinger ennå</p>
          <Link href="/portal/megler/finn-takstmann" className="portal-btn-primary">
            Finn takstmann
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bestillinger.map((b: BestillingMedInfo) => (
            <Link key={b.id} href={`/portal/megler/bestillinger/${b.id}`} className="block">
              <div className="portal-card portal-card-hover p-5">
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
                    <p className="text-sm font-semibold text-[#1e293b]">
                      {b.takstmann?.navn ?? "Ukjent takstmann"}
                    </p>
                    <p className="text-xs text-[#64748b]">{b.takstmann?.spesialitet ?? ""}</p>
                    {b.melding && (
                      <p className="text-xs text-[#94a3b8] truncate mt-0.5">{b.melding}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={STATUS_BADGE[b.status as BestillingStatus] ?? "portal-badge portal-badge-gray"}>
                      {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                    </span>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      {new Date(b.created_at).toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

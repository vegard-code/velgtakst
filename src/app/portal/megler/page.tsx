import Link from "next/link";
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

export default async function MeglerDashboard() {
  const bestillinger = await hentMinebestillinger("megler");

  const nyeBestillinger = bestillinger.filter((b) => b.status === "ny").length;
  const underArbeidBestillinger = bestillinger.filter((b) => b.status === "akseptert").length;
  const fullforteBestillinger = bestillinger.filter((b) => b.status === "fullfort").length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Dashboard</h1>
          <p className="text-[#64748b] text-sm mt-0.5">Oversikt over dine takstbestillinger</p>
        </div>
        <Link href="/portal/megler/finn-takstmann" className="portal-btn-primary">
          + Bestill takstmann
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Nye forespørsler", verdi: nyeBestillinger, farge: "text-[#285982]" },
          { label: "Under arbeid", verdi: underArbeidBestillinger, farge: "text-amber-600" },
          { label: "Fullført", verdi: fullforteBestillinger, farge: "text-green-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="portal-card p-5">
            <p className={`text-3xl font-bold ${kpi.farge}`}>{kpi.verdi}</p>
            <p className="text-[#64748b] text-sm mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Siste bestillinger */}
      <div className="portal-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#1e293b] font-semibold">Siste bestillinger</h2>
          <Link href="/portal/megler/bestillinger" className="text-[#285982] text-sm hover:underline">
            Se alle
          </Link>
        </div>

        {bestillinger.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#94a3b8] mb-4">Ingen bestillinger ennå</p>
            <Link href="/portal/megler/finn-takstmann" className="portal-btn-primary text-sm">
              Finn takstmann
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bestillinger.slice(0, 6).map((b: BestillingMedInfo) => (
              <Link
                key={b.id}
                href={`/portal/megler/bestillinger/${b.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1e293b] group-hover:text-[#285982] transition-colors">
                    {b.takstmann?.navn ?? "Ukjent takstmann"}
                  </p>
                  <p className="text-xs text-[#94a3b8]">
                    {b.takstmann?.spesialitet ?? ""}
                    {" · "}
                    {new Date(b.created_at).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <span className={STATUS_BADGE[b.status as BestillingStatus] ?? "portal-badge portal-badge-gray"}>
                  {BESTILLING_STATUS_LABELS[b.status as BestillingStatus] ?? b.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

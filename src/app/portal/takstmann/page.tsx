import Link from "next/link";
import { hentDashboardStats } from "@/lib/actions/oppdrag";
import { OPPDRAG_STATUS_LABELS, OPPDRAG_TYPE_LABELS } from "@/lib/supabase/types";
import type { OppdragStatus } from "@/lib/supabase/types";

const STATUS_BADGE_CLASSES: Record<OppdragStatus, string> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  under_befaring: "portal-badge portal-badge-yellow",
  rapport_under_arbeid: "portal-badge portal-badge-purple",
  rapport_levert: "portal-badge portal-badge-green",
  fakturert: "portal-badge portal-badge-yellow",
  betalt: "portal-badge portal-badge-green",
  kansellert: "portal-badge portal-badge-gray",
};

const DONUT_COLORS: Record<string, string> = {
  ny: "#3b82f6",
  akseptert: "#22c55e",
  under_befaring: "#f59e0b",
  rapport_under_arbeid: "#8b5cf6",
  rapport_levert: "#10b981",
  fakturert: "#f97316",
  betalt: "#14b8a6",
};

export default async function TakstmannDashboard() {
  const stats = await hentDashboardStats();

  const kpiKort = [
    {
      label: "Totalt aktive oppdrag",
      verdi: stats?.totalOppdrag ?? 0,
      farge: "text-[#285982]",
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Nye oppdrag",
      verdi: stats?.statusMap?.ny ?? 0,
      farge: "text-blue-600",
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Under befaring",
      verdi: stats?.statusMap?.under_befaring ?? 0,
      farge: "text-amber-600",
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Fakturert",
      verdi: stats?.statusMap?.fakturert ?? 0,
      farge: "text-orange-600",
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Topprad */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Dashboard</h1>
          <p className="text-[#64748b] text-sm mt-0.5">Oversikt over dine oppdrag og aktivitet</p>
        </div>
        <Link
          href="/portal/takstmann/oppdrag/ny"
          className="portal-btn-primary"
        >
          + Nytt oppdrag
        </Link>
      </div>

      {/* KPI-kort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiKort.map((kpi) => (
          <div key={kpi.label} className="portal-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#f0f4f8] flex items-center justify-center text-[#285982]">
                {kpi.ikon}
              </div>
            </div>
            <p className={`text-3xl font-bold ${kpi.farge}`}>{kpi.verdi}</p>
            <p className="text-[#64748b] text-sm mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Statusfordeling */}
        <div className="portal-card p-6">
          <h2 className="text-[#1e293b] font-semibold mb-4">Statusfordeling</h2>
          {stats?.statusMap && Object.keys(stats.statusMap).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.statusMap).map(([status, antall]) => (
                <div key={status} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: DONUT_COLORS[status] ?? "#94a3b8" }}
                  />
                  <span className="text-sm text-[#64748b] flex-1">
                    {OPPDRAG_STATUS_LABELS[status as OppdragStatus] ?? status}
                  </span>
                  <span className="text-sm font-semibold text-[#1e293b]">{antall}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#94a3b8] text-sm text-center py-4">Ingen oppdrag ennå</p>
          )}
        </div>

        {/* Nye oppdrag */}
        <div className="portal-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#1e293b] font-semibold">Nyeste oppdrag</h2>
            <Link href="/portal/takstmann/oppdrag" className="text-[#285982] text-sm hover:underline">
              Se alle
            </Link>
          </div>
          {stats?.nyeOppdrag && stats.nyeOppdrag.length > 0 ? (
            <div className="space-y-3">
              {stats.nyeOppdrag.map((o) => (
                <Link
                  key={o.id}
                  href={`/portal/takstmann/oppdrag/${o.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#e8f0f8] flex items-center justify-center text-[#285982] shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1e293b] truncate group-hover:text-[#285982] transition-colors">
                      {o.tittel}
                    </p>
                    <p className="text-xs text-[#94a3b8]">
                      {o.by ? `${o.adresse}, ${o.by}` : o.adresse ?? "Ingen adresse"}
                      {" · "}
                      {OPPDRAG_TYPE_LABELS[o.oppdrag_type as keyof typeof OPPDRAG_TYPE_LABELS] ?? o.oppdrag_type}
                    </p>
                  </div>
                  <span className="portal-badge portal-badge-blue">Ny</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#94a3b8] text-sm mb-3">Ingen nye oppdrag</p>
              <Link href="/portal/takstmann/oppdrag/ny" className="portal-btn-primary text-sm">
                Opprett oppdrag
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Kommende frister */}
      {stats?.kommendeFrister && stats.kommendeFrister.length > 0 && (
        <div className="portal-card p-6">
          <h2 className="text-[#1e293b] font-semibold mb-4">Kommende frister</h2>
          <div className="divide-y divide-[#f1f5f9]">
            {stats.kommendeFrister.map((o) => {
              const fristDato = o.frist ? new Date(o.frist) : null;
              const dagerIgjen = fristDato
                ? Math.ceil((fristDato.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div key={o.id} className="flex items-center gap-4 py-3">
                  <Link
                    href={`/portal/takstmann/oppdrag/${o.id}`}
                    className="flex-1 min-w-0 hover:text-[#285982] transition-colors"
                  >
                    <p className="text-sm font-medium text-[#1e293b] truncate">{o.tittel}</p>
                  </Link>
                  <span className={`portal-badge ${STATUS_BADGE_CLASSES[o.status as OppdragStatus] ?? "portal-badge-gray"}`}>
                    {OPPDRAG_STATUS_LABELS[o.status as OppdragStatus] ?? o.status}
                  </span>
                  {fristDato && (
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        dagerIgjen !== null && dagerIgjen < 0
                          ? "text-red-500"
                          : dagerIgjen !== null && dagerIgjen <= 3
                          ? "text-amber-500"
                          : "text-[#64748b]"
                      }`}
                    >
                      {dagerIgjen !== null && dagerIgjen < 0
                        ? `${Math.abs(dagerIgjen)} dager over frist`
                        : dagerIgjen === 0
                        ? "Frist i dag"
                        : `${dagerIgjen} dager igjen`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

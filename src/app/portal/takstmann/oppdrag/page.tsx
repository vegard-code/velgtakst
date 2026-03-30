import Link from "next/link";
import { hentOppdragListe } from "@/lib/actions/oppdrag";
import {
  OPPDRAG_STATUS_LABELS,
  OPPDRAG_TYPE_LABELS,
} from "@/lib/supabase/types";
import type { OppdragStatus, OppdragType } from "@/lib/supabase/types";

const STATUS_BADGE: Record<OppdragStatus, string> = {
  ny: "portal-badge portal-badge-blue",
  akseptert: "portal-badge portal-badge-green",
  under_befaring: "portal-badge portal-badge-yellow",
  rapport_under_arbeid: "portal-badge portal-badge-purple",
  rapport_levert: "portal-badge portal-badge-green",
  fakturert: "portal-badge portal-badge-yellow",
  betalt: "portal-badge portal-badge-green",
  kansellert: "portal-badge portal-badge-gray",
};

interface Props {
  searchParams: Promise<{
    status?: string;
    type?: string;
    sok?: string;
  }>;
}

export default async function OppdragListePage({ searchParams }: Props) {
  const { status, type, sok } = await searchParams;

  const oppdrag = await hentOppdragListe({
    status: status as OppdragStatus | undefined,
    type: type as OppdragType | undefined,
    sok,
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Oppdrag</h1>
          <p className="text-[#64748b] text-sm mt-0.5">{oppdrag.length} oppdrag</p>
        </div>
        <Link href="/portal/takstmann/oppdrag/ny" className="portal-btn-primary">
          + Nytt oppdrag
        </Link>
      </div>

      {/* Filtre */}
      <div className="portal-card p-4 mb-6">
        <form className="flex flex-col sm:flex-row gap-3">
          <input
            name="sok"
            defaultValue={sok}
            placeholder="Søk på tittel, adresse..."
            className="portal-input flex-1"
          />
          <select name="status" defaultValue={status ?? ""} className="portal-input sm:w-48">
            <option value="">Alle statuser</option>
            {Object.entries(OPPDRAG_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select name="type" defaultValue={type ?? ""} className="portal-input sm:w-48">
            <option value="">Alle typer</option>
            {Object.entries(OPPDRAG_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="portal-btn-primary shrink-0">
            Filtrer
          </button>
        </form>
      </div>

      {/* Liste */}
      {oppdrag.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <p className="text-[#94a3b8] mb-4">Ingen oppdrag funnet</p>
          <Link href="/portal/takstmann/oppdrag/ny" className="portal-btn-primary">
            Opprett første oppdrag
          </Link>
        </div>
      ) : (
        <div className="portal-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Oppdrag
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider hidden md:table-cell">
                  Frist
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {oppdrag.map((o) => (
                <tr key={o.id} className="hover:bg-[#f8fafc] transition-colors group">
                  <td className="px-4 py-4">
                    <Link
                      href={`/portal/takstmann/oppdrag/${o.id}`}
                      className="block"
                    >
                      <p className="text-sm font-medium text-[#1e293b] group-hover:text-[#285982] transition-colors">
                        {o.tittel}
                      </p>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        {o.by ? `${o.adresse ?? ""}, ${o.by}` : o.adresse ?? "Ingen adresse"}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className="text-sm text-[#64748b]">
                      {OPPDRAG_TYPE_LABELS[o.oppdrag_type as OppdragType] ?? o.oppdrag_type}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {o.frist ? (
                      <span className="text-sm text-[#64748b]">
                        {new Date(o.frist).toLocaleDateString("nb-NO")}
                      </span>
                    ) : (
                      <span className="text-[#94a3b8] text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={STATUS_BADGE[o.status as OppdragStatus] ?? "portal-badge portal-badge-gray"}>
                      {OPPDRAG_STATUS_LABELS[o.status as OppdragStatus] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/portal/takstmann/oppdrag/${o.id}`}
                      className="text-[#285982] text-sm hover:underline"
                    >
                      Åpne &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
